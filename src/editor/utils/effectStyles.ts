import { createElement, ReactNode, Fragment } from 'react';
import type { Effect } from '../../types/project';

// === CSS keyframe-based effects ===

const EFFECT_CSS_MAP: Record<string, { animationName: string; baseDuration: number; easing?: string }> = {
  float:     { animationName: 'effect-float',     baseDuration: 2.0 },
  pulse:     { animationName: 'effect-pulse',     baseDuration: 2.0 },
  glow:      { animationName: 'effect-glow',      baseDuration: 3.0 },
  wobble:    { animationName: 'effect-wobble',     baseDuration: 1.5 },
  spin:      { animationName: 'effect-spin',       baseDuration: 4.0, easing: 'linear' },
  bounce:    { animationName: 'effect-bounce',     baseDuration: 1.5 },
  shake:     { animationName: 'effect-shake',      baseDuration: 0.6 },
  heartbeat: { animationName: 'effect-heartbeat',  baseDuration: 1.2 },
  neonFlicker: { animationName: 'effect-neonFlicker', baseDuration: 2.5 },
  rainbow:   { animationName: 'effect-rainbow',    baseDuration: 3.0, easing: 'linear' },
  blink:     { animationName: 'effect-blink',      baseDuration: 1.5 },
  tilt3d:    { animationName: 'effect-tilt3d',     baseDuration: 3.0 },
  glitch:    { animationName: 'effect-glitch',     baseDuration: 2.0, easing: 'steps(1)' },
};

// Effects that use --effect-glow-color
const COLOR_EFFECTS = new Set(['glow', 'neonFlicker', 'hologram', 'electrified']);

// === SVG filter-based effects ===

const SVG_FILTER_TYPES = new Set(['ripple', 'heatShimmer', 'emboss', 'pixelate', 'chromaSplit', 'morphBlur']);

