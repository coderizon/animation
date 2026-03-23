import React from 'react';
import { CanvasElement, CameraKeyframe, WidgetContent, getAnimations } from '../../types/project';
import {
  TL_BORDER,
  TL_ROW_BORDER,
  TL_BG_MUTED,
  TL_BG_RAISED,
  TL_TEXT,
  TL_TEXT_SECONDARY,
  TL_TEXT_MUTED,
  TL_ACCENT,
  TL_ACCENT_STRONG,
} from './TimelineConstants';

export interface TimelineTrackAreaProps {
  tracksRef: React.RefObject<HTMLDivElement | null>;
  elements: CanvasElement[];
  selectedElementIds: string[];
  cameraKeyframes: CameraKeyframe[] | undefined;
  currentTime: number;
  pxPerMs: number;
  timelineWidth: number;
  markers: number[];
  selectedKeyframes: Set<string>;
  onWheel: (e: React.WheelEvent) => void;
  onScrubStart: (e: React.MouseEvent) => void;
  onTrackClick: (id: string, e: React.MouseEvent) => void;
  onBarMouseDown: (
    e: React.MouseEvent,
    elementId: string,
    type: 'move' | 'resize-left' | 'resize-right',
    delay: number,
    duration: number,
    animIndex: number,
  ) => void;
  onKfMouseDown: (e: React.MouseEvent, elementId: string, time: number) => void;
  onKfContextMenu: (elementId: string, time: number, e: React.MouseEvent) => void;
  onCamKfMouseDown: (e: React.MouseEvent, time: number) => void;
  onCamKfContextMenu: (time: number, e: React.MouseEvent) => void;
}

/** Helper to build a keyframe selection key */
const kfKey = (elementId: string, time: number) => `${elementId}:${time}`;

export const TimelineTrackArea = React.memo<TimelineTrackAreaProps>(({
  tracksRef,
  elements,
  selectedElementIds,
  cameraKeyframes,
  currentTime,
  pxPerMs,
  timelineWidth,
  markers,
  selectedKeyframes,
  onWheel,
  onScrubStart,
  onTrackClick,
  onBarMouseDown,
  onKfMouseDown,
  onKfContextMenu,
  onCamKfMouseDown,
  onCamKfContextMenu,
}) => {
  return (
    <div
      ref={tracksRef}
      onWheel={onWheel}
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
        onMouseDown={onScrubStart}
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
      {(cameraKeyframes && cameraKeyframes.length > 0) && (
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
          {cameraKeyframes.map((kf) => (
            <div
              key={`cam-kf-${kf.time}`}
              onMouseDown={(e) => {
                e.stopPropagation();
                onCamKfMouseDown(e, kf.time);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCamKfContextMenu(kf.time, e);
              }}
              title={`Kamera ${kf.time}ms (x:${Math.round(kf.x)}, y:${Math.round(kf.y)}, zX:${kf.zoomX.toFixed(1)}, zY:${kf.zoomY.toFixed(1)})`}
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
            onClick={(e) => onTrackClick(el.id, e)}
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
            {/* Animation bars (one per animation -- skip 'none' for widgets, widget bar handles that) */}
            {anims.map((anim, animIdx) => {
              // Widget 'none' animations are shown via the widget bar instead
              if (el.content.type === 'widget' && anim.preset === 'none') return null;
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
                  onMouseDown={(e) => onBarMouseDown(e, el.id, 'move', delay, duration, animIdx)}
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
                    onMouseDown={(e) => onBarMouseDown(e, el.id, 'resize-left', delay, duration, animIdx)}
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
                    onMouseDown={(e) => onBarMouseDown(e, el.id, 'resize-right', delay, duration, animIdx)}
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

            {/* Widget duration bar -- always visible for widgets */}
            {el.content.type === 'widget' && (() => {
              const wc = el.content as WidgetContent;
              const wDuration = (wc.durationInFrames / wc.fps) * 1000;
              const firstAnim = anims.length > 0 ? anims[0] : null;
              const wDelay = firstAnim ? (firstAnim.delay || 0) : 0;
              const wBarWidth = Math.max(wDuration * pxPerMs, 20);
              return (
                <div
                  onMouseDown={(e) => onBarMouseDown(e, el.id, 'move', wDelay, wDuration, 0)}
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
                    zIndex: 2,
                  }}
                >
                  <div
                    onMouseDown={(e) => onBarMouseDown(e, el.id, 'resize-left', wDelay, wDuration, 0)}
                    style={{ position: 'absolute', left: 0, top: 0, width: 6, height: '100%', cursor: 'ew-resize', borderRadius: '3px 0 0 3px' }}
                  />
                  <span style={{
                    fontSize: 9,
                    color: isSelected ? TL_TEXT : 'var(--ae-gray-50)',
                    whiteSpace: 'nowrap',
                    padding: '0 8px',
                    pointerEvents: 'none',
                  }}>
                    {wc.widgetName} ({(wDuration / 1000).toFixed(1)}s)
                  </span>
                  <div
                    onMouseDown={(e) => onBarMouseDown(e, el.id, 'resize-right', wDelay, wDuration, 0)}
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
                  onMouseDown={(e) => onKfMouseDown(e, el.id, kf.time)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onKfContextMenu(el.id, kf.time, e);
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
  );
});

TimelineTrackArea.displayName = 'TimelineTrackArea';
