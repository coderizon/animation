import { Keyframe } from '../../types/project';

export interface InterpolatedProps {
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  color?: string;
  fontSize?: number;
}

/**
 * Linearly interpolate a numeric value.
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Parse a hex color (#rgb or #rrggbb) into [r, g, b].
 */
function hexToRgb(hex: string): [number, number, number] | null {
  const h = hex.replace('#', '');
  if (h.length === 3) {
    return [
      parseInt(h[0] + h[0], 16),
      parseInt(h[1] + h[1], 16),
      parseInt(h[2] + h[2], 16),
    ];
  }
  if (h.length === 6) {
    return [
      parseInt(h.substring(0, 2), 16),
      parseInt(h.substring(2, 4), 16),
      parseInt(h.substring(4, 6), 16),
    ];
  }
  return null;
}

/**
 * Convert [r, g, b] back to #rrggbb hex string.
 */
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Linearly interpolate between two hex colors.
 */
function lerpColor(a: string, b: string, t: number): string {
  const rgbA = hexToRgb(a);
  const rgbB = hexToRgb(b);
  if (!rgbA || !rgbB) return t < 0.5 ? a : b;
  return rgbToHex(
    lerp(rgbA[0], rgbB[0], t),
    lerp(rgbA[1], rgbB[1], t),
    lerp(rgbA[2], rgbB[2], t),
  );
}

/**
 * Interpolate an optional numeric field if present in both keyframes.
 */
function lerpOptional(aVal: number | undefined, bVal: number | undefined, t: number): number | undefined {
  if (aVal !== undefined && bVal !== undefined) return lerp(aVal, bVal, t);
  return undefined;
}

/**
 * Interpolate an optional color field if present in both keyframes.
 */
function lerpColorOptional(aVal: string | undefined, bVal: string | undefined, t: number): string | undefined {
  if (aVal !== undefined && bVal !== undefined) return lerpColor(aVal, bVal, t);
  return undefined;
}

/**
 * Build InterpolatedProps from a single keyframe (no interpolation needed).
 */
function propsFromKeyframe(kf: Keyframe): InterpolatedProps {
  return {
    x: kf.x,
    y: kf.y,
    width: kf.width,
    height: kf.height,
    rotation: kf.rotation,
    fill: kf.fill,
    stroke: kf.stroke,
    strokeWidth: kf.strokeWidth,
    color: kf.color,
    fontSize: kf.fontSize,
  };
}

/**
 * Interpolate between two keyframes at factor t (0..1).
 */
function interpolateBetween(a: Keyframe, b: Keyframe, t: number): InterpolatedProps {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    width: lerpOptional(a.width, b.width, t),
    height: lerpOptional(a.height, b.height, t),
    rotation: lerpOptional(a.rotation, b.rotation, t),
    fill: lerpColorOptional(a.fill, b.fill, t),
    stroke: lerpColorOptional(a.stroke, b.stroke, t),
    strokeWidth: lerpOptional(a.strokeWidth, b.strokeWidth, t),
    color: lerpColorOptional(a.color, b.color, t),
    fontSize: lerpOptional(a.fontSize, b.fontSize, t),
  };
}

/**
 * Interpolates all properties between keyframes at a given time.
 * Returns null if no keyframes exist.
 */
export function getInterpolatedProperties(
  keyframes: Keyframe[] | undefined,
  time: number,
): InterpolatedProps | null {
  if (!keyframes || keyframes.length === 0) return null;

  if (keyframes.length === 1) {
    return propsFromKeyframe(keyframes[0]);
  }

  // Before first keyframe
  if (time <= keyframes[0].time) {
    return propsFromKeyframe(keyframes[0]);
  }

  // After last keyframe
  const last = keyframes[keyframes.length - 1];
  if (time >= last.time) {
    return propsFromKeyframe(last);
  }

  // Find surrounding keyframes and interpolate
  for (let i = 0; i < keyframes.length - 1; i++) {
    const a = keyframes[i];
    const b = keyframes[i + 1];
    if (time >= a.time && time <= b.time) {
      const t = (time - a.time) / (b.time - a.time);
      return interpolateBetween(a, b, t);
    }
  }

  return null;
}

/**
 * Legacy wrapper: returns only position { x, y } or null.
 */
export function getInterpolatedPosition(
  keyframes: Keyframe[] | undefined,
  time: number,
): { x: number; y: number } | null {
  const props = getInterpolatedProperties(keyframes, time);
  if (!props) return null;
  return { x: props.x, y: props.y };
}
