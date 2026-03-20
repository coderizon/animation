import React, { useState, useRef } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { TransitionDirection } from '../../types/project';
import { TRANSITION_META, TRANSITION_CATEGORIES } from '../../player/transitions';

const SCENE_THUMB_W = 120;
const SCENE_THUMB_H = 68;

export const SceneBar: React.FC = () => {
  const project = useProjectStore((s) => s.project);
  const switchScene = useProjectStore((s) => s.switchScene);
  const addScene = useProjectStore((s) => s.addScene);
  const deleteScene = useProjectStore((s) => s.deleteScene);
  const duplicateScene = useProjectStore((s) => s.duplicateScene);
  const renameScene = useProjectStore((s) => s.renameScene);
  const reorderScenes = useProjectStore((s) => s.reorderScenes);
  const setSceneTransition = useProjectStore((s) => s.setSceneTransition);
  const setSceneDuration = useProjectStore((s) => s.setSceneDuration);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; sceneId: string } | null>(null);
  const [transitionMenu, setTransitionMenu] = useState<{ x: number; y: number; sceneId: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragSource = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const scenes = project.scenes || [];
  const activeId = project.activeSceneId;

  const handleStartRename = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const handleFinishRename = () => {
    if (editingId && editName.trim()) {
      renameScene(editingId, editName.trim());
    }
    setEditingId(null);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        padding: '6px 10px',
        backgroundColor: 'var(--ae-bg-panel-muted)',
        borderTop: '1px solid var(--ae-border)',
        overflowX: 'auto',
        flexShrink: 0,
        minHeight: SCENE_THUMB_H + 36,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) { setContextMenu(null); setTransitionMenu(null); } }}
    >
      {scenes.map((scene, idx) => {
        const isActive = scene.id === activeId;
        const elCount = scene.elements.length;

        return (
          <React.Fragment key={scene.id}>
            {/* Transition indicator between scenes */}
            {idx > 0 && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setTransitionMenu({ x: e.clientX, y: e.clientY, sceneId: scene.id });
                  setContextMenu(null);
                }}
                title={scene.transition ? `${TRANSITION_META[scene.transition.type].label} (${scene.transition.duration}ms)` : 'Schnitt (kein Übergang)'}
                style={{
                  width: 28,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                  borderRadius: 4,
                  backgroundColor: scene.transition ? 'var(--ae-accent-overlay)' : 'transparent',
                  border: '1px solid var(--ae-border)',
                  fontSize: 11,
                  color: scene.transition ? 'var(--ae-accent)' : 'var(--ae-text-disabled)',
                }}
              >
                {scene.transition ? TRANSITION_META[scene.transition.type].icon : '|'}
              </div>
            )}

            {/* Scene thumbnail */}
            <div
              draggable
              onDragStart={() => { dragSource.current = idx; }}
              onDragOver={(e) => { e.preventDefault(); setDragOverIndex(idx); }}
              onDragLeave={() => setDragOverIndex(null)}
              onDrop={() => {
                if (dragSource.current !== null && dragSource.current !== idx) {
                  reorderScenes(dragSource.current, idx);
                }
                dragSource.current = null;
                setDragOverIndex(null);
              }}
              onDragEnd={() => { dragSource.current = null; setDragOverIndex(null); }}
              onClick={() => switchScene(scene.id)}
              onDoubleClick={() => handleStartRename(scene.id, scene.name)}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, sceneId: scene.id });
                setTransitionMenu(null);
              }}
              style={{
                width: SCENE_THUMB_W,
                flexShrink: 0,
                cursor: 'pointer',
                border: isActive
                  ? '2px solid var(--ae-accent)'
                  : dragOverIndex === idx
                  ? '2px solid var(--ae-accent-strong)'
                  : '2px solid transparent',
                borderRadius: 6,
                overflow: 'hidden',
                backgroundColor: 'var(--ae-bg-panel)',
                transition: 'border-color 0.15s',
              }}
            >
              {/* Mini preview area */}
              <div style={{
                width: SCENE_THUMB_W - 4,
                height: SCENE_THUMB_H,
                backgroundColor: project.canvas.backgroundColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {elCount === 0 ? (
                  <span style={{ fontSize: 9, color: 'var(--ae-text-disabled)' }}>Leer</span>
                ) : (
                  <span style={{ fontSize: 9, color: 'var(--ae-text-muted)' }}>
                    {elCount} El. {scene.duration ? `· ${scene.duration / 1000}s` : ''}
                  </span>
                )}
              </div>

              {/* Name */}
              <div style={{
                padding: '3px 6px',
                fontSize: 10,
                color: isActive ? 'var(--ae-text-primary)' : 'var(--ae-text-secondary)',
                fontWeight: isActive ? 700 : 400,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                textAlign: 'center',
                backgroundColor: isActive ? 'var(--ae-accent-overlay)' : 'transparent',
              }}>
                {editingId === scene.id ? (
                  <input
                    ref={inputRef}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={handleFinishRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleFinishRename();
                      if (e.key === 'Escape') setEditingId(null);
                      e.stopPropagation();
                    }}
                    style={{
                      width: '100%',
                      padding: 0,
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--ae-text-primary)',
                      fontSize: 10,
                      textAlign: 'center',
                      outline: 'none',
                    }}
                    autoFocus
                  />
                ) : (
                  scene.name
                )}
              </div>
            </div>
          </React.Fragment>
        );
      })}

      {/* Add scene button */}
      <div
        onClick={() => addScene()}
        title="Neue Szene hinzufügen"
        style={{
          width: 40,
          height: SCENE_THUMB_H + 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          borderRadius: 6,
          border: '2px dashed var(--ae-border)',
          color: 'var(--ae-text-muted)',
          fontSize: 20,
          flexShrink: 0,
          marginLeft: 6,
        }}
      >
        +
      </div>

      {/* Scene context menu */}
      {contextMenu && (() => {
        const scene = scenes.find(s => s.id === contextMenu.sceneId);
        if (!scene) return null;
        return (
          <div
            style={{
              position: 'fixed',
              top: contextMenu.y,
              left: contextMenu.x,
              backgroundColor: 'var(--ae-bg-panel)',
              border: '1px solid var(--ae-border)',
              borderRadius: 6,
              padding: '4px 0',
              minWidth: 180,
              zIndex: 100000,
              boxShadow: 'var(--ae-shadow-floating)',
            }}
          >
            <MenuItem label="Umbenennen" onClick={() => { handleStartRename(scene.id, scene.name); setContextMenu(null); }} />
            <MenuItem label="Duplizieren" onClick={() => { duplicateScene(scene.id); setContextMenu(null); }} />
            <div style={{ height: 1, backgroundColor: 'var(--ae-border)', margin: '4px 0' }} />
            {/* Scene duration */}
            <div style={{ padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--ae-text-secondary)', whiteSpace: 'nowrap' }}>Dauer:</span>
              <input
                type="number"
                min={0}
                step={1}
                placeholder="Auto"
                defaultValue={scene.duration ? scene.duration / 1000 : ''}
                onBlur={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!val || val <= 0) {
                    setSceneDuration(scene.id, undefined); // auto
                  } else {
                    setSceneDuration(scene.id, val * 1000);
                  }
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); e.stopPropagation(); }}
                style={{
                  width: 50,
                  padding: '3px 6px',
                  backgroundColor: 'var(--ae-bg-panel-muted)',
                  border: '1px solid var(--ae-border)',
                  borderRadius: 3,
                  color: 'var(--ae-text-primary)',
                  fontSize: 11,
                }}
              />
              <span style={{ fontSize: 10, color: 'var(--ae-text-muted)' }}>s (leer = auto)</span>
            </div>
            <div style={{ height: 1, backgroundColor: 'var(--ae-border)', margin: '4px 0' }} />
            <MenuItem label="Übergang einstellen" onClick={() => {
              setTransitionMenu({ x: contextMenu.x, y: contextMenu.y, sceneId: scene.id });
              setContextMenu(null);
            }} />
            <div style={{ height: 1, backgroundColor: 'var(--ae-border)', margin: '4px 0' }} />
            <MenuItem
              label="Löschen"
              color="var(--ae-danger)"
              disabled={scenes.length <= 1}
              onClick={() => { deleteScene(scene.id); setContextMenu(null); }}
            />
          </div>
        );
      })()}

      {/* Transition picker menu */}
      {transitionMenu && (() => {
        const scene = scenes.find(s => s.id === transitionMenu.sceneId);
        if (!scene) return null;
        const idx = scenes.findIndex(s => s.id === transitionMenu.sceneId);
        if (idx === 0) return null;

        const currentType = scene.transition?.type;
        const meta = currentType ? TRANSITION_META[currentType] : null;

        return (
          <div
            style={{
              position: 'fixed',
              top: transitionMenu.y,
              left: transitionMenu.x,
              backgroundColor: 'var(--ae-bg-panel)',
              border: '1px solid var(--ae-border)',
              borderRadius: 8,
              padding: '4px 0',
              minWidth: 220,
              maxHeight: 420,
              overflowY: 'auto',
              zIndex: 100000,
              boxShadow: 'var(--ae-shadow-floating)',
            }}
          >
            <div style={{ padding: '6px 14px', fontSize: 11, color: 'var(--ae-text-muted)', fontWeight: 600 }}>
              Übergang zu &ldquo;{scene.name}&rdquo;
            </div>
            {TRANSITION_CATEGORIES.map((cat) => (
              <React.Fragment key={cat.key}>
                <div style={{ padding: '6px 14px 2px', fontSize: 9, color: 'var(--ae-text-disabled)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {cat.label}
                </div>
                {cat.types.map((type) => {
                  const tm = TRANSITION_META[type];
                  const isActive = type === 'cut' ? !scene.transition : currentType === type;
                  return (
                    <MenuItem
                      key={type}
                      label={`${tm.icon}  ${tm.label}${type === 'morph' ? ' (nach Name)' : ''}`}
                      color={isActive ? 'var(--ae-accent)' : undefined}
                      onClick={() => {
                        if (type === 'cut') {
                          setSceneTransition(scene.id, undefined);
                        } else {
                          setSceneTransition(scene.id, {
                            type,
                            duration: tm.defaultDuration,
                            direction: tm.hasDirection ? (scene.transition?.direction || 'left') : undefined,
                          });
                        }
                        if (!tm.hasDirection) setTransitionMenu(null);
                      }}
                    />
                  );
                })}
              </React.Fragment>
            ))}
            {/* Direction picker for directional transitions */}
            {scene.transition && meta?.hasDirection && (
              <>
                <div style={{ height: 1, backgroundColor: 'var(--ae-border)', margin: '4px 0' }} />
                <div style={{ padding: '6px 14px', fontSize: 11, color: 'var(--ae-text-secondary)', fontWeight: 600 }}>Richtung</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, padding: '2px 14px 6px' }}>
                  {(['left', 'right', 'up', 'down'] as TransitionDirection[]).map((dir) => {
                    const isActive = (scene.transition?.direction || 'left') === dir;
                    const arrows: Record<TransitionDirection, string> = { left: '←', right: '→', up: '↑', down: '↓' };
                    return (
                      <button
                        key={dir}
                        onClick={() => {
                          setSceneTransition(scene.id, { ...scene.transition!, direction: dir });
                        }}
                        style={{
                          padding: '4px 0',
                          fontSize: 14,
                          backgroundColor: isActive ? 'var(--ae-accent)' : 'var(--ae-bg-panel-muted)',
                          color: isActive ? 'var(--ae-gray-900)' : 'var(--ae-text-secondary)',
                          border: `1px solid ${isActive ? 'var(--ae-accent)' : 'var(--ae-border)'}`,
                          borderRadius: 4,
                          cursor: 'pointer',
                        }}
                      >
                        {arrows[dir]}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            {/* Duration control */}
            {scene.transition && scene.transition.type !== 'cut' && (
              <>
                <div style={{ height: 1, backgroundColor: 'var(--ae-border)', margin: '4px 0' }} />
                <div style={{ padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--ae-text-secondary)' }}>Dauer:</span>
                  <input
                    type="number"
                    min={100}
                    max={3000}
                    step={100}
                    defaultValue={scene.transition.duration}
                    onBlur={(e) => {
                      const ms = Math.max(100, Math.min(3000, parseInt(e.target.value) || 500));
                      setSceneTransition(scene.id, { ...scene.transition!, duration: ms });
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); e.stopPropagation(); }}
                    style={{
                      width: 60,
                      padding: '3px 6px',
                      backgroundColor: 'var(--ae-bg-panel-muted)',
                      border: '1px solid var(--ae-border)',
                      borderRadius: 3,
                      color: 'var(--ae-text-primary)',
                      fontSize: 11,
                    }}
                  />
                  <span style={{ fontSize: 10, color: 'var(--ae-text-muted)' }}>ms</span>
                </div>
              </>
            )}
          </div>
        );
      })()}
    </div>
  );
};

// Simple menu item helper
const MenuItem: React.FC<{
  label: string;
  onClick: () => void;
  color?: string;
  disabled?: boolean;
}> = ({ label, onClick, color, disabled }) => (
  <div
    onClick={disabled ? undefined : onClick}
    style={{
      padding: '8px 14px',
      fontSize: 12,
      color: disabled ? 'var(--ae-text-disabled)' : color || 'var(--ae-text-primary)',
      cursor: disabled ? 'default' : 'pointer',
      userSelect: 'none',
      opacity: disabled ? 0.5 : 1,
    }}
    onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--ae-bg-panel-raised)'; }}
    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent'; }}
  >
    {label}
  </div>
);
