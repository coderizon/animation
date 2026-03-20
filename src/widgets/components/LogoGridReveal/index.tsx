import React, { useMemo } from 'react';
import type { WidgetComponentProps, WidgetRegistryEntry } from '../../types';
import { faTableCellsLarge } from '@fortawesome/free-solid-svg-icons';

/**
 * Attempt a smoothstep-style easeOut: t' = t*(2-t)
 */
function easeOut(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * (2 - c);
}

/**
 * Generate a deterministic "random" order for n items using a simple
 * seeded shuffle (Fisher-Yates with a basic LCG seeded on count).
 */
function seededShuffle(n: number): number[] {
  const indices = Array.from({ length: n }, (_, i) => i);
  // Simple LCG seeded on n so it's deterministic per logo count
  let seed = n * 2654435761; // Knuth multiplicative hash
  const nextRand = () => {
    seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(nextRand() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

/**
 * Generate a spiral order for a rows x cols grid (outside-in snake).
 * Returns an array where result[linearIndex] = appearance order.
 */
function spiralOrder(rows: number, cols: number, total: number): number[] {
  const order = new Array<number>(rows * cols).fill(-1);
  let top = 0, bottom = rows - 1, left = 0, right = cols - 1;
  let seq = 0;

  while (top <= bottom && left <= right) {
    // Top row left to right
    for (let c = left; c <= right && seq < total; c++) {
      order[top * cols + c] = seq++;
    }
    top++;
    // Right column top to bottom
    for (let r = top; r <= bottom && seq < total; r++) {
      order[r * cols + right] = seq++;
    }
    right--;
    // Bottom row right to left
    for (let c = right; c >= left && seq < total; c--) {
      order[bottom * cols + c] = seq++;
    }
    bottom--;
    // Left column bottom to top
    for (let r = bottom; r >= top && seq < total; r--) {
      order[r * cols + left] = seq++;
    }
    left++;
  }

  return order;
}

const LogoGridReveal: React.FC<WidgetComponentProps> = ({
  frame,
  fps,
  width,
  height,
  props,
}) => {
  const logos: string[] = (props?.logos as string[]) || [];
  const columns = (props?.columns as number) || 3;
  const revealOrder = (props?.revealOrder as string) || 'leftToRight';
  const staggerDelay = (props?.staggerDelay as number) || 0.2;
  const holdDuration = (props?.holdDuration as number) || 2;
  const exitDuration = (props?.exitDuration as number) || 0.5;
  const logoScale = (props?.logoScale as number) || 0.8;

  const count = logos.length;
  const rows = Math.ceil(count / columns);

  // Precompute reveal order mapping: orderMap[logoIndex] = appearance sequence number
  const orderMap = useMemo(() => {
    if (count === 0) return [];
    if (revealOrder === 'spiral') {
      const spiral = spiralOrder(rows, columns, count);
      // spiral[linearIndex] = sequence number, only keep first `count` cells
      return spiral.slice(0, count);
    }
    if (revealOrder === 'random') {
      return seededShuffle(count);
    }
    // leftToRight: natural order
    return Array.from({ length: count }, (_, i) => i);
  }, [count, columns, rows, revealOrder]);

  if (count === 0) {
    return (
      <div style={{
        width, height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#666',
        fontSize: 14,
        fontFamily: 'sans-serif',
      }}>
        Keine Logos ausgewählt
      </div>
    );
  }

  // Timing in frames
  const entranceDurationSec = 0.3; // each logo's pop-in takes 0.3s
  const entranceFrames = Math.round(entranceDurationSec * fps);
  const staggerFrames = Math.round(staggerDelay * fps);
  const holdFrames = Math.round(holdDuration * fps);
  const exitFrames = Math.round(exitDuration * fps);

  // Total reveal time = last logo starts at (count-1)*stagger + entrance duration
  const totalRevealFrames = (count - 1) * staggerFrames + entranceFrames;
  const totalCycleFrames = totalRevealFrames + holdFrames + exitFrames;

  const loopFrame = totalCycleFrames > 0 ? frame % totalCycleFrames : 0;

  // Grid sizing
  const cellWidth = width / columns;
  const cellHeight = height / rows;
  const padding = Math.min(cellWidth, cellHeight) * 0.1;

  return (
    <div style={{
      width,
      height,
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gridTemplateRows: `repeat(${rows}, 1fr)`,
      overflow: 'hidden',
    }}>
      {logos.map((logoSrc, i) => {
        const seq = orderMap[i]; // this logo's appearance sequence number
        const logoStartFrame = seq * staggerFrames;

        let scale = 0;
        let opacity = 0;

        if (loopFrame < totalRevealFrames + holdFrames) {
          // Phase 1+2: Reveal + Hold
          const localFrame = loopFrame - logoStartFrame;
          if (localFrame < 0) {
            // Not yet started
            scale = 0;
            opacity = 0;
          } else if (localFrame < entranceFrames) {
            // Entrance: scale 0 -> 1.1 -> 1, opacity 0 -> 1
            const t = easeOut(localFrame / entranceFrames);
            opacity = t;
            // Overshoot: go to 1.1 at ~70% then settle to 1.0
            if (t < 0.7) {
              scale = (t / 0.7) * 1.1;
            } else {
              // 1.1 -> 1.0 over remaining 30%
              const t2 = (t - 0.7) / 0.3;
              scale = 1.1 - 0.1 * t2;
            }
          } else {
            // Fully visible (hold)
            scale = 1;
            opacity = 1;
          }
        } else {
          // Phase 3: Exit — all logos shrink out simultaneously
          const exitLocalFrame = loopFrame - totalRevealFrames - holdFrames;
          const t = easeOut(exitLocalFrame / exitFrames);
          scale = 1 - t;
          opacity = 1 - t;
        }

        return (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding,
            }}
          >
            <img
              src={logoSrc}
              alt=""
              style={{
                width: (cellWidth - padding * 2) * logoScale,
                height: (cellHeight - padding * 2) * logoScale,
                objectFit: 'contain',
                transform: `scale(${scale})`,
                opacity,
                transition: 'none',
                pointerEvents: 'none',
                userSelect: 'none',
              }}
              draggable={false}
            />
          </div>
        );
      })}
    </div>
  );
};

export const logoGridRevealWidget: WidgetRegistryEntry = {
  name: 'logoGridReveal',
  displayName: 'Logo-Grid',
  description: 'Logos erscheinen nacheinander in einem animierten Raster',
  icon: faTableCellsLarge,
  component: LogoGridReveal,
  nativeWidth: 600,
  nativeHeight: 400,
  defaultFps: 30,
  defaultDurationInFrames: 300,
  defaultElementWidth: 500,
  defaultElementHeight: 350,
};
