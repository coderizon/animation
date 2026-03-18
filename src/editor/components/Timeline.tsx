import { useState, useRef, useCallback } from 'react';
import { useProjectStore } from '../../store/useProjectStore';

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
  const stopAllAnimations = useProjectStore((state) => state.stopAllAnimations);
  const isPlayingAll = useProjectStore((state) => state.isPlayingAll);
  const currentTime = useProjectStore((state) => state.currentTime);
  const setCurrentTime = useProjectStore((state) => state.setCurrentTime);

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

  // Reverse order: highest layer first
  const elements = [...project.elements].reverse();

  // Timeline calculations
  const animatedElements = project.elements.filter((el) => el.animation && el.animation.preset !== 'none');
  const maxTime = Math.max(
    3000,
    ...project.elements.map((el) =>
      el.animation && el.animation.preset !== 'none'
        ? (el.animation.delay || 0) + (el.animation.duration || 600)
        : 0
    )
  );
  const timelineWidth = 600;
  const pxPerMs = timelineWidth / maxTime;

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
      height: 200,
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
            onClick={isPlayingAll ? stopAllAnimations : playAllAnimations}
            style={{
              padding: '4px 12px',
              backgroundColor: isPlayingAll ? '#4CAF50' : 'transparent',
              color: isPlayingAll ? '#fff' : '#666',
              border: '1px solid #e0e0e8',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {isPlayingAll ? 'Stop' : 'Play All'}
          </button>
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
              cursor: 'pointer',
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
                onClick={(e) => handleRowClick(el.id, e)}
                style={{
                  height: 28,
                  position: 'relative',
                  minWidth: timelineWidth,
                  borderBottom: '1px solid #e8e8ef',
                  cursor: 'pointer',
                  backgroundColor: isSelected ? 'rgba(33, 150, 243, 0.05)' : 'transparent',
                  flexShrink: 0,
                }}
              >
                {hasAnimation && (() => {
                  const delay = el.animation!.delay || 0;
                  const duration = el.animation!.duration || 600;
                  return (
                    <div style={{
                      position: 'absolute',
                      left: delay * pxPerMs,
                      width: Math.max(duration * pxPerMs, 4),
                      top: 5,
                      height: 18,
                      backgroundColor: isSelected ? '#2196F3' : '#b8c0d8',
                      borderRadius: 3,
                      border: isSelected ? '1px solid #64B5F6' : '1px solid #b0b0c0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}>
                      <span style={{
                        fontSize: 9,
                        color: isSelected ? '#fff' : '#777',
                        whiteSpace: 'nowrap',
                        padding: '0 4px',
                      }}>
                        {el.animation!.preset}
                      </span>
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
