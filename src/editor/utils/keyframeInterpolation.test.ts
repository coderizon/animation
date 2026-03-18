import { describe, expect, it } from 'vitest';
import { Keyframe } from '../../types/project';
import { getInterpolatedPosition, getInterpolatedProperties } from './keyframeInterpolation';

describe('getInterpolatedProperties', () => {
  it('returns null when no keyframes exist', () => {
    expect(getInterpolatedProperties(undefined, 250)).toBeNull();
    expect(getInterpolatedProperties([], 250)).toBeNull();
  });

  it('clamps to the first and last keyframe outside the animation range', () => {
    const keyframes: Keyframe[] = [
      { time: 100, x: 10, y: 20, rotation: 5 },
      { time: 400, x: 90, y: 120, rotation: 45 },
    ];

    expect(getInterpolatedProperties(keyframes, 0)).toEqual({
      x: 10,
      y: 20,
      width: undefined,
      height: undefined,
      rotation: 5,
      fill: undefined,
      stroke: undefined,
      strokeWidth: undefined,
      color: undefined,
      fontSize: undefined,
    });

    expect(getInterpolatedProperties(keyframes, 999)).toEqual({
      x: 90,
      y: 120,
      width: undefined,
      height: undefined,
      rotation: 45,
      fill: undefined,
      stroke: undefined,
      strokeWidth: undefined,
      color: undefined,
      fontSize: undefined,
    });
  });

  it('interpolates numeric and color fields between keyframes', () => {
    const keyframes: Keyframe[] = [
      {
        time: 0,
        x: 0,
        y: 50,
        width: 100,
        rotation: 0,
        fill: '#000000',
        color: '#112233',
      },
      {
        time: 1000,
        x: 100,
        y: 150,
        width: 300,
        rotation: 90,
        fill: '#ffffff',
        color: '#334455',
      },
    ];

    expect(getInterpolatedProperties(keyframes, 500)).toEqual({
      x: 50,
      y: 100,
      width: 200,
      height: undefined,
      rotation: 45,
      fill: '#808080',
      stroke: undefined,
      strokeWidth: undefined,
      color: '#223344',
      fontSize: undefined,
    });
  });

  it('only interpolates optional fields when both neighbors define them', () => {
    const keyframes: Keyframe[] = [
      { time: 0, x: 0, y: 0, width: 100, fill: '#ff0000' },
      { time: 1000, x: 200, y: 200 },
    ];

    expect(getInterpolatedProperties(keyframes, 500)).toEqual({
      x: 100,
      y: 100,
      width: undefined,
      height: undefined,
      rotation: undefined,
      fill: undefined,
      stroke: undefined,
      strokeWidth: undefined,
      color: undefined,
      fontSize: undefined,
    });
  });
});

describe('getInterpolatedPosition', () => {
  it('returns only the position subset', () => {
    const keyframes: Keyframe[] = [
      { time: 0, x: 10, y: 20 },
      { time: 100, x: 20, y: 40 },
    ];

    expect(getInterpolatedPosition(keyframes, 50)).toEqual({ x: 15, y: 30 });
  });
});
