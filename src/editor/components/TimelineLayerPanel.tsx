import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVideo } from '@fortawesome/free-solid-svg-icons';
import { CanvasElement, CameraKeyframe } from '../../types/project';
import {
  TL_BORDER,
  TL_ROW_BORDER,
  TL_BG_MUTED,
  TL_TEXT,
  TL_TEXT_MUTED,
  TL_TEXT_DISABLED,
  TL_ACCENT,
  TL_ACCENT_STRONG,
} from './TimelineConstants';

export interface TimelineLayerPanelProps {
  elements: CanvasElement[];
  selectedElementIds: string[];
  cameraKeyframes: CameraKeyframe[] | undefined;
  editingId: string | null;
  editName: string;
  dragOverIndex: number | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  getElementDisplayName: (el: CanvasElement) => string;
  onRowClick: (id: string, e: React.MouseEvent) => void;
  onContextMenu: (id: string, e: React.MouseEvent) => void;
  onDragStart: (reversedIndex: number) => void;
  onDragOver: (e: React.DragEvent, reversedIndex: number) => void;
  onDrop: (reversedIndex: number) => void;
  onDragEnd: () => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onStartRename: (id: string, currentName: string) => void;
  onFinishRename: () => void;
  onCancelRename: () => void;
  onEditNameChange: (value: string) => void;
}

export const TimelineLayerPanel = React.memo<TimelineLayerPanelProps>(({
  elements,
  selectedElementIds,
  cameraKeyframes,
  editingId,
  editName,
  dragOverIndex,
  inputRef,
  getElementDisplayName,
  onRowClick,
  onContextMenu,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onToggleVisibility,
  onToggleLock,
  onStartRename,
  onFinishRename,
  onCancelRename,
  onEditNameChange,
}) => {
  return (
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
      {(cameraKeyframes && cameraKeyframes.length > 0) && (
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
            onDragStart={() => onDragStart(reversedIndex)}
            onDragOver={(e) => onDragOver(e, reversedIndex)}
            onDrop={() => onDrop(reversedIndex)}
            onDragEnd={onDragEnd}
            onClick={(e) => onRowClick(el.id, e)}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onContextMenu(el.id, e);
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
              onClick={(e) => { e.stopPropagation(); onToggleVisibility(el.id); }}
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
              onClick={(e) => { e.stopPropagation(); onToggleLock(el.id); }}
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
                onChange={(e) => onEditNameChange(e.target.value)}
                onBlur={onFinishRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onFinishRename();
                  if (e.key === 'Escape') onCancelRename();
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
                  onStartRename(el.id, getElementDisplayName(el));
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
  );
});

TimelineLayerPanel.displayName = 'TimelineLayerPanel';
