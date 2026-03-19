import { useMemo } from 'react';

interface RulerProps {
  orientation: 'horizontal' | 'vertical';
  zoom: number;
  panOffset: number; // panOffset.x for horizontal, panOffset.y for vertical
  length: number;    // container width/height in px
  canvasSize: number; // canvas width/height in px
}

const RULER_SIZE = 20; // thickness in px

export const Ruler: React.FC<RulerProps> = ({ orientation, zoom, panOffset, length, canvasSize }) => {
  const isH = orientation === 'horizontal';

  // Determine tick interval based on zoom
  const tickInterval = useMemo(() => {
    const pixelsPerUnit = zoom;
    if (pixelsPerUnit >= 2) return 25;
    if (pixelsPerUnit >= 1) return 50;
    if (pixelsPerUnit >= 0.5) return 100;
    if (pixelsPerUnit >= 0.25) return 200;
    return 400;
  }, [zoom]);

  // Generate tick marks
  const ticks = useMemo(() => {
    const result: { pos: number; label: string; major: boolean }[] = [];

    // Range of canvas coordinates visible in the viewport
    const startCanvas = -panOffset / zoom;
    const endCanvas = (length - panOffset) / zoom;

    // Add some padding
    const start = Math.floor(startCanvas / tickInterval) * tickInterval;
    const end = Math.ceil(endCanvas / tickInterval) * tickInterval;

    for (let canvasCoord = start; canvasCoord <= end; canvasCoord += tickInterval) {
      const screenPos = canvasCoord * zoom + panOffset;
      if (screenPos < -50 || screenPos > length + 50) continue;

      const major = canvasCoord % (tickInterval * 2) === 0 || tickInterval >= 200;
      result.push({
        pos: screenPos,
        label: major ? `${canvasCoord}` : '',
        major,
      });
    }

    // Canvas boundary markers
    const canvasStart = 0 * zoom + panOffset;
    const canvasEnd = canvasSize * zoom + panOffset;

    if (canvasStart >= -10 && canvasStart <= length + 10) {
      result.push({ pos: canvasStart, label: '0', major: true });
    }
    if (canvasEnd >= -10 && canvasEnd <= length + 10) {
      result.push({ pos: canvasEnd, label: `${canvasSize}`, major: true });
    }

    return result;
  }, [zoom, panOffset, length, tickInterval, canvasSize]);

  return (
    <div
      style={{
        position: 'relative',
        width: isH ? '100%' : RULER_SIZE,
        height: isH ? RULER_SIZE : '100%',
        backgroundColor: 'var(--ae-bg-panel-muted)',
        borderBottom: isH ? '1px solid var(--ae-border)' : 'none',
        borderRight: isH ? 'none' : '1px solid var(--ae-border)',
        overflow: 'hidden',
        userSelect: 'none',
        fontSize: 9,
        fontFamily: 'monospace',
        color: 'var(--ae-text-muted)',
        flexShrink: 0,
      }}
    >
      {ticks.map((tick, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            ...(isH
              ? { left: tick.pos, top: 0, height: '100%', width: 0 }
              : { top: tick.pos, left: 0, width: '100%', height: 0 }),
          }}
        >
          {/* Tick line */}
          <div
            style={{
              position: 'absolute',
              backgroundColor: tick.major ? 'var(--ae-text-muted)' : 'var(--ae-gray-400)',
              ...(isH
                ? { left: 0, bottom: 0, width: 1, height: tick.major ? 8 : 5 }
                : { top: 0, right: 0, height: 1, width: tick.major ? 8 : 5 }),
            }}
          />

          {/* Label */}
          {tick.label && (
            <span
              style={{
                position: 'absolute',
                ...(isH
                  ? { left: 3, top: 1, whiteSpace: 'nowrap' }
                  : {
                      top: 3,
                      left: 1,
                      writingMode: 'vertical-rl',
                      textOrientation: 'mixed',
                      whiteSpace: 'nowrap',
                      transform: 'rotate(180deg)',
                    }),
              }}
            >
              {tick.label}
            </span>
          )}
        </div>
      ))}
    </div>
  );
};
