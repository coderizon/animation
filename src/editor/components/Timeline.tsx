import { useState, useRef, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useProjectStore } from '../../store/useProjectStore';
import { ShapeContent, TextContent, WidgetContent, Keyframe, CameraKeyframe, getAnimations } from '../../types/project';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCamera, faVideo } from '@fortawesome/free-solid-svg-icons';

const TL_BORDER = 'var(--ae-border)';
const TL_ROW_BORDER = 'rgba(255, 255, 255, 0.05)';
const TL_BG = 'var(--ae-bg-panel)';
const TL_BG_MUTED = 'var(--ae-bg-panel-muted)';
const TL_BG_RAISED = 'var(--ae-bg-panel-raised)';
const TL_TEXT = 'var(--ae-text-primary)';
const TL_TEXT_SECONDARY = 'var(--ae-text-secondary)';
const TL_TEXT_MUTED = 'var(--ae-text-muted)';
const TL_TEXT_DISABLED = 'var(--ae-text-disabled)';
const TL_ACCENT = 'var(--ae-accent)';
const TL_ACCENT_STRONG = 'var(--ae-accent-strong)';

export const Timeline: React.FC = () => {
  const project = useProjectStore((state) => state.project);
  const selectedElementIds = useProjectStore((state) => state.selectedElementIds);
  const selectElement = useProjectStore((state) => state.selectElement);
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

  // Keyframe context menu state
  const [kfContextMenu, setKfContextMenu] = useState<{
    x: number; y: number; elementId: string; time: number;
  } | null>(null);
  const kfMenuRef = useRef<HTMLDivElement>(null);

  // Layer context menu state
  const [layerContextMenu, setLayerContextMenu] = useState<{
    x: number; y: number; elementId: string;
  } | null>(null);
  const layerMenuRef = useRef<HTMLDivElement>(null);

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

  // Multi-keyframe selection: Set of "elementId:time" keys
  const [selectedKeyframes, setSelectedKeyframes] = useState<Set<string>>(new Set());

  // Keyframe diamond drag state (supports multi-select)
  const kfDragRef = useRef<{
    startMouseX: number;
    // For each selected keyframe: original elementId + time at drag start
    items: { elementId: string; startTime: number }[];
    snapshot: typeof project;
  } | null>(null);
  const [kfDragActive, setKfDragActive] = useState(false);

  // Camera keyframe context menu state
  const [camKfContextMenu, setCamKfContextMenu] = useState<{
    x: number; y: number; time: number;
  } | null>(null);
  const camKfMenuRef = useRef<HTMLDivElement>(null);

  // Camera keyframe diamond drag state
  const camKfDragRef = useRef<{
    startMouseX: number;
    startTime: number;
    originalTime: number; // preserved for Alt+Drag duplicate
    isAltDuplicate: boolean;
    snapshot: typeof project;
  } | null>(null);
  const [camKfDragActive, setCamKfDragActive] = useState(false);

  // Reverse order: highest layer first
  const elements = [...project.elements].reverse();

  // Timeline calculations
  const animatedElements = project.elements.filter((el) => getAnimations(el).length > 0);
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
  const maxTime = Math.max(10000, contentMaxTime);

  // Measure tracks container width for dynamic scaling
  const [tracksWidth, setTracksWidth] = useState(600);
  useEffect(() => {
    if (!tracksRef.current) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setTracksWidth(entry.contentRect.width);
      }
    });
    obs.observe(tracksRef.current);
    return () => obs.disconnect();
  }, []);

  // Timeline zoom: user-controlled horizontal scale
  const [timelineZoom, setTimelineZoom] = useState(1.0);

  const basePxPerMs = tracksWidth / maxTime;
  const pxPerMs = Math.max(0.02, basePxPerMs * timelineZoom);
  const timelineWidth = Math.max(tracksWidth, maxTime * pxPerMs);

  // Wheel handler for timeline zoom — Alt+Scroll (like Premiere/AE), also Ctrl+Scroll
  // Zooms toward the cursor position so the time under the cursor stays in place.
  const handleTimelineWheel = useCallback((e: React.WheelEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey) {
      e.preventDefault();
      e.stopPropagation();

      const container = tracksRef.current;
      if (!container) return;

      // Mouse position relative to the scrollable tracks container
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left + container.scrollLeft;
      // Time at cursor before zoom
      const timeBefore = mouseX / pxPerMs;

      const factor = -e.deltaY * 0.003;
      const newZoom = Math.max(0.2, Math.min(30, timelineZoom * (1 + factor)));
      const newPxPerMs = Math.max(0.02, basePxPerMs * newZoom);

      // Pixel position of that same time after zoom
      const mouseXAfter = timeBefore * newPxPerMs;
      // Adjust scroll so the time stays under the cursor
      const scrollOffset = mouseXAfter - (e.clientX - rect.left);

      setTimelineZoom(newZoom);
      // Apply scroll in next frame after render
      requestAnimationFrame(() => {
        container.scrollLeft = Math.max(0, scrollOffset);
      });
    }
  }, [pxPerMs, basePxPerMs, timelineZoom]);

  // Time markers - adaptive intervals based on visible pixel density
  const msPerPx = 1 / pxPerMs;
  const targetMarkerSpacing = 80; // pixels between markers
  const rawInterval = msPerPx * targetMarkerSpacing;
  // Snap to nice intervals: 100, 200, 500, 1000, 2000, 5000, 10000, ...
  const niceIntervals = [100, 200, 500, 1000, 2000, 5000, 10000, 20000, 30000, 60000];
  const markerInterval = niceIntervals.find((n) => n >= rawInterval) || 60000;
  const markers: number[] = [];
  for (let t = 0; t <= maxTime; t += markerInterval) {
    markers.push(t);
  }

  const handleStartRename = useCallback((id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
    setTimeout(() => inputRef.current?.select(), 0);
  }, []);

  const handleFinishRename = useCallback(() => {
    if (editingId && editName.trim()) {
      renameElement(editingId, editName.trim());
    }
    setEditingId(null);
  }, [editingId, editName, renameElement]);

  const handleRowClick = useCallback((id: string, e: React.MouseEvent) => {
    if (e.shiftKey) {
      addToSelection(id);
    } else {
      selectElement(id);
    }
  }, [selectElement, addToSelection]);

  // Click on track area: select element + set playhead time
  const handleTrackClick = useCallback((id: string, e: React.MouseEvent) => {
    handleRowClick(id, e);
    // Set playhead based on click X position within tracks area
    if (tracksRef.current) {
      const rect = tracksRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left + tracksRef.current.scrollLeft;
      const time = Math.max(0, Math.round((x / pxPerMs) / 50) * 50); // snap to 50ms
      setCurrentTime(time);
    }
  }, [handleRowClick, pxPerMs, setCurrentTime]);

  // Drag-to-reorder handlers
  const handleDragStart = useCallback((reversedIndex: number) => {
    dragSourceIndex.current = reversedIndex;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, reversedIndex: number) => {
    e.preventDefault();
    setDragOverIndex(reversedIndex);
  }, []);

  const handleDrop = useCallback((reversedIndex: number) => {
    if (dragSourceIndex.current !== null && dragSourceIndex.current !== reversedIndex) {
      // Convert reversed indices back to real indices
      const realFrom = elements.length - 1 - dragSourceIndex.current;
      const realTo = elements.length - 1 - reversedIndex;
      reorderElements(realFrom, realTo);
    }
    dragSourceIndex.current = null;
    setDragOverIndex(null);
  }, [elements.length, reorderElements]);

  // Scrubbing handlers
  const handleScrubStart = useCallback((e: React.MouseEvent) => {
    if (!tracksRef.current) return;
    // Clear keyframe selection when clicking empty timeline area
    if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
      setSelectedKeyframes(new Set());
    }
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

  // Bar drag/resize handlers
  const handleBarMouseDown = useCallback((
    e: React.MouseEvent,
    elementId: string,
    type: 'move' | 'resize-left' | 'resize-right',
    delay: number,
    duration: number,
    animIndex: number = 0,
  ) => {
    e.stopPropagation();
    e.preventDefault();
    const snapshot = JSON.parse(JSON.stringify(project));
    barDragRef.current = {
      type,
      elementId,
      animIndex,
      startMouseX: e.clientX,
      startDelay: delay,
      startDuration: duration,
      snapshot,
    };
    setBarDragActive(true);
    // If element is already in selection, keep multi-select; otherwise select only this one
    if (!selectedElementIds.includes(elementId)) {
      selectElement(elementId);
    }
  }, [project, selectElement, selectedElementIds]);

  useEffect(() => {
    if (!barDragActive) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!barDragRef.current) return;
      const { type, elementId, animIndex, startMouseX, startDelay, startDuration } = barDragRef.current;
      const dxPx = e.clientX - startMouseX;
      const dxMs = dxPx / pxPerMs;

      const state = useProjectStore.getState();
      const el = state.project.elements.find((el) => el.id === elementId);
      if (!el) return;

      const anims = [...(el.animations || [])];
      const anim = anims[animIndex] || { preset: 'none' as const, delay: startDelay, duration: startDuration, easing: 'easeOut' as const };

      let newDelay = startDelay;
      let newDuration = startDuration;

      if (type === 'move') {
        newDelay = Math.max(0, Math.round(startDelay + dxMs));
      } else if (type === 'resize-left') {
        const shift = Math.round(dxMs);
        newDelay = Math.max(0, startDelay + shift);
        const actualShift = newDelay - startDelay;
        newDuration = Math.max(100, startDuration - actualShift);
      } else if (type === 'resize-right') {
        newDuration = Math.max(100, Math.round(startDuration + dxMs));
      }

      // Snap to 50ms grid
      newDelay = Math.round(newDelay / 50) * 50;
      newDuration = Math.max(100, Math.round(newDuration / 50) * 50);

      anims[animIndex] = { ...anim, delay: newDelay, duration: newDuration };
      updateElementSilent(elementId, { animations: anims });

      // Multi-select: apply same delta to all other selected elements (move only)
      if (type === 'move' && state.selectedElementIds.length > 1) {
        const delayDelta = newDelay - startDelay;
        const snap = barDragRef.current.snapshot as typeof project;
        for (const selId of state.selectedElementIds) {
          if (selId === elementId) continue;
          const snapEl = snap.elements.find((e) => e.id === selId);
          if (!snapEl) continue;
          const origAnims = snapEl.animations || [];
          if (origAnims.length === 0) continue;
          const updated = origAnims.map((a) => ({
            ...a,
            delay: Math.max(0, Math.round(((a.delay || 0) + delayDelta) / 50) * 50),
          }));
          updateElementSilent(selId, { animations: updated });
        }
      }
    };

    const handleMouseUp = () => {
      if (barDragRef.current) {
        pushSnapshot(barDragRef.current.snapshot);
      }
      barDragRef.current = null;
      setBarDragActive(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [barDragActive, pxPerMs, updateElementSilent, pushSnapshot]);

  // Helper to make a keyframe key
  const kfKey = (elementId: string, time: number) => `${elementId}:${time}`;

  // Keyframe diamond drag handlers (multi-select aware)
  const handleKfMouseDown = useCallback((
    e: React.MouseEvent,
    elementId: string,
    time: number,
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();

    const key = kfKey(elementId, time);

    // Determine effective selection for this drag
    let effectiveSelection: Set<string>;
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      effectiveSelection = new Set(selectedKeyframes);
      if (effectiveSelection.has(key)) effectiveSelection.delete(key);
      else effectiveSelection.add(key);
      setSelectedKeyframes(effectiveSelection);
    } else if (selectedKeyframes.has(key)) {
      // Already selected - drag all selected
      effectiveSelection = selectedKeyframes;
    } else {
      // New solo selection
      effectiveSelection = new Set([key]);
      setSelectedKeyframes(effectiveSelection);
    }

    // Build drag items from effective selection
    const items = Array.from(effectiveSelection).map((k) => {
      const [elId, t] = k.split(':');
      return { elementId: elId, startTime: parseInt(t) };
    });

    // Jump playhead to clicked keyframe time
    setCurrentTime(time);
    selectElement(elementId);

    const snapshot = JSON.parse(JSON.stringify(project));
    kfDragRef.current = { startMouseX: e.clientX, items, snapshot };
    setKfDragActive(true);
  }, [project, selectedKeyframes, setCurrentTime, selectElement]);

  useEffect(() => {
    if (!kfDragActive) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!kfDragRef.current) return;
      const { startMouseX, items } = kfDragRef.current;
      const dxPx = e.clientX - startMouseX;
      const dxMs = Math.round(dxPx / pxPerMs);
      const snappedDx = Math.round(dxMs / 50) * 50;
      if (snappedDx === 0) return;

      // Check all items can move (no negative times)
      const canMove = items.every((item) => item.startTime + snappedDx >= 0);
      if (!canMove) return;

      // Group items by element
      const byElement = new Map<string, { startTime: number }[]>();
      for (const item of items) {
        if (!byElement.has(item.elementId)) byElement.set(item.elementId, []);
        byElement.get(item.elementId)!.push(item);
      }

      const state = useProjectStore.getState();
      for (const [elId, elItems] of byElement) {
        const el = state.project.elements.find((e) => e.id === elId);
        if (!el || !el.keyframes) continue;

        const movingTimes = new Set(elItems.map((i) => i.startTime));
        const updated = el.keyframes.map((kf) => {
          if (movingTimes.has(kf.time)) {
            return { ...kf, time: kf.time + snappedDx };
          }
          return kf;
        }).sort((a, b) => a.time - b.time);

        updateElementSilent(elId, { keyframes: updated });
      }

      // Update startTimes and mouse position
      for (const item of items) {
        item.startTime += snappedDx;
      }
      kfDragRef.current.startMouseX = e.clientX;

      // Update selectedKeyframes to match new times
      const newSelection = new Set(items.map((i) => kfKey(i.elementId, i.startTime)));
      setSelectedKeyframes(newSelection);
    };

    const handleMouseUp = () => {
      if (kfDragRef.current) {
        pushSnapshot(kfDragRef.current.snapshot);
      }
      kfDragRef.current = null;
      setKfDragActive(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [kfDragActive, pxPerMs, updateElementSilent, pushSnapshot]);

  // Camera keyframe diamond drag handlers
  const handleCamKfMouseDown = useCallback((
    e: React.MouseEvent,
    time: number,
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const isAlt = e.altKey;
    const snapshot = JSON.parse(JSON.stringify(project));

    if (isAlt) {
      // Alt+Drag: create a duplicate at same position, then drag the copy
      const cameraKfs = useProjectStore.getState().project.cameraKeyframes || [];
      const original = cameraKfs.find((k) => k.time === time);
      if (!original) return;
      // Insert duplicate at +50ms (will be moved by drag)
      const dupeTime = time + 50;
      const updated = [...cameraKfs, { ...original, time: dupeTime }].sort((a, b) => a.time - b.time);
      useProjectStore.setState((state) => ({
        project: { ...state.project, cameraKeyframes: updated },
      }));
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
      const dxPx = e.clientX - startMouseX;
      const dxMs = dxPx / pxPerMs;
      let newTime = Math.max(0, Math.round(startTime + dxMs));
      newTime = Math.round(newTime / 50) * 50;

      const cameraKfs = useProjectStore.getState().project.cameraKeyframes || [];
      const kf = cameraKfs.find((k) => k.time === startTime) ||
                 cameraKfs.find((k) => Math.abs(k.time - startTime) < 50);
      if (!kf) return;

      const filtered = cameraKfs.filter((k) => k.time !== kf.time);
      const updated = [...filtered, { ...kf, time: newTime }].sort((a, b) => a.time - b.time);
      // Silent update via direct set (no history)
      useProjectStore.setState((state) => ({
        project: { ...state.project, cameraKeyframes: updated },
      }));
      camKfDragRef.current.startTime = newTime;
      camKfDragRef.current.startMouseX = e.clientX;
    };

    const handleMouseUp = () => {
      if (camKfDragRef.current) {
        pushSnapshot(camKfDragRef.current.snapshot);
      }
      camKfDragRef.current = null;
      setCamKfDragActive(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [camKfDragActive, pxPerMs, pushSnapshot]);

  // Close camera keyframe context menu on click-outside or Escape
  useEffect(() => {
    if (!camKfContextMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (camKfMenuRef.current && !camKfMenuRef.current.contains(e.target as Node)) {
        setCamKfContextMenu(null);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCamKfContextMenu(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [camKfContextMenu]);

  // Close keyframe context menu on click-outside or Escape
  useEffect(() => {
    if (!kfContextMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (kfMenuRef.current && !kfMenuRef.current.contains(e.target as Node)) {
        setKfContextMenu(null);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setKfContextMenu(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [kfContextMenu]);

  // Close layer context menu on click-outside or Escape
  useEffect(() => {
    if (!layerContextMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (layerMenuRef.current && !layerMenuRef.current.contains(e.target as Node)) {
        setLayerContextMenu(null);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLayerContextMenu(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [layerContextMenu]);

  // Add keyframe at current playhead time for all selected elements
  const handleAddKeyframe = useCallback(() => {
    if (selectedElementIds.length === 0) return;
    const snappedTime = Math.round(currentTime / 50) * 50;

    for (const selId of selectedElementIds) {
      const el = project.elements.find((e) => e.id === selId);
      if (!el) continue;

      const kf: Keyframe = {
        time: snappedTime,
        x: el.position.x,
        y: el.position.y,
        width: el.size.width,
        height: el.size.height,
        rotation: el.rotation,
      };

      // Capture content-specific properties
      if (el.type === 'shape') {
        const c = el.content as ShapeContent;
        kf.fill = c.fill;
        kf.stroke = c.stroke;
        kf.strokeWidth = c.strokeWidth;
        kf.borderRadius = c.borderRadius;
      } else if (el.type === 'text') {
        const c = el.content as TextContent;
        kf.color = c.color;
        kf.fontSize = c.fontSize;
      }

      addKeyframe(el.id, kf);
    }
  }, [selectedElementIds, project.elements, currentTime, addKeyframe]);

  // Add camera keyframe at current playhead time
  const handleAddCameraKeyframe = useCallback(() => {
    const snappedTime = Math.round(currentTime / 50) * 50;
    const camKf: CameraKeyframe = {
      time: snappedTime,
      x: project.canvas.width / 2,
      y: project.canvas.height / 2,
      zoom: 1.0,
    };
    addCameraKeyframe(camKf);
  }, [currentTime, project.canvas.width, project.canvas.height, addCameraKeyframe]);

  // Format time as MM:SS.ms
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const millis = Math.floor((ms % 1000) / 10);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(2, '0')}`;
  };

  const getElementDisplayName = (el: typeof elements[0]) => {
    if (el.name) return el.name;
    if (el.type === 'text' && el.content.type === 'text') return el.content.text;
    return el.type;
  };

  return (
    <div style={{
      height: '100%',
      backgroundColor: TL_BG,
      borderTop: `1px solid ${TL_BORDER}`,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Timeline Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 16px',
        borderBottom: `1px solid ${TL_BORDER}`,
        minHeight: 32,
        backgroundColor: TL_BG_MUTED,
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: TL_TEXT_SECONDARY, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Ebenen & Timeline
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: TL_TEXT_MUTED }}>
            {project.elements.length} elements | {animatedElements.length} animated
          </span>
          <span style={{ fontSize: 11, fontFamily: 'monospace', color: TL_TEXT_SECONDARY, minWidth: 70, textAlign: 'right' }}>
            {formatTime(currentTime)}
          </span>
          <button
            onClick={handleAddKeyframe}
            disabled={selectedElementIds.length === 0}
            title="Keyframe an aktueller Position hinzufügen"
            style={{
              padding: '4px 10px',
              backgroundColor: selectedElementIds.length > 0 ? 'var(--ae-notice)' : 'transparent',
              color: selectedElementIds.length > 0 ? 'var(--ae-gray-900)' : TL_TEXT_DISABLED,
              border: `1px solid ${TL_BORDER}`,
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              cursor: selectedElementIds.length > 0 ? 'pointer' : 'not-allowed',
            }}
          >
            ◆ Keyframe bei {formatTime(currentTime)}
          </button>
          <button
            onClick={handleAddCameraKeyframe}
            title="Kamera-Keyframe an aktueller Position hinzufügen"
            style={{
              padding: '4px 10px',
              backgroundColor: '#00bcd4',
              color: '#000',
              border: `1px solid ${TL_BORDER}`,
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <FontAwesomeIcon icon={faCamera} style={{ marginRight: 4 }} />Kamera-KF
          </button>
          {/* Play / Pause / Stop controls */}
          <button
            onClick={playbackState === 'playing' ? pauseAllAnimations : playAllAnimations}
            style={{
              padding: '4px 12px',
              backgroundColor: playbackState === 'playing' ? 'var(--ae-notice)' : playbackState === 'paused' ? 'var(--ae-positive)' : 'transparent',
              color: playbackState !== 'stopped' ? 'var(--ae-gray-900)' : TL_TEXT_MUTED,
              border: `1px solid ${TL_BORDER}`,
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {playbackState === 'playing' ? '⏸ Pause' : playbackState === 'paused' ? '▶ Weiter' : '▶ Play'}
          </button>
          {playbackState !== 'stopped' && (
            <button
              onClick={stopAllAnimations}
              style={{
                padding: '4px 12px',
                backgroundColor: 'var(--ae-danger)',
                color: 'var(--ae-gray-900)',
                border: `1px solid ${TL_BORDER}`,
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ⏹ Stop
            </button>
          )}
          {/* Timeline Zoom controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 8 }}>
            <button
              onClick={() => {
                const container = tracksRef.current;
                if (!container) { setTimelineZoom((z) => Math.max(0.2, z / 1.4)); return; }
                const centerX = container.scrollLeft + container.clientWidth / 2;
                const centerTime = centerX / pxPerMs;
                const newZoom = Math.max(0.2, timelineZoom / 1.4);
                const newPxPerMs = Math.max(0.02, basePxPerMs * newZoom);
                setTimelineZoom(newZoom);
                requestAnimationFrame(() => { container.scrollLeft = centerTime * newPxPerMs - container.clientWidth / 2; });
              }}
              title="Timeline verkleinern (Alt+Scroll)"
              style={{
                padding: '2px 6px',
                backgroundColor: 'transparent',
                color: TL_TEXT_SECONDARY,
                border: `1px solid ${TL_BORDER}`,
                borderRadius: 3,
                fontSize: 13,
                cursor: 'pointer',
                lineHeight: 1,
              }}
            >
              -
            </button>
            <span
              onClick={() => setTimelineZoom(1.0)}
              title="Timeline-Zoom zurücksetzen"
              style={{ fontSize: 10, color: TL_TEXT_MUTED, minWidth: 36, textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}
            >
              {Math.round(timelineZoom * 100)}%
            </span>
            <button
              onClick={() => {
                const container = tracksRef.current;
                if (!container) { setTimelineZoom((z) => Math.min(30, z * 1.4)); return; }
                const centerX = container.scrollLeft + container.clientWidth / 2;
                const centerTime = centerX / pxPerMs;
                const newZoom = Math.min(30, timelineZoom * 1.4);
                const newPxPerMs = Math.max(0.02, basePxPerMs * newZoom);
                setTimelineZoom(newZoom);
                requestAnimationFrame(() => { container.scrollLeft = centerTime * newPxPerMs - container.clientWidth / 2; });
              }}
              title="Timeline vergrößern (Alt+Scroll)"
              style={{
                padding: '2px 6px',
                backgroundColor: 'transparent',
                color: TL_TEXT_SECONDARY,
                border: `1px solid ${TL_BORDER}`,
                borderRadius: 3,
                fontSize: 13,
                cursor: 'pointer',
                lineHeight: 1,
              }}
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Timeline Body */}
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
      }}>
        {/* Layer Panel (Left) */}
        <div style={{
          minWidth: 220,
          maxWidth: 220,
          borderRight: `1px solid ${TL_BORDER}`,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: TL_BG_MUTED,
        }}>
          {/* Column header */}
          <div style={{
            height: 20,
            borderBottom: `1px solid ${TL_BORDER}`,
            display: 'flex',
            alignItems: 'center',
            padding: '0 8px',
            fontSize: 9,
            color: TL_TEXT_MUTED,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            flexShrink: 0,
          }}>
            Layers
          </div>

          {/* Camera layer row */}
          {(project.cameraKeyframes && project.cameraKeyframes.length > 0) && (
            <div
              style={{
                height: 28,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '0 4px',
                fontSize: 11,
                backgroundColor: 'rgba(0, 188, 212, 0.08)',
                borderBottom: `1px solid ${TL_ROW_BORDER}`,
                flexShrink: 0,
              }}
            >
              <span style={{ width: 16 }} />
              <span style={{ width: 20, textAlign: 'center', fontSize: 11 }}><FontAwesomeIcon icon={faVideo} /></span>
              <span style={{ width: 20 }} />
              <span style={{
                flex: 1,
                fontSize: 11,
                fontWeight: 600,
                color: '#00bcd4',
              }}>
                Kamera
              </span>
            </div>
          )}

          {/* Layer rows */}
          {elements.map((el, reversedIndex) => {
            const isSelected = selectedElementIds.includes(el.id);

            return (
              <div
                key={el.id}
                draggable
                onDragStart={() => handleDragStart(reversedIndex)}
                onDragOver={(e) => handleDragOver(e, reversedIndex)}
                onDrop={() => handleDrop(reversedIndex)}
                onDragEnd={() => { dragSourceIndex.current = null; setDragOverIndex(null); }}
                onClick={(e) => handleRowClick(el.id, e)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  selectElement(el.id);
                  setLayerContextMenu({ x: e.clientX, y: e.clientY, elementId: el.id });
                }}
                style={{
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '0 4px',
                  fontSize: 11,
                  cursor: 'pointer',
                  backgroundColor: isSelected ? 'var(--ae-accent-overlay)' : 'transparent',
                  borderBottom: `1px solid ${TL_ROW_BORDER}`,
                  borderTop: dragOverIndex === reversedIndex ? `2px solid ${TL_ACCENT}` : '2px solid transparent',
                  flexShrink: 0,
                }}
              >
                {/* Drag handle */}
                <span style={{ cursor: 'grab', color: TL_TEXT_DISABLED, fontSize: 10, userSelect: 'none', width: 16, textAlign: 'center' }}>
                  ⋮⋮
                </span>

                {/* Visibility toggle */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleElementVisibility(el.id); }}
                  title={el.visible ? 'Ausblenden' : 'Einblenden'}
                  style={{
                    width: 20,
                    height: 20,
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    fontSize: 12,
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: el.visible ? 1 : 0.3,
                    color: TL_TEXT_MUTED,
                  }}
                >
                  {el.visible ? '👁' : '👁'}
                </button>

                {/* Lock toggle */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleElementLock(el.id); }}
                  title={el.locked ? 'Entsperren' : 'Sperren'}
                  style={{
                    width: 20,
                    height: 20,
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    fontSize: 11,
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: el.locked ? 'var(--ae-danger)' : TL_TEXT_DISABLED,
                  }}
                >
                  {el.locked ? '🔒' : '🔓'}
                </button>

                {/* Element name */}
                {editingId === el.id ? (
                  <input
                    ref={inputRef}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={handleFinishRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleFinishRename();
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      flex: 1,
                      fontSize: 11,
                      border: `1px solid ${TL_ACCENT}`,
                      borderRadius: 3,
                      padding: '2px 4px',
                      outline: 'none',
                      backgroundColor: 'var(--ae-bg-input)',
                      color: TL_TEXT,
                      minWidth: 0,
                    }}
                  />
                ) : (
                  <span
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      handleStartRename(el.id, getElementDisplayName(el));
                    }}
                    style={{
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      color: isSelected ? TL_ACCENT_STRONG : el.visible ? TL_TEXT : TL_TEXT_DISABLED,
                      fontWeight: isSelected ? 600 : 400,
                      textDecoration: el.visible ? 'none' : 'line-through',
                    }}
                  >
                    {getElementDisplayName(el)}
                  </span>
                )}
                {el.effects && el.effects.filter(e => e.enabled).length > 0 && (
                  <span
                    title={`${el.effects.filter(e => e.enabled).length} Effekt(e) aktiv`}
                    style={{
                      fontSize: 10,
                      color: TL_ACCENT,
                      flexShrink: 0,
                      marginLeft: 2,
                    }}
                  >
                    FX
                  </span>
                )}
              </div>
            );
          })}

          {elements.length === 0 && (
            <div style={{ padding: '16px 8px', fontSize: 11, color: TL_TEXT_MUTED, textAlign: 'center' }}>
              Keine Elemente
            </div>
          )}
        </div>

        {/* Timeline Tracks (Right) */}
        <div
          ref={tracksRef}
          onWheel={handleTimelineWheel}
          style={{
            flex: 1,
            overflow: 'auto',
            position: 'relative',
          }}
        >
          {/* Playhead */}
          {currentTime > 0 && (
            <div style={{
              position: 'absolute',
              left: currentTime * pxPerMs,
              top: 0,
              bottom: 0,
              width: 1,
              backgroundColor: TL_ACCENT,
              zIndex: 10,
              pointerEvents: 'none',
            }}>
              {/* Playhead marker triangle */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: -5,
                width: 0,
                height: 0,
                borderLeft: '5px solid transparent',
                borderRight: '5px solid transparent',
                borderTop: `8px solid ${TL_ACCENT}`,
              }} />
            </div>
          )}

          {/* Time Ruler (scrubbing area) */}
          <div
            onMouseDown={handleScrubStart}
            style={{
              height: 20,
              position: 'relative',
              borderBottom: `1px solid ${TL_BORDER}`,
              minWidth: timelineWidth,
              flexShrink: 0,
              cursor: 'col-resize',
              backgroundColor: TL_BG_MUTED,
            }}
          >
            {markers.map((t) => (
              <div
                key={t}
                style={{
                  position: 'absolute',
                  left: t * pxPerMs,
                  top: 0,
                  height: '100%',
                  display: 'flex',
                  alignItems: 'flex-end',
                  paddingBottom: 2,
                }}
              >
                <span style={{
                  fontSize: 9,
                  color: TL_TEXT_MUTED,
                  fontFamily: 'monospace',
                  marginLeft: 2,
                }}>
                  {t >= 1000 ? `${(t / 1000).toFixed(1)}s` : `${t}ms`}
                </span>
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: 1,
                  height: '100%',
                  backgroundColor: TL_BORDER,
                }} />
              </div>
            ))}
          </div>

          {/* Camera track */}
          {(project.cameraKeyframes && project.cameraKeyframes.length > 0) && (
            <div
              style={{
                height: 28,
                position: 'relative',
                minWidth: timelineWidth,
                borderBottom: `1px solid ${TL_ROW_BORDER}`,
                cursor: 'crosshair',
                backgroundColor: 'rgba(0, 188, 212, 0.04)',
                flexShrink: 0,
              }}
            >
              {/* Camera keyframe diamonds (larger hit area wrapper) */}
              {project.cameraKeyframes.map((kf) => (
                <div
                  key={`cam-kf-${kf.time}`}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    handleCamKfMouseDown(e, kf.time);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCamKfContextMenu({ x: e.clientX, y: e.clientY, time: kf.time });
                  }}
                  title={`Kamera ${kf.time}ms (x:${Math.round(kf.x)}, y:${Math.round(kf.y)}, zoom:${kf.zoom.toFixed(1)})`}
                  style={{
                    position: 'absolute',
                    left: kf.time * pxPerMs - 9,
                    top: 5,
                    width: 18,
                    height: 18,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'ew-resize',
                    zIndex: 5,
                  }}
                >
                  <div style={{
                    width: 10,
                    height: 10,
                    backgroundColor: '#00bcd4',
                    border: '1px solid #00e5ff',
                    transform: 'rotate(45deg)',
                    pointerEvents: 'none',
                  }} />
                </div>
              ))}
            </div>
          )}

          {/* Tracks - one per element (reversed order to match layer panel) */}
          {elements.map((el) => {
            const anims = getAnimations(el);
            const hasAnimation = anims.length > 0;
            const isSelected = selectedElementIds.includes(el.id);

            return (
              <div
                key={el.id}
                onClick={(e) => handleTrackClick(el.id, e)}
                style={{
                  height: 28,
                  position: 'relative',
                  minWidth: timelineWidth,
                  borderBottom: `1px solid ${TL_ROW_BORDER}`,
                  cursor: 'crosshair',
                  backgroundColor: isSelected ? 'rgba(86, 129, 255, 0.12)' : 'transparent',
                  flexShrink: 0,
                }}
              >
                {/* Animation bars (one per animation) */}
                {anims.map((anim, animIdx) => {
                  const delay = anim.delay || 0;
                  const duration = anim.duration || 600;
                  const barWidth = Math.max(duration * pxPerMs, 20);
                  const barHue = 220 + animIdx * 40;
                  const barColor = animIdx === 0
                    ? (isSelected ? TL_ACCENT : 'rgba(86, 129, 255, 0.3)')
                    : (isSelected ? `hsl(${barHue}, 70%, 60%)` : `hsla(${barHue}, 70%, 60%, 0.3)`);
                  const borderColor = animIdx === 0
                    ? (isSelected ? TL_ACCENT_STRONG : 'rgba(86, 129, 255, 0.4)')
                    : (isSelected ? `hsl(${barHue}, 70%, 70%)` : `hsla(${barHue}, 70%, 60%, 0.4)`);
                  return (
                    <div
                      key={`anim-${animIdx}`}
                      onMouseDown={(e) => handleBarMouseDown(e, el.id, 'move', delay, duration, animIdx)}
                      style={{
                        position: 'absolute',
                        left: delay * pxPerMs,
                        width: barWidth,
                        top: 5,
                        height: 18,
                        backgroundColor: barColor,
                        borderRadius: 3,
                        border: `1px solid ${borderColor}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        cursor: 'grab',
                        userSelect: 'none',
                      }}
                    >
                      <div
                        onMouseDown={(e) => handleBarMouseDown(e, el.id, 'resize-left', delay, duration, animIdx)}
                        style={{ position: 'absolute', left: 0, top: 0, width: 6, height: '100%', cursor: 'ew-resize', borderRadius: '3px 0 0 3px' }}
                      />
                      <span style={{
                        fontSize: 9,
                        color: isSelected ? 'var(--ae-gray-900)' : TL_TEXT,
                        whiteSpace: 'nowrap',
                        padding: '0 8px',
                        pointerEvents: 'none',
                      }}>
                        {anim.preset}
                      </span>
                      <div
                        onMouseDown={(e) => handleBarMouseDown(e, el.id, 'resize-right', delay, duration, animIdx)}
                        style={{ position: 'absolute', right: 0, top: 0, width: 6, height: '100%', cursor: 'ew-resize', borderRadius: '0 3px 3px 0' }}
                      />
                    </div>
                  );
                })}

                {/* Default element bar (if no animation bar) - shows element presence */}
                {!hasAnimation && el.content.type !== 'widget' && (
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    width: Math.max(60, 500 * pxPerMs),
                    top: 5,
                    height: 18,
                    backgroundColor: isSelected ? 'rgba(86, 129, 255, 0.16)' : 'rgba(255, 255, 255, 0.04)',
                    borderRadius: 3,
                    border: isSelected ? `1px dashed ${TL_ACCENT_STRONG}` : '1px dashed var(--ae-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    pointerEvents: 'none',
                  }}>
                    <span style={{
                      fontSize: 9,
                      color: isSelected ? TL_ACCENT_STRONG : TL_TEXT_MUTED,
                      whiteSpace: 'nowrap',
                      padding: '0 8px',
                      fontStyle: 'italic',
                    }}>
                      keine Animation
                    </span>
                  </div>
                )}

                {/* Widget duration bar (if no visual animation bar) */}
                {!hasAnimation && el.content.type === 'widget' && (() => {
                  const wc = el.content as WidgetContent;
                  const wDuration = (wc.durationInFrames / wc.fps) * 1000;
                  const wDelay = 0;
                  const wBarWidth = Math.max(wDuration * pxPerMs, 20);
                  return (
                    <div
                      onMouseDown={(e) => handleBarMouseDown(e, el.id, 'move', wDelay, wDuration, 0)}
                      style={{
                        position: 'absolute',
                        left: wDelay * pxPerMs,
                        width: wBarWidth,
                        top: 5,
                        height: 18,
                        backgroundColor: isSelected ? TL_BG_RAISED : 'var(--ae-gray-400)',
                        borderRadius: 3,
                        border: isSelected ? `1px solid ${TL_TEXT_SECONDARY}` : '1px solid var(--ae-gray-500)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        cursor: 'grab',
                        userSelect: 'none',
                      }}
                    >
                      <div
                        onMouseDown={(e) => handleBarMouseDown(e, el.id, 'resize-left', wDelay, wDuration, 0)}
                        style={{ position: 'absolute', left: 0, top: 0, width: 6, height: '100%', cursor: 'ew-resize', borderRadius: '3px 0 0 3px' }}
                      />
                      <span style={{
                        fontSize: 9,
                        color: isSelected ? TL_TEXT : 'var(--ae-gray-50)',
                        whiteSpace: 'nowrap',
                        padding: '0 8px',
                        pointerEvents: 'none',
                      }}>
                        {wc.widgetName}
                      </span>
                      <div
                        onMouseDown={(e) => handleBarMouseDown(e, el.id, 'resize-right', wDelay, wDuration, 0)}
                        style={{ position: 'absolute', right: 0, top: 0, width: 6, height: '100%', cursor: 'ew-resize', borderRadius: '0 3px 3px 0' }}
                      />
                    </div>
                  );
                })()}

                {/* Keyframe diamonds */}
                {el.keyframes && el.keyframes.map((kf) => {
                  const isKfSelected = selectedKeyframes.has(kfKey(el.id, kf.time));
                  return (
                    <div
                      key={`kf-${kf.time}`}
                      onMouseDown={(e) => handleKfMouseDown(e, el.id, kf.time)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setKfContextMenu({ x: e.clientX, y: e.clientY, elementId: el.id, time: kf.time });
                      }}
                      title={`Keyframe ${kf.time}ms (${Math.round(kf.x)}, ${Math.round(kf.y)})`}
                      style={{
                        position: 'absolute',
                        left: kf.time * pxPerMs - 5,
                        top: 9,
                        width: 10,
                        height: 10,
                        backgroundColor: isKfSelected ? '#fff' : 'var(--ae-notice-strong)',
                        border: isKfSelected ? '2px solid var(--ae-accent)' : '1px solid var(--ae-notice)',
                        transform: 'rotate(45deg)',
                        cursor: 'ew-resize',
                        zIndex: isKfSelected ? 6 : 5,
                        boxShadow: isKfSelected ? '0 0 6px var(--ae-accent)' : 'none',
                      }}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Keyframe context menu */}
      {kfContextMenu && ReactDOM.createPortal(
        <div
          ref={kfMenuRef}
          style={{
            position: 'fixed',
            top: kfContextMenu.y,
            left: kfContextMenu.x,
            backgroundColor: 'var(--ae-bg-panel)',
            border: '1px solid var(--ae-border)',
            borderRadius: 6,
            padding: '4px 0',
            minWidth: 220,
            zIndex: 100000,
            boxShadow: 'var(--ae-shadow-floating)',
          }}
        >
          {/* Duplicate options */}
          {[500, 1000, 2000].map((offset) => {
            const label = offset >= 1000 ? `${offset / 1000}s` : `${offset}ms`;
            return (
              <div
                key={`dup-${offset}`}
                onClick={() => {
                  const el = useProjectStore.getState().project.elements.find(
                    (e) => e.id === kfContextMenu.elementId
                  );
                  const kf = el?.keyframes?.find((k) => k.time === kfContextMenu.time);
                  if (kf) {
                    addKeyframe(kfContextMenu.elementId, { ...kf, time: kf.time + offset });
                  }
                  setKfContextMenu(null);
                }}
                style={{
                  padding: '8px 16px',
                  color: 'var(--ae-notice-strong)',
                  fontSize: 13,
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--ae-bg-panel-raised)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent';
                }}
              >
                Duplizieren +{label}
              </div>
            );
          })}

          {/* Custom time duplicate */}
          <div style={{ padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'var(--ae-text-secondary)', fontSize: 12, whiteSpace: 'nowrap' }}>Eigene Zeit:</span>
            <input
              type="number"
              min="0"
              step="0.1"
              defaultValue="1.5"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const secs = parseFloat((e.target as HTMLInputElement).value) || 0;
                  const ms = Math.max(0, secs) * 1000;
                  const el = useProjectStore.getState().project.elements.find(
                    (elem) => elem.id === kfContextMenu.elementId
                  );
                  const kf = el?.keyframes?.find((k) => k.time === kfContextMenu.time);
                  if (kf) {
                    addKeyframe(kfContextMenu.elementId, { ...kf, time: kf.time + ms });
                  }
                  setKfContextMenu(null);
                }
                e.stopPropagation();
              }}
              style={{
                width: 60,
                padding: '4px 6px',
                backgroundColor: 'var(--ae-bg-panel-muted)',
                border: '1px solid var(--ae-border)',
                borderRadius: 4,
                color: 'var(--ae-text-primary)',
                fontSize: 12,
                outline: 'none',
              }}
            />
            <span style={{ color: 'var(--ae-text-muted)', fontSize: 11 }}>s + Enter</span>
          </div>

          {/* Delete */}
          <div style={{ height: 1, backgroundColor: 'var(--ae-border)', margin: '4px 0' }} />
          <div
            onClick={() => {
              removeKeyframe(kfContextMenu.elementId, kfContextMenu.time);
              setKfContextMenu(null);
            }}
            style={{
              padding: '8px 16px',
              color: 'var(--ae-danger)',
              fontSize: 13,
              cursor: 'pointer',
              userSelect: 'none',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--ae-bg-panel-raised)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent';
            }}
          >
            Keyframe löschen
          </div>
        </div>,
        document.body
      )}

      {/* Camera keyframe context menu */}
      {camKfContextMenu && ReactDOM.createPortal(
        <div
          ref={camKfMenuRef}
          style={{
            position: 'fixed',
            top: camKfContextMenu.y,
            left: camKfContextMenu.x,
            backgroundColor: 'var(--ae-bg-panel)',
            border: '1px solid var(--ae-border)',
            borderRadius: 6,
            padding: '4px 0',
            minWidth: 220,
            zIndex: 100000,
            boxShadow: 'var(--ae-shadow-floating)',
          }}
        >
          {/* Duplicate options */}
          {[500, 1000, 2000].map((offset) => {
            const label = offset >= 1000 ? `${offset / 1000}s` : `${offset}ms`;
            return (
              <div
                key={`dup-${offset}`}
                onClick={() => {
                  const cameraKfs = useProjectStore.getState().project.cameraKeyframes || [];
                  const kf = cameraKfs.find((k) => k.time === camKfContextMenu.time);
                  if (kf) {
                    addCameraKeyframe({ ...kf, time: kf.time + offset });
                  }
                  setCamKfContextMenu(null);
                }}
                style={{
                  padding: '8px 16px',
                  color: '#00bcd4',
                  fontSize: 13,
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--ae-bg-panel-raised)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent';
                }}
              >
                Duplizieren +{label}
              </div>
            );
          })}

          {/* Custom time duplicate */}
          <div style={{ padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'var(--ae-text-secondary)', fontSize: 12, whiteSpace: 'nowrap' }}>Eigene Zeit:</span>
            <input
              type="number"
              min="0"
              step="0.1"
              defaultValue="1.5"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const secs = parseFloat((e.target as HTMLInputElement).value) || 0;
                  const ms = Math.max(0, secs) * 1000;
                  const cameraKfs = useProjectStore.getState().project.cameraKeyframes || [];
                  const kf = cameraKfs.find((k) => k.time === camKfContextMenu.time);
                  if (kf) {
                    addCameraKeyframe({ ...kf, time: kf.time + ms });
                  }
                  setCamKfContextMenu(null);
                }
                e.stopPropagation();
              }}
              style={{
                width: 60,
                padding: '4px 6px',
                backgroundColor: 'var(--ae-bg-panel-muted)',
                border: '1px solid var(--ae-border)',
                borderRadius: 4,
                color: 'var(--ae-text-primary)',
                fontSize: 12,
                outline: 'none',
              }}
            />
            <span style={{ color: 'var(--ae-text-muted)', fontSize: 11 }}>s + Enter</span>
          </div>

          {/* Delete */}
          <div style={{ height: 1, backgroundColor: 'var(--ae-border)', margin: '4px 0' }} />
          <div
            onClick={() => {
              removeCameraKeyframe(camKfContextMenu.time);
              setCamKfContextMenu(null);
            }}
            style={{
              padding: '8px 16px',
              color: 'var(--ae-danger)',
              fontSize: 13,
              cursor: 'pointer',
              userSelect: 'none',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--ae-bg-panel-raised)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent';
            }}
          >
            Kamera-Keyframe löschen
          </div>
        </div>,
        document.body
      )}

      {/* Layer context menu */}
      {layerContextMenu && ReactDOM.createPortal(
        <div
          ref={layerMenuRef}
          style={{
            position: 'fixed',
            top: layerContextMenu.y,
            left: layerContextMenu.x,
            backgroundColor: 'var(--ae-bg-panel)',
            border: '1px solid var(--ae-border)',
            borderRadius: 6,
            padding: '4px 0',
            minWidth: 180,
            zIndex: 100000,
            boxShadow: 'var(--ae-shadow-floating)',
          }}
        >
          {(() => {
            const realIndex = project.elements.findIndex((el) => el.id === layerContextMenu.elementId);
            const lastIndex = project.elements.length - 1;
            const items = [
              { label: 'Ganz nach vorne', disabled: realIndex === lastIndex, action: () => reorderElements(realIndex, lastIndex) },
              { label: 'Eine Ebene nach vorne', disabled: realIndex >= lastIndex, action: () => reorderElements(realIndex, realIndex + 1) },
              { label: 'Eine Ebene nach hinten', disabled: realIndex <= 0, action: () => reorderElements(realIndex, realIndex - 1) },
              { label: 'Ganz nach hinten', disabled: realIndex === 0, action: () => reorderElements(realIndex, 0) },
            ];
            return items.map((item) => (
              <div
                key={item.label}
                onClick={() => {
                  if (!item.disabled) {
                    item.action();
                    setLayerContextMenu(null);
                  }
                }}
                style={{
                  padding: '8px 16px',
                  color: item.disabled ? TL_TEXT_DISABLED : TL_TEXT,
                  fontSize: 13,
                  cursor: item.disabled ? 'default' : 'pointer',
                  userSelect: 'none',
                }}
                onMouseEnter={(e) => {
                  if (!item.disabled) {
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--ae-bg-panel-raised)';
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent';
                }}
              >
                {item.label}
              </div>
            ));
          })()}
        </div>,
        document.body
      )}
    </div>
  );
};