function buildSvgFilter(effect: Effect, filterId: string): ReactNode {
  const dur = (s: number) => `${s / effect.speed}s`;

  switch (effect.type) {
    case 'ripple': {
      const scale = 8 * effect.intensity;
      const baseFreq = 0.015 * effect.intensity;
      const freqLow = (baseFreq * 0.6).toFixed(4);
      const freqHigh = (baseFreq * 1.4).toFixed(4);
      const freqMid = baseFreq.toFixed(4);
      return createElement('filter', { id: filterId },
        createElement('feTurbulence', {
          type: 'turbulence', baseFrequency: freqMid, numOctaves: 3, result: 'noise',
        },
          createElement('animate', {
            attributeName: 'baseFrequency',
            values: `${freqLow};${freqHigh};${freqLow}`,
            dur: dur(3), repeatCount: 'indefinite',
          }),
        ),
        createElement('feDisplacementMap', {
          in: 'SourceGraphic', in2: 'noise', scale, xChannelSelector: 'R', yChannelSelector: 'G',
        }),
      );
    }
    case 'heatShimmer': {
      const scale = 4 * effect.intensity;
      const vLow = `${(0.016).toFixed(4)} ${(0.032).toFixed(4)}`;
      const vHigh = `${(0.030).toFixed(4)} ${(0.060).toFixed(4)}`;
      const vMid = `${(0.020).toFixed(4)} ${(0.040).toFixed(4)}`;
      return createElement('filter', { id: filterId },
        createElement('feTurbulence', {
          type: 'turbulence', baseFrequency: vMid, numOctaves: 2, result: 'noise',
        },
          createElement('animate', {
            attributeName: 'baseFrequency',
            values: `${vLow};${vHigh};${vLow}`,
            dur: dur(1.5), repeatCount: 'indefinite',
          }),
        ),
        createElement('feDisplacementMap', {
          in: 'SourceGraphic', in2: 'noise', scale, xChannelSelector: 'R', yChannelSelector: 'G',
        }),
      );
    }
    case 'emboss': {
      const surfaceScale = 3 * effect.intensity;
      return createElement('filter', { id: filterId },
        createElement('feGaussianBlur', { in: 'SourceAlpha', stdDeviation: 1, result: 'blur' }),
        createElement('feSpecularLighting', {
          in: 'blur', surfaceScale, specularConstant: 0.8, specularExponent: 15,
          result: 'specLight', lightingColor: '#ffffff',
        },
          createElement('fePointLight', { x: 100, y: 100, z: 200 },
            createElement('animate', {
              attributeName: 'x', values: '0;200;200;0;0',
              dur: dur(4), repeatCount: 'indefinite',
            }),
            createElement('animate', {
              attributeName: 'y', values: '0;0;200;200;0',
              dur: dur(4), repeatCount: 'indefinite',
            }),
          ),
        ),
        createElement('feComposite', {
          in: 'SourceGraphic', in2: 'specLight', operator: 'arithmetic',
          k1: 0, k2: 1, k3: 0.6 * effect.intensity, k4: 0,
        }),
      );
    }
    case 'pixelate': {
      const radius = 1.5 * effect.intensity;
      const rLow = (radius * 0.3).toFixed(2);
      const rHigh = (radius * 1.0).toFixed(2);
      return createElement('filter', { id: filterId },
        createElement('feMorphology', {
          operator: 'dilate', radius: rLow, in: 'SourceGraphic', result: 'dilated',
        },
          createElement('animate', {
            attributeName: 'radius',
            values: `${rLow};${rHigh};${rLow}`,
            dur: dur(2), repeatCount: 'indefinite',
          }),
        ),
        createElement('feGaussianBlur', { in: 'dilated', stdDeviation: 0.5, result: 'blurred' }),
        createElement('feComposite', { in: 'blurred', in2: 'SourceGraphic', operator: 'atop' }),
      );
    }
    case 'chromaSplit': {
      const offset = 3 * effect.intensity;
      const oStr = offset.toFixed(1);
      const oNeg = (-offset).toFixed(1);
      return createElement('filter', { id: filterId },
        // Red channel offset right
        createElement('feOffset', { in: 'SourceGraphic', dx: 0, dy: 0, result: 'red' },
          createElement('animate', {
            attributeName: 'dx', values: `0;${oStr};${oNeg};0`,
            dur: dur(2), repeatCount: 'indefinite',
          }),
        ),
        createElement('feColorMatrix', {
          in: 'red', type: 'matrix',
          values: '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0',
          result: 'redOnly',
        }),
        // Blue channel offset left
        createElement('feOffset', { in: 'SourceGraphic', dx: 0, dy: 0, result: 'blue' },
          createElement('animate', {
            attributeName: 'dx', values: `0;${oNeg};${oStr};0`,
            dur: dur(2), repeatCount: 'indefinite',
          }),
        ),
        createElement('feColorMatrix', {
          in: 'blue', type: 'matrix',
          values: '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0',
          result: 'blueOnly',
        }),
        // Green channel stays centered
        createElement('feColorMatrix', {
          in: 'SourceGraphic', type: 'matrix',
          values: '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0',
          result: 'greenOnly',
        }),
        // Blend all channels
        createElement('feBlend', { in: 'redOnly', in2: 'greenOnly', mode: 'screen', result: 'rg' }),
        createElement('feBlend', { in: 'rg', in2: 'blueOnly', mode: 'screen' }),
      );
    }
    case 'morphBlur': {
      const maxBlur = 3 * effect.intensity;
      return createElement('filter', { id: filterId },
        createElement('feGaussianBlur', {
          in: 'SourceGraphic', stdDeviation: 0,
        },
          createElement('animate', {
            attributeName: 'stdDeviation',
            values: `0;${maxBlur.toFixed(1)};0`,
            dur: dur(2), repeatCount: 'indefinite',
          }),
        ),
      );
    }
    default:
      return null;
  }
}

// === Overlay effects (need extra DOM elements) ===

const OVERLAY_EFFECT_TYPES = new Set(['shine', 'hologram', 'electrified']);

