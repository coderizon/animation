import { useState, useRef, useCallback, useEffect } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { ShapeContent, TextContent, WidgetContent, Keyframe } from '../../types/project';

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
    startMouseX: number;
    startDelay: number;
    startDuration: number;
    snapshot: typeof project;
  } | null>(null);
  const [barDragActive, setBarDragActive] = useState(false);

  // Keyframe diamond drag state
  const kfDragRef = useRef<{
    elementId: string;
    startMouseX: number;
    startTime: number;
    snapshot: typeof project;
  } | null>(null);
  const [kfDragActive, setKfDragActive] = useState(false);

  // Reverse order: highest layer first
  const elements = [...project.elements].reverse();

  // Timeline calculations
  const animatedElements = project.elements.filter((el) => el.animation && el.animation.preset !== 'none');
  const maxKeyframeTime = project.elements.reduce((max, el) => {
    if (!el.keyframes || el.keyframes.length === 0) return max;
    return Math.max(max, ...el.keyframes.map((kf) => kf.time));
  }, 0);
  const maxTime = Math.max(
    3000,
    maxKeyframeTime + 500,
    ...project.elements.map((el) => {
      let t = 0;
      const delay = el.animation?.delay || 0;
      if (el.animation && el.animation.preset !== 'none') {
        t = delay + (el.animation.duration || 600);
      }
      if (el.content.type === 'widget') {
        const wDur = (el.content.durationInFrames / el.content.fps) * 1000;
        t = Math.max(t, delay + wDur);
      }
      return t;
    })
  );
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

  // Use a fixed px/ms scale that makes bars readable, and let the timeline scroll
  const minPxPerMs = 0.15;  // minimum scale
  const pxPerMs = Math.max(minPxPerMs, tracksWidth / maxTime);
  const timelineWidth = Math.max(tracksWidth, maxTime * pxPerMs);

  // Time markers
  const markerInterval = maxTime <= 3000 ? 500 : maxTime <= 6000 ? 1000 : 2000;
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
  ) => {
    e.stopPropagation();
    e.preventDefault();
    const snapshot = JSON.parse(JSON.stringify(project));
    barDragRef.current = {
      type,
      elementId,
      startMouseX: e.clientX,
      startDelay: delay,
      startDuration: duration,
      snapshot,
    };
    setBarDragActive(true);
    selectElement(elementId);
  }, [project, selectElement]);

  useEffect(() => {
    if (!barDragActive) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!barDragRef.current) return;
      const { type, elementId, startMouseX, startDelay, startDuration } = barDragRef.current;
      const dxPx = e.clientX - startMouseX;
      const dxMs = dxPx / pxPerMs;

      const el = useProjectStore.getState().project.elements.find((el) => el.id === elementId);
      if (!el) return;

      // Create animation config if it doesn't exist (e.g. widget bars) - use 'none' so only timing is controlled
      const anim = el.animation || { preset: 'none' as const, delay: startDelay, duration: startDuration, easing: 'easeOut' as const };

      let newDelay = startDelay;
      let newDuration = startDuration;

      if (type === 'move') {
        newDelay = Math.max(0, Math.round(startDelay + dxMs));
      } else if (type === 'resize-left') {
        // Moving left edge: changes both delay and duration
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

      updateElementSilent(elementId, {
        animation: { ...anim, delay: newDelay, duration: newDuration },
      });
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

  // Keyframe diamond drag handlers
  const handleKfMouseDown = useCallback((
    e: React.MouseEvent,
    elementId: string,
    time: number,
  ) => {
    e.stopPropagation();
    e.preventDefault();
    const snapshot = JSON.parse(JSON.stringify(project));
    kfDragRef.current = { elementId, startMouseX: e.clientX, startTime: time, snapshot };
    setKfDragActive(true);
    selectElement(elementId);
  }, [project, selectElement]);

  useEffect(() => {
    if (!kfDragActive) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!kfDragRef.current) return;
      const { elementId, startMouseX, startTime } = kfDragRef.current;
      const dxPx = e.clientX - startMouseX;
      const dxMs = dxPx / pxPerMs;
      let newTime = Math.max(0, Math.round(startTime + dxMs));
      newTime = Math.round(newTime / 50) * 50; // 50ms snap

      const el = useProjectStore.getState().project.elements.find((el) => el.id === elementId);
      if (!el || !el.keyframes) return;

      const kf = el.keyframes.find((k) => k.time === startTime) ||
                 el.keyframes.find((k) => Math.abs(k.time - startTime) < 50);
      if (!kf) return;

      // Update: remove old, add at new time (preserve all properties)
      const filtered = el.keyframes.filter((k) => k.time !== kf.time);
      const updated = [...filtered, { ...kf, time: newTime }].sort((a, b) => a.time - b.time);
      updateElementSilent(elementId, { keyframes: updated });
      kfDragRef.current.startTime = newTime;
      kfDragRef.current.startMouseX = e.clientX;
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

  // Add keyframe at current playhead time for selected element (captures ALL properties)
  const handleAddKeyframe = useCallback(() => {
    if (selectedElementIds.length !== 1) return;
    const el = project.elements.find((e) => e.id === selectedElementIds[0]);
    if (!el) return;

    const kf: Keyframe = {
      time: Math.round(currentTime / 50) * 50, // snap to 50ms
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
    } else if (el.type === 'text') {
      const c = el.content as TextContent;
      kf.color = c.color;
      kf.fontSize = c.fontSize;
    }

    addKeyframe(el.id, kf);
  }, [selectedElementIds, project.elements, currentTime, addKeyframe]);

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
      backgroundColor: '#ffffff',
      borderTop: '1px solid #e0e0e8',
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
        borderBottom: '1px solid #e0e0e8',
        minHeight: 32,
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Layers & Timeline
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#999' }}>
            {project.elements.length} elements | {animatedElements.length} animated
          </span>
          <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#666', minWidth: 70, textAlign: 'right' }}>
            {formatTime(currentTime)}
          </span>
          <button
            onClick={handleAddKeyframe}
            disabled={selectedElementIds.length !== 1}
            title="Keyframe an aktueller Position hinzufügen"
            style={{
              padding: '4px 10px',
              backgroundColor: selectedElementIds.length === 1 ? '#FFC107' : 'transparent',
              color: selectedElementIds.length === 1 ? '#000' : '#ccc',
              border: '1px solid #e0e0e8',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              cursor: selectedElementIds.length === 1 ? 'pointer' : 'not-allowed',
            }}
          >
            ◆ Keyframe bei {formatTime(currentTime)}
          </button>
          {/* Play / Pause / Stop controls */}
          <button
            onClick={playbackState === 'playing' ? pauseAllAnimations : playAllAnimations}
            style={{
              padding: '4px 12px',
              backgroundColor: playbackState === 'playing' ? '#FF9800' : playbackState === 'paused' ? '#4CAF50' : 'transparent',
              color: playbackState !== 'stopped' ? '#fff' : '#666',
              border: '1px solid #e0e0e8',
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
                backgroundColor: '#d32f2f',
                color: '#fff',
                border: '1px solid #e0e0e8',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ⏹ Stop
            </button>
          )}
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
          borderRight: '1px solid #e0e0e8',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Column header */}
          <div style={{
            height: 20,
            borderBottom: '1px solid #e0e0e8',
            display: 'flex',
            alignItems: 'center',
            padding: '0 8px',
            fontSize: 9,
            color: '#bbb',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            flexShrink: 0,
          }}>
            Layers
          </div>

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
                style={{
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '0 4px',
                  fontSize: 11,
                  cursor: 'pointer',
                  backgroundColor: isSelected ? 'rgba(33, 150, 243, 0.12)' : 'transparent',
                  borderBottom: '1px solid #e8e8ef',
                  borderTop: dragOverIndex === reversedIndex ? '2px solid #2196F3' : '2px solid transparent',
                  flexShrink: 0,
                }}
              >
                {/* Drag handle */}
                <span style={{ cursor: 'grab', color: '#ccc', fontSize: 10, userSelect: 'none', width: 16, textAlign: 'center' }}>
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
                    color: '#666',
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
                    color: el.locked ? '#d32f2f' : '#ccc',
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
                      border: '1px solid #2196F3',
                      borderRadius: 3,
                      padding: '2px 4px',
                      outline: 'none',
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
                      color: isSelected ? '#2196F3' : el.visible ? '#444' : '#bbb',
                      fontWeight: isSelected ? 600 : 400,
                      textDecoration: el.visible ? 'none' : 'line-through',
                    }}
                  >
                    {getElementDisplayName(el)}
                  </span>
                )}
              </div>
            );
          })}

          {elements.length === 0 && (
            <div style={{ padding: '16px 8px', fontSize: 11, color: '#bbb', textAlign: 'center' }}>
              Keine Elemente
            </div>
          )}
        </div>

        {/* Timeline Tracks (Right) */}
        <div
          ref={tracksRef}
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
              backgroundColor: '#ff0000',
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
                borderTop: '8px solid #ff0000',
              }} />
            </div>
          )}

          {/* Time Ruler (scrubbing area) */}
          <div
            onMouseDown={handleScrubStart}
            style={{
              height: 20,
              position: 'relative',
              borderBottom: '1px solid #e0e0e8',
              minWidth: timelineWidth,
              flexShrink: 0,
              cursor: 'col-resize',
              backgroundColor: '#f8f8fc',
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
                  color: '#bbb',
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
                  backgroundColor: '#e0e0e8',
                }} />
              </div>
            ))}
          </div>

          {/* Tracks - one per element (reversed order to match layer panel) */}
          {elements.map((el) => {
            const hasAnimation = el.animation && el.animation.preset !== 'none';
            const isSelected = selectedElementIds.includes(el.id);

            return (
              <div
                key={el.id}
                onClick={(e) => handleTrackClick(el.id, e)}
                style={{
                  height: 28,
                  position: 'relative',
                  minWidth: timelineWidth,
                  borderBottom: '1px solid #e8e8ef',
                  cursor: 'crosshair',
                  backgroundColor: isSelected ? 'rgba(33, 150, 243, 0.05)' : 'transparent',
                  flexShrink: 0,
                }}
              >
                {hasAnimation && (() => {
                  const delay = el.animation!.delay || 0;
                  const duration = el.animation!.duration || 600;
                  const barWidth = Math.max(duration * pxPerMs, 20);
                  return (
                    <div
                      onMouseDown={(e) => handleBarMouseDown(e, el.id, 'move', delay, duration)}
                      style={{
                        position: 'absolute',
                        left: delay * pxPerMs,
                        width: barWidth,
                        top: 5,
                        height: 18,
                        backgroundColor: isSelected ? '#2196F3' : '#b8c0d8',
                        borderRadius: 3,
                        border: isSelected ? '1px solid #64B5F6' : '1px solid #b0b0c0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        cursor: 'grab',
                        userSelect: 'none',
                      }}
                    >
                      {/* Left resize handle */}
                      <div
                        onMouseDown={(e) => handleBarMouseDown(e, el.id, 'resize-left', delay, duration)}
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          width: 6,
                          height: '100%',
                          cursor: 'ew-resize',
                          borderRadius: '3px 0 0 3px',
                        }}
                      />
                      <span style={{
                        fontSize: 9,
                        color: isSelected ? '#fff' : '#777',
                        whiteSpace: 'nowrap',
                        padding: '0 8px',
                        pointerEvents: 'none',
                      }}>
                        {el.animation!.preset}
                      </span>
                      {/* Right resize handle */}
                      <div
                        onMouseDown={(e) => handleBarMouseDown(e, el.id, 'resize-right', delay, duration)}
                        style={{
                          position: 'absolute',
                          right: 0,
                          top: 0,
                          width: 6,
                          height: '100%',
                          cursor: 'ew-resize',
                          borderRadius: '0 3px 3px 0',
                        }}
                      />
                    </div>
                  );
                })()}

                {/* Default element bar (if no animation bar) - shows element presence */}
                {!hasAnimation && el.content.type !== 'widget' && (
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    width: Math.max(60, 500 * pxPerMs),
                    top: 5,
                    height: 18,
                    backgroundColor: isSelected ? 'rgba(33, 150, 243, 0.25)' : 'rgba(0,0,0,0.06)',
                    borderRadius: 3,
                    border: isSelected ? '1px dashed #64B5F6' : '1px dashed #ccc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    pointerEvents: 'none',
                  }}>
                    <span style={{
                      fontSize: 9,
                      color: isSelected ? '#2196F3' : '#aaa',
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
                  const wDelay = el.animation?.delay || 0;
                  const wBarWidth = Math.max(wDuration * pxPerMs, 20);
                  return (
                    <div
                      onMouseDown={(e) => handleBarMouseDown(e, el.id, 'move', wDelay, wDuration)}
                      style={{
                        position: 'absolute',
                        left: wDelay * pxPerMs,
                        width: wBarWidth,
                        top: 5,
                        height: 18,
                        backgroundColor: isSelected ? '#7C4DFF' : '#d1c4e9',
                        borderRadius: 3,
                        border: isSelected ? '1px solid #B388FF' : '1px solid #b0b0c0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        cursor: 'grab',
                        userSelect: 'none',
                      }}
                    >
                      {/* Left resize handle */}
                      <div
                        onMouseDown={(e) => handleBarMouseDown(e, el.id, 'resize-left', wDelay, wDuration)}
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          width: 6,
                          height: '100%',
                          cursor: 'ew-resize',
                          borderRadius: '3px 0 0 3px',
                        }}
                      />
                      <span style={{
                        fontSize: 9,
                        color: isSelected ? '#fff' : '#777',
                        whiteSpace: 'nowrap',
                        padding: '0 8px',
                        pointerEvents: 'none',
                      }}>
                        {wc.widgetName}
                      </span>
                      {/* Right resize handle */}
                      <div
                        onMouseDown={(e) => handleBarMouseDown(e, el.id, 'resize-right', wDelay, wDuration)}
                        style={{
                          position: 'absolute',
                          right: 0,
                          top: 0,
                          width: 6,
                          height: '100%',
                          cursor: 'ew-resize',
                          borderRadius: '0 3px 3px 0',
                        }}
                      />
                    </div>
                  );
                })()}

                {/* Keyframe diamonds */}
                {el.keyframes && el.keyframes.map((kf) => (
                  <div
                    key={`kf-${kf.time}`}
                    onMouseDown={(e) => handleKfMouseDown(e, el.id, kf.time)}
                    title={`Keyframe ${kf.time}ms (${Math.round(kf.x)}, ${Math.round(kf.y)})`}
                    style={{
                      position: 'absolute',
                      left: kf.time * pxPerMs - 5,
                      top: 9,
                      width: 10,
                      height: 10,
                      backgroundColor: '#FFC107',
                      border: '1px solid #FF9800',
                      transform: 'rotate(45deg)',
                      cursor: 'ew-resize',
                      zIndex: 5,
                    }}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
