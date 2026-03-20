import React from 'react';
import { SceneTransitionType, TransitionDirection } from '../types/project';

// Easing: smooth ease-in-out
function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// Get CSS styles for each scene layer during a transition
export function getTransitionStyles(
  type: SceneTransitionType,
  progress: number, // 0..1
  direction: TransitionDirection,
  canvasWidth: number,
  canvasHeight: number,
): { from: React.CSSProperties; to: React.CSSProperties; overlay?: React.CSSProperties } {
  const t = easeInOut(progress);
  const dir = direction;

  switch (type) {
    case 'slide': {
      // New scene slides in over the old scene
      const dx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
      const dy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
      return {
        from: { opacity: 1 },
        to: {
          transform: `translate(${(1 - t) * -dx * canvasWidth}px, ${(1 - t) * -dy * canvasHeight}px)`,
        },
      };
    }

    case 'push': {
      // New scene pushes old scene out
      const dx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
      const dy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
      return {
        from: {
          transform: `translate(${t * dx * canvasWidth}px, ${t * dy * canvasHeight}px)`,
        },
        to: {
          transform: `translate(${(1 - t) * -dx * canvasWidth}px, ${(1 - t) * -dy * canvasHeight}px)`,
        },
      };
    }

    case 'wipe': {
      // Linear wipe using clip-path
      const clipFrom = (() => {
        switch (dir) {
          case 'left': return `inset(0 ${t * 100}% 0 0)`;
          case 'right': return `inset(0 0 0 ${t * 100}%)`;
          case 'up': return `inset(0 0 ${t * 100}% 0)`;
          case 'down': return `inset(${t * 100}% 0 0 0)`;
        }
      })();
      return {
        from: { clipPath: clipFrom },
        to: { opacity: 1 },
      };
    }

    case 'iris': {
      // Circle reveal from center
      const maxRadius = Math.sqrt(canvasWidth ** 2 + canvasHeight ** 2) / 2;
      const radius = t * maxRadius;
      return {
        from: { opacity: 1 },
        to: {
          clipPath: `circle(${radius}px at 50% 50%)`,
        },
      };
    }

    case 'zoom': {
      // Zoom into old scene, new scene appears behind
      return {
        from: {
          transform: `scale(${1 + t * 3})`,
          opacity: 1 - t,
          zIndex: 2,
        },
        to: {
          transform: `scale(${1 - (1 - t) * 0.2})`,
          opacity: t,
          zIndex: 1,
        },
      };
    }

    case 'blur': {
      // Old scene blurs out, new scene blurs in
      const maxBlur = 20;
      return {
        from: {
          filter: `blur(${t * maxBlur}px)`,
          opacity: 1 - t * 0.5,
        },
        to: {
          filter: `blur(${(1 - t) * maxBlur}px)`,
          opacity: 0.5 + t * 0.5,
        },
      };
    }

    case 'flash': {
      // White flash between scenes
      const fromOpacity = t < 0.4 ? 1 - t / 0.4 : 0;
      const toOpacity = t > 0.6 ? (t - 0.6) / 0.4 : 0;
      const flashOpacity = t < 0.5
        ? Math.min(1, t / 0.3)
        : Math.max(0, 1 - (t - 0.5) / 0.3);
      return {
        from: { opacity: fromOpacity },
        to: { opacity: toOpacity },
        overlay: {
          position: 'absolute',
          top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: '#ffffff',
          opacity: flashOpacity,
          zIndex: 100,
          pointerEvents: 'none',
        },
      };
    }

    case 'glitch': {
      // Digital glitch: RGB split + slice displacement
      const glitchIntensity = Math.sin(t * Math.PI); // peak in the middle
      const sliceOffset = Math.sin(progress * 47) * glitchIntensity * 30;
      const rgbShift = glitchIntensity * 8;
      return {
        from: {
          opacity: 1 - t,
          filter: `drop-shadow(${rgbShift}px 0 0 rgba(255,0,0,${glitchIntensity * 0.7})) drop-shadow(${-rgbShift}px 0 0 rgba(0,255,255,${glitchIntensity * 0.7}))`,
          transform: `translateX(${sliceOffset}px)`,
        },
        to: {
          opacity: t,
          filter: `drop-shadow(${-rgbShift}px 0 0 rgba(255,0,0,${glitchIntensity * 0.7})) drop-shadow(${rgbShift}px 0 0 rgba(0,255,255,${glitchIntensity * 0.7}))`,
          transform: `translateX(${-sliceOffset}px)`,
        },
      };
    }

    case 'flip': {
      // 3D card flip
      const angle = t * 180;
      const showFrom = angle <= 90;
      return {
        from: {
          transform: `perspective(${canvasWidth}px) rotateY(${angle}deg)`,
          backfaceVisibility: 'hidden' as const,
          opacity: showFrom ? 1 : 0,
        },
        to: {
          transform: `perspective(${canvasWidth}px) rotateY(${angle - 180}deg)`,
          backfaceVisibility: 'hidden' as const,
          opacity: showFrom ? 0 : 1,
        },
      };
    }

    case 'cube': {
      // 3D cube rotation
      const angle = t * 90;
      const dx = dir === 'left' ? -1 : 1;
      const perspective = canvasWidth * 1.5;
      return {
        from: {
          transformOrigin: dx > 0 ? 'right center' : 'left center',
          transform: `perspective(${perspective}px) rotateY(${dx * angle}deg)`,
          opacity: 1,
        },
        to: {
          transformOrigin: dx > 0 ? 'left center' : 'right center',
          transform: `perspective(${perspective}px) rotateY(${dx * (angle - 90)}deg)`,
          opacity: 1,
        },
      };
    }

    case 'split': {
      // Old scene splits apart to reveal new scene underneath
      const isHorizontal = dir === 'left' || dir === 'right';
      const offset = t * 55; // go past 50 to fully clear
      if (isHorizontal) {
        return {
          from: {
            clipPath: `polygon(0 0, ${Math.max(0, 50 - offset)}% 0, ${Math.max(0, 50 - offset)}% 100%, 0 100%, 0 0, 100% 0, 100% 100%, ${Math.min(100, 50 + offset)}% 100%, ${Math.min(100, 50 + offset)}% 0, 100% 0)`,
            zIndex: 2,
          },
          to: { opacity: 1, zIndex: 1 },
        };
      } else {
        return {
          from: {
            clipPath: `polygon(0 0, 100% 0, 100% ${Math.max(0, 50 - offset)}%, 0 ${Math.max(0, 50 - offset)}%, 0 0, 0 100%, 100% 100%, 100% ${Math.min(100, 50 + offset)}%, 0 ${Math.min(100, 50 + offset)}%, 0 100%)`,
            zIndex: 2,
          },
          to: { opacity: 1, zIndex: 1 },
        };
      }
    }

    case 'blinds': {
      // Venetian blinds: old scene gets sliced, revealing new scene
      const numBlinds = 8;
      const blindSize = 100 / numBlinds;
      // Each blind shrinks to reveal the new scene
      const revealPct = t * blindSize;
      // Build inset rects for the old scene (what remains visible)
      const parts: string[] = [];
      for (let i = 0; i < numBlinds; i++) {
        const yStart = i * blindSize;
        const yEnd = yStart + blindSize - revealPct;
        if (yEnd > yStart) {
          parts.push(`0% ${yStart}%, 100% ${yStart}%, 100% ${yEnd}%, 0% ${yEnd}%`);
        }
      }
      const clipPath = parts.length > 0
        ? `polygon(${parts.join(', ')})`
        : 'polygon(0 0, 0 0, 0 0)'; // fully hidden
      return {
        from: { clipPath, zIndex: 2 },
        to: { opacity: 1, zIndex: 1 },
      };
    }

    case 'liquid': {
      // Liquid/gooey transition: wavy clip-path edge that morphs across
      // Generate a polygon with sinusoidal waves along the wipe edge
      const numPoints = 20;
      const waveAmplitude = 8; // percentage
      const waveFreq = 3;
      const baseX = t * (100 + waveAmplitude * 2) - waveAmplitude;
      const points: string[] = [];
      // Right edge with waves (going down)
      for (let i = 0; i <= numPoints; i++) {
        const yPct = (i / numPoints) * 100;
        const wave = Math.sin((i / numPoints) * Math.PI * 2 * waveFreq + progress * 12) * waveAmplitude;
        const xPct = Math.max(0, Math.min(100, baseX + wave));
        points.push(`${xPct}% ${yPct}%`);
      }
      // Close the polygon on the right
      points.push('100% 100%', '100% 0%');
      return {
        from: { opacity: 1 },
        to: {
          clipPath: `polygon(${points.join(', ')})`,
          zIndex: 2,
        },
      };
    }

    case 'lightLeak': {
      // Light leak: warm light washes over the scene
      // Phase 1 (0-0.5): light builds up, old scene fades
      // Phase 2 (0.5-1): light fades, new scene appears
      const leakIntensity = Math.sin(t * Math.PI); // 0→1→0
      const warmColor = `rgba(255, ${140 + Math.round(leakIntensity * 60)}, ${50 + Math.round(leakIntensity * 30)}, ${leakIntensity * 0.85})`;
      const flareX = 30 + t * 40;
      const flareY = 20 + Math.sin(progress * 5) * 15;
      return {
        from: { opacity: t < 0.5 ? 1 : Math.max(0, 1 - (t - 0.3) / 0.4) },
        to: { opacity: t > 0.4 ? Math.min(1, (t - 0.4) / 0.4) : 0 },
        overlay: {
          position: 'absolute',
          top: 0, left: 0, width: '100%', height: '100%',
          background: `radial-gradient(ellipse at ${flareX}% ${flareY}%, ${warmColor}, rgba(255, 180, 60, ${leakIntensity * 0.4}) 30%, rgba(255, 100, 20, ${leakIntensity * 0.2}) 60%, transparent 80%)`,
          mixBlendMode: 'screen' as const,
          zIndex: 100,
          pointerEvents: 'none',
        },
      };
    }

    case 'whipPan': {
      // Whip pan: fast horizontal sweep with motion blur
      const dx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
      const dy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
      const isHorizontal = dx !== 0;
      // Acceleration curve: fast in the middle, slow at edges
      const speed = Math.sin(t * Math.PI);
      const blurAmount = speed * 40;
      // Position: ease with acceleration
      const pos = t < 0.5
        ? 2 * t * t
        : 1 - Math.pow(-2 * t + 2, 2) / 2;
      return {
        from: {
          transform: `translate(${pos * dx * canvasWidth}px, ${pos * dy * canvasHeight}px)`,
          filter: isHorizontal
            ? `blur(${blurAmount}px)`
            : `blur(${blurAmount}px)`,
          opacity: 1,
        },
        to: {
          transform: `translate(${(pos - 1) * dx * canvasWidth}px, ${(pos - 1) * dy * canvasHeight}px)`,
          filter: isHorizontal
            ? `blur(${blurAmount}px)`
            : `blur(${blurAmount}px)`,
          opacity: 1,
        },
      };
    }

    case 'filmBurn': {
      // Film burn: overexposure effect like analog film
      const burnIntensity = Math.sin(t * Math.PI);
      const burnPhase = t * 3; // faster progression
      const hotspotX = 50 + Math.sin(burnPhase * 2) * 25;
      const hotspotY = 50 + Math.cos(burnPhase * 1.5) * 20;
      const burnRadius = 20 + burnIntensity * 60;
      return {
        from: {
          opacity: t < 0.55 ? 1 : Math.max(0, 1 - (t - 0.55) / 0.3),
          filter: `brightness(${1 + burnIntensity * 2}) saturate(${1 + burnIntensity})`,
        },
        to: {
          opacity: t > 0.35 ? Math.min(1, (t - 0.35) / 0.4) : 0,
          filter: `brightness(${1 + (1 - t) * burnIntensity}) saturate(${1 + (1 - t) * 0.5})`,
        },
        overlay: {
          position: 'absolute',
          top: 0, left: 0, width: '100%', height: '100%',
          background: `radial-gradient(circle at ${hotspotX}% ${hotspotY}%, rgba(255, 220, 150, ${burnIntensity * 0.9}), rgba(255, 140, 50, ${burnIntensity * 0.6}) ${burnRadius * 0.4}%, rgba(200, 60, 20, ${burnIntensity * 0.3}) ${burnRadius * 0.7}%, transparent ${burnRadius}%)`,
          mixBlendMode: 'color-dodge' as const,
          zIndex: 100,
          pointerEvents: 'none',
        },
      };
    }

    case 'halftone': {
      // Halftone/dot pattern dissolve
      // Use radial-gradient repeating pattern as overlay that reveals the new scene
      const dotSize = 3 + (1 - t) * 40; // dots shrink over time revealing new scene
      const gapSize = 4;
      const totalSize = dotSize + gapSize;
      return {
        from: { opacity: 1, zIndex: 2 },
        to: { opacity: 1, zIndex: 1 },
        overlay: {
          position: 'absolute',
          top: 0, left: 0, width: '100%', height: '100%',
          // Black dots that grow/shrink - applied as mask on from scene
          background: `radial-gradient(circle, black ${Math.max(0, dotSize / totalSize * 50)}%, transparent ${Math.max(0, dotSize / totalSize * 50)}%)`,
          backgroundSize: `${totalSize}px ${totalSize}px`,
          mixBlendMode: 'multiply' as const,
          zIndex: 101,
          pointerEvents: 'none',
          opacity: t > 0.8 ? (1 - t) / 0.2 : 1,
        },
      };
    }

    case 'chromatic': {
      // Chromatic aberration: strong RGB channel split
      const intensity = Math.sin(t * Math.PI); // peak at midpoint
      const shift = intensity * 20;
      const skew = Math.sin(progress * 30) * intensity * 2;
      return {
        from: {
          opacity: 1 - t,
          filter: [
            `drop-shadow(${shift}px ${shift * 0.3}px 0 rgba(255, 0, 0, ${intensity * 0.8}))`,
            `drop-shadow(${-shift * 0.7}px ${-shift * 0.5}px 0 rgba(0, 255, 0, ${intensity * 0.6}))`,
            `drop-shadow(${shift * 0.3}px ${-shift}px 0 rgba(0, 0, 255, ${intensity * 0.8}))`,
          ].join(' '),
          transform: `skewX(${skew}deg) scale(${1 + intensity * 0.05})`,
        },
        to: {
          opacity: t,
          filter: [
            `drop-shadow(${-shift * 0.5}px ${shift * 0.5}px 0 rgba(255, 0, 0, ${intensity * 0.6}))`,
            `drop-shadow(${shift * 0.8}px ${-shift * 0.3}px 0 rgba(0, 255, 0, ${intensity * 0.5}))`,
            `drop-shadow(${-shift * 0.3}px ${shift * 0.7}px 0 rgba(0, 0, 255, ${intensity * 0.6}))`,
          ].join(' '),
          transform: `skewX(${-skew}deg) scale(${1 + intensity * 0.03})`,
        },
      };
    }

    default:
      return { from: {}, to: {} };
  }
}