function buildOverlayEffect(
  effect: Effect,
  children: ReactNode,
): ReactNode {
  const speed = effect.speed;
  const intensity = effect.intensity;

  switch (effect.type) {
    case 'shine': {
      const duration = 2.5 / speed;
      return createElement('div', {
        key: 'effect-shine',
        style: {
          width: '100%', height: '100%', position: 'relative' as const, overflow: 'hidden',
        },
      },
        children,
        createElement('div', {
          style: {
            position: 'absolute' as const,
            top: 0, left: 0, right: 0, bottom: 0,
            background: `linear-gradient(105deg, transparent 35%, rgba(255,255,255,${0.12 * intensity}) 45%, rgba(255,255,255,${0.2 * intensity}) 50%, rgba(255,255,255,${0.12 * intensity}) 55%, transparent 65%)`,
            backgroundSize: '200% 100%',
            animation: `effect-shine ${duration}s ease-in-out infinite`,
            pointerEvents: 'none' as const,
          },
        }),
      );
    }
    case 'hologram': {
      const glowDur = 3 / speed;
      const scanDur = 0.3 / speed;
      const color = effect.color || '#00ffff';
      return createElement('div', {
        key: 'effect-hologram',
        style: {
          width: '100%', height: '100%', position: 'relative' as const, overflow: 'hidden',
          animation: `effect-hologram-glow ${glowDur}s ease-in-out infinite`,
          '--effect-intensity': String(intensity),
          '--effect-glow-color': color,
        } as React.CSSProperties,
      },
        children,
        // Scanlines overlay
        createElement('div', {
          style: {
            position: 'absolute' as const,
            top: 0, left: 0, right: 0, bottom: 0,
            background: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,${0.12 * intensity}) 2px, rgba(0,0,0,${0.12 * intensity}) 4px)`,
            animation: `effect-hologram-scanlines ${scanDur}s linear infinite`,
            pointerEvents: 'none' as const,
          },
        }),
      );
    }
    case 'electrified': {
      const shakeDur = 0.08 / speed;
      const glowDur = 1.5 / speed;
      const color = effect.color || '#4dc9f6';
      return createElement('div', {
        key: 'effect-electrified',
        style: {
          width: '100%', height: '100%',
          animation: `effect-electrified-shake ${shakeDur}s linear infinite, effect-electrified-glow ${glowDur}s ease-in-out infinite`,
          '--effect-intensity': String(intensity),
          '--effect-glow-color': color,
        } as React.CSSProperties,
      }, children);
    }
    default:
      return children;
  }
}

// === Main wrapper function ===

export function wrapWithEffects(
  effects: Effect[] | undefined,
  children: ReactNode,
  elementId?: string,
): ReactNode {
  if (!effects) return children;
  const enabled = effects.filter(e => e.enabled);
  if (enabled.length === 0) return children;

  let result = children;
  const svgFilters: ReactNode[] = [];

  for (let i = enabled.length - 1; i >= 0; i--) {
    const effect = enabled[i];

    if (SVG_FILTER_TYPES.has(effect.type)) {
      // SVG filter-based effect
      const filterId = `effect-${effect.type}-${elementId || i}`;
      const filterDef = buildSvgFilter(effect, filterId);
      if (filterDef) {
        svgFilters.push(filterDef);
        result = createElement('div', {
          key: `effect-${effect.type}`,
          style: { width: '100%', height: '100%', filter: `url(#${filterId})` } as React.CSSProperties,
        }, result);
      }
    } else if (OVERLAY_EFFECT_TYPES.has(effect.type)) {
      // Overlay-based effect (shine, hologram, electrified)
      result = buildOverlayEffect(effect, result);
    } else {
      // CSS keyframe-based effect
      const def = EFFECT_CSS_MAP[effect.type];
      if (!def) continue;
      const duration = def.baseDuration / effect.speed;
      const easing = def.easing || 'ease-in-out';
      const style: Record<string, string> = {
        width: '100%', height: '100%',
        animation: `${def.animationName} ${duration}s ${easing} infinite`,
        '--effect-intensity': String(effect.intensity),
        '--effect-speed': String(effect.speed),
      };
      if (COLOR_EFFECTS.has(effect.type) && effect.color) {
        style['--effect-glow-color'] = effect.color;
      }
      result = createElement('div', {
        key: `effect-${effect.type}`,
        style,
      }, result);
    }
  }

  if (svgFilters.length > 0) {
    const svgDefs = createElement('svg', {
      key: 'effect-svg-filters',
      style: { position: 'absolute' as const, width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' as const },
      'aria-hidden': true,
    },
      createElement('defs', null, ...svgFilters),
    );
    result = createElement(Fragment, null, svgDefs, result);
  }

  return result;
}
