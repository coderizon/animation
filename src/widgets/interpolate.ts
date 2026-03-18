// Remotion-compatible interpolate() and Easing utilities
// Zero external dependencies

type ExtrapolationType = 'clamp' | 'extend' | 'identity';

interface InterpolateOptions {
  extrapolateLeft?: ExtrapolationType;
  extrapolateRight?: ExtrapolationType;
  easing?: (t: number) => number;
}

export function interpolate(
  input: number,
  inputRange: readonly number[],
  outputRange: readonly number[],
  options?: InterpolateOptions,
): number {
  if (inputRange.length !== outputRange.length) {
    throw new Error('inputRange and outputRange must have the same length');
  }
  if (inputRange.length < 2) {
    throw new Error('inputRange must have at least 2 values');
  }

  const extrapolateLeft = options?.extrapolateLeft ?? 'extend';
  const extrapolateRight = options?.extrapolateRight ?? 'extend';
  const easing = options?.easing;

  // Handle values below the range
  if (input < inputRange[0]) {
    switch (extrapolateLeft) {
      case 'clamp':
        return outputRange[0];
      case 'identity':
        return input;
      case 'extend':
      default: {
        const slope = (outputRange[1] - outputRange[0]) / (inputRange[1] - inputRange[0]);
        return outputRange[0] + slope * (input - inputRange[0]);
      }
    }
  }

  // Handle values above the range
  const lastIdx = inputRange.length - 1;
  if (input > inputRange[lastIdx]) {
    switch (extrapolateRight) {
      case 'clamp':
        return outputRange[lastIdx];
      case 'identity':
        return input;
      case 'extend':
      default: {
        const slope =
          (outputRange[lastIdx] - outputRange[lastIdx - 1]) /
          (inputRange[lastIdx] - inputRange[lastIdx - 1]);
        return outputRange[lastIdx] + slope * (input - inputRange[lastIdx]);
      }
    }
  }

  // Find the segment
  let segIdx = 0;
  for (let i = 1; i < inputRange.length; i++) {
    if (input <= inputRange[i]) {
      segIdx = i - 1;
      break;
    }
  }

  const inMin = inputRange[segIdx];
  const inMax = inputRange[segIdx + 1];
  const outMin = outputRange[segIdx];
  const outMax = outputRange[segIdx + 1];

  // Normalized progress within the segment (0..1)
  let t = inMax === inMin ? 0 : (input - inMin) / (inMax - inMin);

  // Apply easing if provided
  if (easing) {
    t = easing(t);
  }

  return outMin + (outMax - outMin) * t;
}

// Cubic bezier helper
function cubicBezier(x1: number, y1: number, x2: number, y2: number, t: number): number {
  // Newton's method to find t for given x
  const EPSILON = 1e-6;
  let guessT = t;

  for (let i = 0; i < 8; i++) {
    const x =
      3 * (1 - guessT) * (1 - guessT) * guessT * x1 +
      3 * (1 - guessT) * guessT * guessT * x2 +
      guessT * guessT * guessT -
      t;
    if (Math.abs(x) < EPSILON) break;
    const dx =
      3 * (1 - guessT) * (1 - guessT) * x1 +
      6 * (1 - guessT) * guessT * (x2 - x1) +
      3 * guessT * guessT * (1 - x2);
    if (Math.abs(dx) < EPSILON) break;
    guessT -= x / dx;
  }

  return (
    3 * (1 - guessT) * (1 - guessT) * guessT * y1 +
    3 * (1 - guessT) * guessT * guessT * y2 +
    guessT * guessT * guessT
  );
}

// Easing namespace matching Remotion's API
export const Easing = {
  linear: (t: number) => t,
  ease: (t: number) => cubicBezier(0.25, 0.1, 0.25, 1, t),
  cubic: (t: number) => t * t * t,

  in: (fn: (t: number) => number) => fn,

  out:
    (fn: (t: number) => number) =>
    (t: number) =>
      1 - fn(1 - t),

  inOut:
    (fn: (t: number) => number) =>
    (t: number) => {
      if (t < 0.5) return fn(t * 2) / 2;
      return 1 - fn((1 - t) * 2) / 2;
    },

  bezier:
    (x1: number, y1: number, x2: number, y2: number) =>
    (t: number) =>
      cubicBezier(x1, y1, x2, y2, t),
};
