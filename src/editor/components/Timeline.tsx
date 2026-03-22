import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { ShapeContent, TextContent, WidgetContent, Keyframe, CameraKeyframe, getAnimations } from '../../types/project';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCamera } from '@fortawesome/free-solid-svg-icons';
import { TL_BORDER, TL_BG, TL_BG_MUTED, TL_TEXT_SECONDARY, TL_TEXT_MUTED, TL_TEXT_DISABLED, TL_ACCENT } from './TimelineConstants';
import { TimelineLayerPanel } from './TimelineLayerPanel';
import { TimelineTrackArea } from './TimelineTrackArea';
import { TimelineContextMenus, KfContextMenuState, CamKfContextMenuState, LayerContextMenuState } from './TimelineContextMenus';

export const Timeline: React.FC = () => {
  const project = useProjectStore((state) => state.project);
  const selectedElementIds = useProjectStore((state) => state.selectedElementIds);
  const selectElement = useProjectStore((state) => state.selectElement);
  const selectElements = useProjectStore((state) => state.selectElements);
  const addToSelection = useProjectStore((state) => state.addToSelection);
  const toggleElementVisibility = useProjectStore((state) => state.toggleElementVisibility);
  const toggleElementLock = useProjectStore((state) => state.toggleElementLock);
  const renameElement = useProjectStore((state) => state.renameElement);
  const reorderElements = useProjectStore((state) => state.reorderElements);
  const playAllAnimations = useProjectStore((state) => state.playAllAnimations);
  const pauseAllAnimations = useProjectStore((state) => state.pauseAllAnimations);
  const stopAllAnimations = useProjectStore((state) => state.stopAllAnimations);
  const playbackState = useProjectStore((state) => state.playbackState);
  const currentTime = useProjectStore((state) => state.currentTime);
  const setCurrentTime = useProjectStore((state) => state.setCurrentTime);
  const updateElementSilent = useProjectStore((state) => state.updateElementSilent);
  const pushSnapshot = useProjectStore((state) => state.pushSnapshot);
  const addKeyframe = useProjectStore((state) => state.addKeyframe);
  const removeKeyframe = useProjectStore((state) => state.removeKeyframe);
  const addCameraKeyframe = useProjectStore((state) => state.addCameraKeyframe);
  const removeCameraKeyframe = useProjectStore((state) => state.removeCameraKeyframe);

  // Context menu states
  const [kfContextMenu, setKfContextMenu] = useState<KfContextMenuState | null>(null);
  const kfMenuRef = useRef<HTMLDivElement>(null);
  const [layerContextMenu, setLayerContextMenu] = useState<LayerContextMenuState | null>(null);
  const layerMenuRef = useRef<HTMLDivElement>(null);
  const [camKfContextMenu, setCamKfContextMenu] = useState<CamKfContextMenuState | null>(null);
  const camKfMenuRef = useRef<HTMLDivElement>(null);

  // Inline rename state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Drag-to-reorder state
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragSourceIndex = useRef<number | null>(null);

  // Scrubbing
  const isScrubbing = useRef(false);
  const tracksRef = useRef<HTMLDivElement>(null);

  // Bar drag/resize state
  const barDragRef = useRef<{
    type: 'move' | 'resize-left' | 'resize-right';
    elementId: string;
    animIndex: number;
    startMouseX: number;
    startDelay: number;
    startDuration: number;
    snapshot: typeof project;
  } | null>(null);
  const [barDragActive, setBarDragActive] = useState(false);

  // Multi-keyframe selection
  const [selectedKeyframes, setSelectedKeyframes] = useState<Set<string>>(new Set());

  // Keyframe diamond drag state
  const kfDragRef = useRef<{
    startMouseX: number;
    items: { elementId: string; startTime: number }[];
    snapshot: typeof project;
  } | null>(null);
  const [kfDragActive, setKfDragActive] = useState(false);

  // Camera keyframe diamond drag state
  const camKfDragRef = useRef<{
    startMouseX: number;
    startTime: number;
    originalTime: number;
    isAltDuplicate: boolean;
    snapshot: typeof project;
  } | null>(null);
  const [camKfDragActive, setCamKfDragActive] = useState(false);

  // Reverse order: highest layer first
  const elements = useMemo(() => [...project.elements].reverse(), [project.elements]);

  // Timeline calculations (memoized)
  const { maxTime, animatedElements } = useMemo(() => {
    const animated = project.elements.filter((el) => getAnimations(el).length > 0);
    const maxKeyframeTime = project.elements.reduce((max, el) => {
      if (!el.keyframes || el.keyframes.length === 0) return max;
      return Math.max(max, ...el.keyframes.map((kf) => kf.time));
    }, 0);
    const maxCameraKeyframeTime = (project.cameraKeyframes || []).reduce(
      (max, kf) => Math.max(max, kf.time), 0
    );
    const contentMaxTime = Math.max(
      maxKeyframeTime + 500,
      maxCameraKeyframeTime + 500,
      ...project.elements.map((el) => {
        const anims = getAnimations(el);
        let t = anims.reduce((m, a) => Math.max(m, (a.delay || 0) + (a.duration || 600)), 0);
        if (el.content.type === 'widget') {
          const wc = el.content as WidgetContent;
          const wDur = (wc.durationInFrames / wc.fps) * 1000;
          const firstDelay = anims.length > 0 ? Math.min(...anims.map(a => a.delay || 0)) : 0;
          t = Math.max(t, firstDelay + wDur);
        }
        return t;
      })
    );
    return { maxTime: Math.max(10000, contentMaxTime), animatedElements: animated };
  }, [project.elements, project.cameraKeyframes]);

  // Measure tracks container width
  const [tracksWidth, setTracksWidth] = useState(600);
  useEffect(() => {
    if (!tracksRef.current) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) setTracksWidth(entry.contentRect.width);
    });
    obs.observe(tracksRef.current);
    return () => obs.disconnect();
  }, []);

  // Timeline zoom
  const [timelineZoom, setTimelineZoom] = useState(1.0);
  const basePxPerMs = tracksWidth / maxTime;
  const pxPerMs = Math.max(0.02, basePxPerMs * timelineZoom);
  const timelineWidth = Math.max(tracksWidth, maxTime * pxPerMs);

  // Time markers (memoized)
  const markers = useMemo(() => {
    const msPerPx = 1 / pxPerMs;
    const rawInterval = msPerPx * 80;
    const niceIntervals = [100, 200, 500, 1000, 2000, 5000, 10000, 20000, 30000, 60000];
    const markerInterval = niceIntervals.find((n) => n >= rawInterval) || 60000;
    const result: number[] = [];
    for (let t = 0; t <= maxTime; t += markerInterval) result.push(t);
    return result;
  }, [pxPerMs, maxTime]);

  // Wheel handler for timeline zoom
  const handleTimelineWheel = useCallback((e: React.WheelEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      const container = tracksRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left + container.scrollLeft;
      const timeBefore = mouseX / pxPerMs;
      const factor = -e.deltaY * 0.003;
      const newZoom = Math.max(0.2, Math.min(30, timelineZoom * (1 + factor)));
      const newPxPerMs = Math.max(0.02, basePxPerMs * newZoom);
      const scrollOffset = timeBefore * newPxPerMs - (e.clientX - rect.left);
      setTimelineZoom(newZoom);
      requestAnimationFrame(() => { container.scrollLeft = Math.max(0, scrollOffset); });
    }
  }, [pxPerMs, basePxPerMs, timelineZoom]);

  const handleStartRename = useCallback((id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
    setTimeout(() => inputRef.current?.select(), 0);
  }, []);

  const handleFinishRename = useCallback(() => {
    if (editingId && editName.trim()) renameElement(editingId, editName.trim());
    setEditingId(null);
  }, [editingId, editName, renameElement]);

  const handleCancelRename = useCallback(() => setEditingId(null), []);

  const handleRowClick = useCallback((id: string, e: React.MouseEvent) => {
    if (e.shiftKey) addToSelection(id);
    else selectElement(id);
  }, [selectElement, addToSelection]);

  const handleTrackClick = useCallback((id: string, e: React.MouseEvent) => {
    handleRowClick(id, e);
    if (tracksRef.current) {
      const rect = tracksRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left + tracksRef.current.scrollLeft;
      setCurrentTime(Math.max(0, Math.round((x / pxPerMs) / 50) * 50));
    }
  }, [handleRowClick, pxPerMs, setCurrentTime]);

  const handleDragStart = useCallback((reversedIndex: number) => { dragSourceIndex.current = reversedIndex; }, []);
  const handleDragOver = useCallback((e: React.DragEvent, reversedIndex: number) => { e.preventDefault(); setDragOverIndex(reversedIndex); }, []);
  const handleDrop = useCallback((reversedIndex: number) => {
    if (dragSourceIndex.current !== null && dragSourceIndex.current !== reversedIndex) {
      reorderElements(elements.length - 1 - dragSourceIndex.current, elements.length - 1 - reversedIndex);
    }
    dragSourceIndex.current = null;
    setDragOverIndex(null);
  }, [elements.length, reorderElements]);
  const handleDragEnd = useCallback(() => { dragSourceIndex.current = null; setDragOverIndex(null); }, []);

  const handleLayerContextMenu = useCallback((id: string, e: React.MouseEvent) => {
    selectElement(id);
    setLayerContextMenu({ x: e.clientX, y: e.clientY, elementId: id });
  }, [selectElement]);

  // Scrubbing
  const handleScrubStart = useCallback((e: React.MouseEvent) => {
    if (!tracksRef.current) return;
    if (!e.shiftKey && !e.ctrlKey && !e.metaKey) setSelectedKeyframes(new Set());
    isScrubbing.current = true;
    const rect = tracksRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + tracksRef.current.scrollLeft;
    setCurrentTime(Math.max(0, x / pxPerMs));
    const handleScrubMove = (moveEvent: MouseEvent) => {
      if (!isScrubbing.current || !tracksRef.current) return;
      const r = tracksRef.current.getBoundingClientRect();
      const mx = moveEvent.clientX - r.left + tracksRef.current.scrollLeft;
      setCurrentTime(Math.max(0, Math.min(maxTime, mx / pxPerMs)));
    };
    const handleScrubEnd = () => {
      isScrubbing.current = false;
      window.removeEventListener('mousemove', handleScrubMove);
      window.removeEventListener('mouseup', handleScrubEnd);
    };
    window.addEventListener('mousemove', handleScrubMove);
    window.addEventListener('mouseup', handleScrubEnd);
  }, [pxPerMs, maxTime, setCurrentTime]);

  // Bar drag/resize
  const handleBarMouseDown = useCallback((
    e: React.MouseEvent, elementId: string, type: 'move' | 'resize-left' | 'resize-right',
    delay: number, duration: number, animIndex: number = 0,
  ) => {
    e.stopPropagation();
    e.preventDefault();
    barDragRef.current = { type, elementId, animIndex, startMouseX: e.clientX, startDelay: delay, startDuration: duration, snapshot: structuredClone(project) };
    setBarDragActive(true);
    if (!selectedElementIds.includes(elementId)) selectElement(elementId);
  }, [project, selectElement, selectedElementIds]);

  useEffect(() => {
    if (!barDragActive) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!barDragRef.current) return;
      const { type, elementId, animIndex, startMouseX, startDelay, startDuration } = barDragRef.current;
      const dxMs = (e.clientX - startMouseX) / pxPerMs;
      const state = useProjectStore.getState();
      const el = state.project.elements.find((el) => el.id === elementId);
      if (!el) return;
      const anims = [...(el.animations || [])];
      const anim = anims[animIndex] || { preset: 'none' as const, delay: startDelay, duration: startDuration, easing: 'easeOut' as const };
      let newDelay = startDelay, newDuration = startDuration;
      if (type === 'move') newDelay = Math.max(0, Math.round(startDelay + dxMs));
      else if (type === 'resize-left') { const shift = Math.round(dxMs); newDelay = Math.max(0, startDelay + shift); newDuration = Math.max(100, startDuration - (newDelay - startDelay)); }
      else if (type === 'resize-right') newDuration = Math.max(100, Math.round(startDuration + dxMs));
      newDelay = Math.round(newDelay / 50) * 50;
      newDuration = Math.max(100, Math.round(newDuration / 50) * 50);
      if (el.type === 'widget') {
        const wc = el.content as WidgetContent;
        if (type === 'move') {
          // Moving widget bar: only update delay of all animations, keep their durations
          if (anims.length === 0) {
            // No animations yet — create a placeholder so delay can be tracked
            updateElementSilent(elementId, { animations: [{ ...anim, delay: newDelay }] });
          } else {
            const updatedAnims = anims.map((a, i) => {
              const origDelay = (barDragRef.current?.snapshot.elements.find(e => e.id === elementId)?.animations || [])[i]?.delay || 0;
              return { ...a, delay: Math.max(0, Math.round((origDelay + (newDelay - startDelay)) / 50) * 50) };
            });
            updateElementSilent(elementId, { animations: updatedAnims });
          }
        } else {
          // Resizing widget bar: adjust widget frame count
          const newFrames = Math.max(1, Math.round((newDuration / 1000) * wc.fps));
          if (type === 'resize-left') {
            anims[animIndex] = { ...anim, delay: newDelay, duration: newDuration };
            updateElementSilent(elementId, { content: { ...wc, durationInFrames: newFrames }, animations: anims });
          } else {
            updateElementSilent(elementId, { content: { ...wc, durationInFrames: newFrames } });
          }
        }
      } else {
        anims[animIndex] = { ...anim, delay: newDelay, duration: newDuration };
        updateElementSilent(elementId, { animations: anims });
      }
      if (type === 'move' && state.selectedElementIds.length > 1) {
        const delayDelta = newDelay - startDelay;
        const snap = barDragRef.current.snapshot;
        for (const selId of state.selectedElementIds) {
          if (selId === elementId) continue;
          const snapEl = snap.elements.find((e) => e.id === selId);
          if (!snapEl?.animations?.length) continue;
          updateElementSilent(selId, { animations: snapEl.animations.map((a) => ({ ...a, delay: Math.max(0, Math.round(((a.delay || 0) + delayDelta) / 50) * 50) })) });
        }
      }
    };
    const handleMouseUp = () => {
      if (barDragRef.current) pushSnapshot(barDragRef.current.snapshot);
      barDragRef.current = null;
      setBarDragActive(false);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [barDragActive, pxPerMs, updateElementSilent, pushSnapshot]);

  const kfKey = (elementId: string, time: number) => `${elementId}:${time}`;

  // Keyframe diamond drag
  const handleKfMouseDown = useCallback((e: React.MouseEvent, elementId: string, time: number) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const key = kfKey(elementId, time);
    let effectiveSelection: Set<string>;
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      effectiveSelection = new Set(selectedKeyframes);
      if (effectiveSelection.has(key)) effectiveSelection.delete(key); else effectiveSelection.add(key);
      setSelectedKeyframes(effectiveSelection);
    } else if (selectedKeyframes.has(key)) effectiveSelection = selectedKeyframes;
    else { effectiveSelection = new Set([key]); setSelectedKeyframes(effectiveSelection); }
    const items = Array.from(effectiveSelection).map((k) => { const [elId, t] = k.split(':'); return { elementId: elId, startTime: parseInt(t) }; });
    setCurrentTime(time);
    const selectedElIds = [...new Set(Array.from(effectiveSelection).map((k) => k.split(':')[0]))];
    if (selectedElIds.length === 1) selectElement(selectedElIds[0]);
    else if (selectedElIds.length > 1) selectElements(selectedElIds);
    kfDragRef.current = { startMouseX: e.clientX, items, snapshot: structuredClone(project) };
    setKfDragActive(true);
  }, [project, selectedKeyframes, setCurrentTime, selectElement, selectElements]);

  useEffect(() => {
    if (!kfDragActive) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!kfDragRef.current) return;
      const { startMouseX, items } = kfDragRef.current;
      const snappedDx = Math.round(Math.round((e.clientX - startMouseX) / pxPerMs) / 50) * 50;
      if (snappedDx === 0) return;
      if (!items.every((item) => item.startTime + snappedDx >= 0)) return;
      const byElement = new Map<string, { startTime: number }[]>();
      for (const item of items) { if (!byElement.has(item.elementId)) byElement.set(item.elementId, []); byElement.get(item.elementId)!.push(item); }
      const state = useProjectStore.getState();
      for (const [elId, elItems] of byElement) {
        const el = state.project.elements.find((e) => e.id === elId);
        if (!el?.keyframes) continue;
        const movingTimes = new Set(elItems.map((i) => i.startTime));
        updateElementSilent(elId, { keyframes: el.keyframes.map((kf) => movingTimes.has(kf.time) ? { ...kf, time: kf.time + snappedDx } : kf).sort((a, b) => a.time - b.time) });
      }
      for (const item of items) item.startTime += snappedDx;
      kfDragRef.current.startMouseX = e.clientX;
      setSelectedKeyframes(new Set(items.map((i) => kfKey(i.elementId, i.startTime))));
    };
    const handleMouseUp = () => { if (kfDragRef.current) pushSnapshot(kfDragRef.current.snapshot); kfDragRef.current = null; setKfDragActive(false); };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [kfDragActive, pxPerMs, updateElementSilent, pushSnapshot]);

  // Camera keyframe drag
  const handleCamKfMouseDown = useCallback((e: React.MouseEvent, time: number) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const snapshot = structuredClone(project);
    if (e.altKey) {
      const cameraKfs = useProjectStore.getState().project.cameraKeyframes || [];
      const original = cameraKfs.find((k) => k.time === time);
      if (!original) return;
      const dupeTime = time + 50;
      useProjectStore.setState((state) => ({ project: { ...state.project, cameraKeyframes: [...cameraKfs, { ...original, time: dupeTime }].sort((a, b) => a.time - b.time) } }));
      camKfDragRef.current = { startMouseX: e.clientX, startTime: dupeTime, originalTime: time, isAltDuplicate: true, snapshot };
    } else {
      camKfDragRef.current = { startMouseX: e.clientX, startTime: time, originalTime: time, isAltDuplicate: false, snapshot };
    }
    setCamKfDragActive(true);
  }, [project]);

  useEffect(() => {
    if (!camKfDragActive) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!camKfDragRef.current) return;
      const { startMouseX, startTime } = camKfDragRef.current;
      let newTime = Math.max(0, Math.round(startTime + (e.clientX - startMouseX) / pxPerMs));
      newTime = Math.round(newTime / 50) * 50;
      const cameraKfs = useProjectStore.getState().project.cameraKeyframes || [];
      const kf = cameraKfs.find((k) => k.time === startTime) || cameraKfs.find((k) => Math.abs(k.time - startTime) < 50);
      if (!kf) return;
      useProjectStore.setState((state) => ({ project: { ...state.project, cameraKeyframes: [...cameraKfs.filter((k) => k.time !== kf.time), { ...kf, time: newTime }].sort((a, b) => a.time - b.time) } }));
      camKfDragRef.current.startTime = newTime;
      camKfDragRef.current.startMouseX = e.clientX;
    };
    const handleMouseUp = () => { if (camKfDragRef.current) pushSnapshot(camKfDragRef.current.snapshot); camKfDragRef.current = null; setCamKfDragActive(false); };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [camKfDragActive, pxPerMs, pushSnapshot]);

  // Close all context menus on click-outside or Escape (consolidated)
  useEffect(() => {
    if (!camKfContextMenu && !kfContextMenu && !layerContextMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (camKfContextMenu && camKfMenuRef.current && !camKfMenuRef.current.contains(e.target as Node)) setCamKfContextMenu(null);
      if (kfContextMenu && kfMenuRef.current && !kfMenuRef.current.contains(e.target as Node)) setKfContextMenu(null);
      if (layerContextMenu && layerMenuRef.current && !layerMenuRef.current.contains(e.target as Node)) setLayerContextMenu(null);
    };
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') { setCamKfContextMenu(null); setKfContextMenu(null); setLayerContextMenu(null); } };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => { document.removeEventListener('mousedown', handleClickOutside); document.removeEventListener('keydown', handleEscape); };
  }, [camKfContextMenu, kfContextMenu, layerContextMenu]);

  const handleAddKeyframe = useCallback(() => {
    if (selectedElementIds.length === 0) return;
    const snappedTime = Math.round(currentTime / 50) * 50;
    for (const selId of selectedElementIds) {
      const el = project.elements.find((e) => e.id === selId);
      if (!el) continue;
      const kf: Keyframe = { time: snappedTime, x: el.position.x, y: el.position.y, width: el.size.width, height: el.size.height, rotation: el.rotation };
      if (el.type === 'shape') { const c = el.content as ShapeContent; kf.fill = c.fill; kf.stroke = c.stroke; kf.strokeWidth = c.strokeWidth; kf.borderRadius = c.borderRadius; }
      else if (el.type === 'text') { const c = el.content as TextContent; kf.color = c.color; kf.fontSize = c.fontSize; }
      addKeyframe(el.id, kf);
    }
  }, [selectedElementIds, project.elements, currentTime, addKeyframe]);

  const handleAddCameraKeyframe = useCallback(() => {
    const snappedTime = Math.round(currentTime / 50) * 50;
    addCameraKeyframe({ time: snappedTime, x: project.canvas.width / 2, y: project.canvas.height / 2, zoom: 1.0 });
  }, [currentTime, project.canvas.width, project.canvas.height, addCameraKeyframe]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    return `${String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:${String(totalSeconds % 60).padStart(2, '0')}.${String(Math.floor((ms % 1000) / 10)).padStart(2, '0')}`;
  };

  const getElementDisplayName = useCallback((el: typeof elements[0]) => {
    if (el.name) return el.name;
    if (el.type === 'text' && el.content.type === 'text') return el.content.text;
    return el.type;
  }, []);

  const handleKfContextMenu = useCallback((elementId: string, time: number, e: React.MouseEvent) => {
    setKfContextMenu({ x: e.clientX, y: e.clientY, elementId, time });
  }, []);

  const handleCamKfContextMenu = useCallback((time: number, e: React.MouseEvent) => {
    setCamKfContextMenu({ x: e.clientX, y: e.clientY, time });
  }, []);

  return (
    <div style={{ height: '100%', backgroundColor: TL_BG, borderTop: `1px solid ${TL_BORDER}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Timeline Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 16px', borderBottom: `1px solid ${TL_BORDER}`, minHeight: 32, backgroundColor: TL_BG_MUTED }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: TL_TEXT_SECONDARY, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ebenen & Timeline</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: TL_TEXT_MUTED }}>{project.elements.length} elements | {animatedElements.length} animated</span>
          <span style={{ fontSize: 11, fontFamily: 'monospace', color: TL_TEXT_SECONDARY, minWidth: 70, textAlign: 'right' }}>{formatTime(currentTime)}</span>
          <button onClick={handleAddKeyframe} disabled={selectedElementIds.length === 0} title="Keyframe an aktueller Position hinzufügen"
            style={{ padding: '4px 10px', backgroundColor: selectedElementIds.length > 0 ? 'var(--ae-notice)' : 'transparent', color: selectedElementIds.length > 0 ? 'var(--ae-gray-900)' : TL_TEXT_DISABLED, border: `1px solid ${TL_BORDER}`, borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: selectedElementIds.length > 0 ? 'pointer' : 'not-allowed' }}>
            ◆ Keyframe bei {formatTime(currentTime)}
          </button>
          <button onClick={handleAddCameraKeyframe} title="Kamera-Keyframe an aktueller Position hinzufügen"
            style={{ padding: '4px 10px', backgroundColor: '#00bcd4', color: '#000', border: `1px solid ${TL_BORDER}`, borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
            <FontAwesomeIcon icon={faCamera} style={{ marginRight: 4 }} />Kamera-KF
          </button>
          <button onClick={playbackState === 'playing' ? pauseAllAnimations : playAllAnimations}
            style={{ padding: '4px 12px', backgroundColor: playbackState === 'playing' ? 'var(--ae-notice)' : playbackState === 'paused' ? 'var(--ae-positive)' : 'transparent', color: playbackState !== 'stopped' ? 'var(--ae-gray-900)' : TL_TEXT_MUTED, border: `1px solid ${TL_BORDER}`, borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
            {playbackState === 'playing' ? '⏸ Pause' : playbackState === 'paused' ? '▶ Weiter' : '▶ Play'}
          </button>
          {playbackState !== 'stopped' && (
            <button onClick={stopAllAnimations} style={{ padding: '4px 12px', backgroundColor: 'var(--ae-danger)', color: 'var(--ae-gray-900)', border: `1px solid ${TL_BORDER}`, borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>⏹ Stop</button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 8 }}>
            <button onClick={() => { const c = tracksRef.current; if (!c) { setTimelineZoom(z => Math.max(0.2, z / 1.4)); return; } const ct = (c.scrollLeft + c.clientWidth / 2) / pxPerMs; const nz = Math.max(0.2, timelineZoom / 1.4); setTimelineZoom(nz); requestAnimationFrame(() => { c.scrollLeft = ct * Math.max(0.02, basePxPerMs * nz) - c.clientWidth / 2; }); }}
              style={{ padding: '2px 6px', backgroundColor: 'transparent', color: TL_TEXT_SECONDARY, border: `1px solid ${TL_BORDER}`, borderRadius: 3, fontSize: 13, cursor: 'pointer', lineHeight: 1 }}>-</button>
            <span onClick={() => setTimelineZoom(1.0)} style={{ fontSize: 10, color: TL_TEXT_MUTED, minWidth: 36, textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>{Math.round(timelineZoom * 100)}%</span>
            <button onClick={() => { const c = tracksRef.current; if (!c) { setTimelineZoom(z => Math.min(30, z * 1.4)); return; } const ct = (c.scrollLeft + c.clientWidth / 2) / pxPerMs; const nz = Math.min(30, timelineZoom * 1.4); setTimelineZoom(nz); requestAnimationFrame(() => { c.scrollLeft = ct * Math.max(0.02, basePxPerMs * nz) - c.clientWidth / 2; }); }}
              style={{ padding: '2px 6px', backgroundColor: 'transparent', color: TL_TEXT_SECONDARY, border: `1px solid ${TL_BORDER}`, borderRadius: 3, fontSize: 13, cursor: 'pointer', lineHeight: 1 }}>+</button>
          </div>
        </div>
      </div>

      {/* Timeline Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <TimelineLayerPanel
          elements={elements} selectedElementIds={selectedElementIds} cameraKeyframes={project.cameraKeyframes}
          editingId={editingId} editName={editName} dragOverIndex={dragOverIndex} inputRef={inputRef}
          getElementDisplayName={getElementDisplayName} onRowClick={handleRowClick} onContextMenu={handleLayerContextMenu}
          onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop} onDragEnd={handleDragEnd}
          onToggleVisibility={toggleElementVisibility} onToggleLock={toggleElementLock}
          onStartRename={handleStartRename} onFinishRename={handleFinishRename} onCancelRename={handleCancelRename} onEditNameChange={setEditName}
        />
        <TimelineTrackArea
          tracksRef={tracksRef} elements={elements} selectedElementIds={selectedElementIds} cameraKeyframes={project.cameraKeyframes}
          currentTime={currentTime} pxPerMs={pxPerMs} timelineWidth={timelineWidth} markers={markers} selectedKeyframes={selectedKeyframes}
          onWheel={handleTimelineWheel} onScrubStart={handleScrubStart} onTrackClick={handleTrackClick}
          onBarMouseDown={handleBarMouseDown} onKfMouseDown={handleKfMouseDown} onKfContextMenu={handleKfContextMenu}
          onCamKfMouseDown={handleCamKfMouseDown} onCamKfContextMenu={handleCamKfContextMenu}
        />
      </div>

      <TimelineContextMenus
        kfContextMenu={kfContextMenu} camKfContextMenu={camKfContextMenu} layerContextMenu={layerContextMenu}
        kfMenuRef={kfMenuRef} camKfMenuRef={camKfMenuRef} layerMenuRef={layerMenuRef} projectElements={project.elements}
        onSetKfContextMenu={setKfContextMenu} onSetCamKfContextMenu={setCamKfContextMenu} onSetLayerContextMenu={setLayerContextMenu}
        addKeyframe={addKeyframe} removeKeyframe={removeKeyframe} addCameraKeyframe={addCameraKeyframe} removeCameraKeyframe={removeCameraKeyframe}
        reorderElements={reorderElements} selectElements={selectElements} setCurrentTime={setCurrentTime} setSelectedKeyframes={setSelectedKeyframes}
      />
    </div>
  );
};