// Transition metadata for UI
export interface TransitionMeta {
  label: string;
  icon: string;
  category: 'basic' | 'geometric' | 'motion' | 'digital' | '3d' | 'cinematic';
  hasDirection: boolean;
  defaultDuration: number;
}

export const TRANSITION_META: Record<SceneTransitionType, TransitionMeta> = {
  cut:       { label: 'Schnitt',       icon: '|',  category: 'basic',     hasDirection: false, defaultDuration: 0 },
  fade:      { label: 'Überblendung',  icon: '◐',  category: 'basic',     hasDirection: false, defaultDuration: 500 },
  morph:     { label: 'Morph',         icon: '◇',  category: 'basic',     hasDirection: false, defaultDuration: 800 },
  slide:     { label: 'Slide',         icon: '▶',  category: 'geometric', hasDirection: true,  defaultDuration: 600 },
  push:      { label: 'Push',          icon: '⇄',  category: 'geometric', hasDirection: true,  defaultDuration: 600 },
  wipe:      { label: 'Wipe',          icon: '▌',  category: 'geometric', hasDirection: true,  defaultDuration: 600 },
  iris:      { label: 'Iris',          icon: '◎',  category: 'geometric', hasDirection: false, defaultDuration: 700 },
  split:     { label: 'Split',         icon: '⇔',  category: 'geometric', hasDirection: true,  defaultDuration: 600 },
  blinds:    { label: 'Jalousie',      icon: '≡',  category: 'geometric', hasDirection: false, defaultDuration: 700 },
  zoom:      { label: 'Zoom',          icon: '⊕',  category: 'motion',    hasDirection: false, defaultDuration: 700 },
  blur:      { label: 'Blur',          icon: '◌',  category: 'motion',    hasDirection: false, defaultDuration: 600 },
  flash:     { label: 'Flash',         icon: '☀',  category: 'motion',    hasDirection: false, defaultDuration: 500 },
  whipPan:   { label: 'Whip Pan',      icon: '⟿',  category: 'motion',    hasDirection: true,  defaultDuration: 400 },
  glitch:    { label: 'Glitch',        icon: '⚡', category: 'digital',   hasDirection: false, defaultDuration: 500 },
  chromatic: { label: 'Chromatisch',   icon: '◈',  category: 'digital',   hasDirection: false, defaultDuration: 600 },
  halftone:  { label: 'Halftone',      icon: '⠿',  category: 'digital',   hasDirection: false, defaultDuration: 700 },
  flip:      { label: 'Flip',          icon: '↻',  category: '3d',        hasDirection: false, defaultDuration: 700 },
  cube:      { label: 'Cube',          icon: '▣',  category: '3d',        hasDirection: true,  defaultDuration: 800 },
  lightLeak: { label: 'Light Leak',    icon: '✦',  category: 'cinematic', hasDirection: false, defaultDuration: 800 },
  filmBurn:  { label: 'Film Burn',     icon: '🔥', category: 'cinematic', hasDirection: false, defaultDuration: 900 },
  liquid:    { label: 'Liquid',        icon: '🌊', category: 'cinematic', hasDirection: false, defaultDuration: 800 },
};

export const TRANSITION_CATEGORIES: { key: string; label: string; types: SceneTransitionType[] }[] = [
  { key: 'basic',     label: 'Basis',       types: ['cut', 'fade', 'morph'] },
  { key: 'geometric', label: 'Geometrisch', types: ['slide', 'push', 'wipe', 'iris', 'split', 'blinds'] },
  { key: 'motion',    label: 'Bewegung',    types: ['zoom', 'blur', 'flash', 'whipPan'] },
  { key: 'digital',   label: 'Digital',     types: ['glitch', 'chromatic', 'halftone'] },
  { key: '3d',        label: '3D',          types: ['flip', 'cube'] },
  { key: 'cinematic', label: 'Cinematic',   types: ['lightLeak', 'filmBurn', 'liquid'] },
];
