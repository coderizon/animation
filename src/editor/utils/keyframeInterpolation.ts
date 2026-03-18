import { PositionKeyframe } from '../../types/project';

/**
 * Interpolates position between keyframes at a given time.
 * Returns null if no keyframes exist.
 */
export function getInterpolatedPosition(
  keyframes: PositionKeyframe[] | undefined,
  time: number,
): { x: number; y: number } | null {
  if (!keyframes || keyframes.length === 0) return null;

  // Single keyframe: always at that position
  if (keyframes.length === 1) {
    return { x: keyframes[0].x, y: keyframes[0].y };
  }

  // Before first keyframe
  if (time <= keyframes[0].time) {
    return { x: keyframes[0].x, y: keyframes[0].y };
  }

  // After last keyframe
  const last = keyframes[keyframes.length - 1];
  if (time >= last.time) {
    return { x: last.x, y: last.y };
  }

  // Find surrounding keyframes and linearly interpolate
  for (let i = 0; i < keyframes.length - 1; i++) {
    const a = keyframes[i];
    const b = keyframes[i + 1];
    if (time >= a.time && time <= b.time) {
      const t = (time - a.time) / (b.time - a.time);
      return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
      };
    }
  }

  return null;
}
