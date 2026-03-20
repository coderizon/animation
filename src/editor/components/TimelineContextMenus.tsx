import React from 'react';
import ReactDOM from 'react-dom';
import { CanvasElement, CameraKeyframe } from '../../types/project';
import { useProjectStore } from '../../store/useProjectStore';
import { TL_TEXT, TL_TEXT_DISABLED } from './TimelineConstants';

export interface KfContextMenuState {
  x: number;
  y: number;
  elementId: string;
  time: number;
}

export interface CamKfContextMenuState {
  x: number;
  y: number;
  time: number;
}

export interface LayerContextMenuState {
  x: number;
  y: number;
  elementId: string;
}

export interface TimelineContextMenusProps {
  kfContextMenu: KfContextMenuState | null;
  camKfContextMenu: CamKfContextMenuState | null;
  layerContextMenu: LayerContextMenuState | null;
  kfMenuRef: React.RefObject<HTMLDivElement | null>;
  camKfMenuRef: React.RefObject<HTMLDivElement | null>;
  layerMenuRef: React.RefObject<HTMLDivElement | null>;
  projectElements: CanvasElement[];
  onSetKfContextMenu: (state: KfContextMenuState | null) => void;
  onSetCamKfContextMenu: (state: CamKfContextMenuState | null) => void;
  onSetLayerContextMenu: (state: LayerContextMenuState | null) => void;
  addKeyframe: (elementId: string, kf: any) => void;
  removeKeyframe: (elementId: string, time: number) => void;
  addCameraKeyframe: (kf: CameraKeyframe) => void;
  removeCameraKeyframe: (time: number) => void;
  reorderElements: (from: number, to: number) => void;
  selectElements: (ids: string[]) => void;
  setCurrentTime: (time: number) => void;
  setSelectedKeyframes: (keys: Set<string>) => void;
}

/** Helper to build a keyframe selection key */
const kfKey = (elementId: string, time: number) => `${elementId}:${time}`;

export const TimelineContextMenus = React.memo<TimelineContextMenusProps>(({
  kfContextMenu,
  camKfContextMenu,
  layerContextMenu,
  kfMenuRef,
  camKfMenuRef,
  layerMenuRef,
  projectElements,
  onSetKfContextMenu,
  onSetCamKfContextMenu,
  onSetLayerContextMenu,
  addKeyframe,
  removeKeyframe,
  addCameraKeyframe,
  removeCameraKeyframe,
  reorderElements,
  selectElements,
  setCurrentTime,
  setSelectedKeyframes,
}) => {
  return (
    <>
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
          {/* Select all keyframes at this time (column select) */}
          {(() => {
            const time = kfContextMenu.time;
            const allAtTime = projectElements.flatMap((el) =>
              (el.keyframes || []).filter((k) => k.time === time).map((k) => kfKey(el.id, k.time))
            );
            if (allAtTime.length > 1) {
              return (
                <>
                  <div
                    onClick={() => {
                      setSelectedKeyframes(new Set(allAtTime));
                      const elIds = [...new Set(allAtTime.map((k) => k.split(':')[0]))];
                      selectElements(elIds);
                      setCurrentTime(time);
                      onSetKfContextMenu(null);
                    }}
                    style={{
                      padding: '8px 16px',
                      color: 'var(--ae-accent-strong)',
                      fontSize: 13,
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--ae-bg-panel-raised)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent'; }}
                  >
                    Alle Keyframes bei {time}ms auswählen ({allAtTime.length})
                  </div>
                  <div style={{ height: 1, backgroundColor: 'var(--ae-border)', margin: '4px 0' }} />
                </>
              );
            }
            return null;
          })()}

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
                  onSetKfContextMenu(null);
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
                  onSetKfContextMenu(null);
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
              onSetKfContextMenu(null);
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
                  onSetCamKfContextMenu(null);
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
                  onSetCamKfContextMenu(null);
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
              onSetCamKfContextMenu(null);
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
            const realIndex = projectElements.findIndex((el) => el.id === layerContextMenu.elementId);
            const lastIndex = projectElements.length - 1;
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
                    onSetLayerContextMenu(null);
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
    </>
  );
});

TimelineContextMenus.displayName = 'TimelineContextMenus';
