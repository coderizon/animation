import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faFeather, faCircleDot, faRotate, faArrowsSpin,
  faArrowsUpDown, faWaveSquare, faHeartPulse,
  faSun, faBolt, faWandSparkles, faRainbow, faEye,
  faCube, faWater, faFire, faDiamond, faTableCells,
  faCircleHalfStroke, faCircle, faTv, faGhost, faSlash,
} from '@fortawesome/free-solid-svg-icons';

// Core Project Data Structure

export interface Project {
  id: string;
  name: string;
  version: '1.0';

  canvas: {
    width: number;
    height: number;
    backgroundColor: string;
  };

  elements: CanvasElement[];

  // Camera keyframes (sorted by time) — zoom/pan animation over canvas
  cameraKeyframes?: CameraKeyframe[];

  metadata: {
    createdAt: string;
    updatedAt: string;
  };
}

// Canvas Element Types

export type ElementType = 'logo' | 'text' | 'shape' | 'image' | 'widget';

export interface CanvasElement {
  id: string;
  type: ElementType;
  name?: string;

  // Position & Size
  position: { x: number; y: number };
  size: { width: number; height: number };
  rotation: number; // degrees
  zIndex: number;

  // Content (varies by type)
  content: LogoContent | TextContent | ShapeContent | ImageContent | WidgetContent;

  // Animation (legacy single field, kept for backward compat during import)
  animation?: AnimationConfig;
  // Multiple animations (ordered list, each with own delay/duration)
  animations?: AnimationConfig[];

  // Keyframes (sorted by time)
  keyframes?: Keyframe[];

  // Crop (inset percentages 0-100)
  clip?: { top: number; right: number; bottom: number; left: number };

  // Loop effects (continuous visual effects)
  effects?: Effect[];

  // State
  visible: boolean;
  locked: boolean;
}

// Content Types

export interface LogoContent {
  type: 'logo';
  src: string;   // '/assets/deepseek.svg'
  alt: string;
}

export interface TextContent {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  fontWeight?: number;
  typewriter?: boolean;  // Typewriter effect
}

export interface ShapeContent {
  type: 'shape';
  shape: 'rectangle' | 'circle' | 'line' | 'triangle';
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  borderRadius?: number;
}

export interface ImageContent {
  type: 'image';
  src: string;
  alt: string;
}

export interface WidgetContent {
  type: 'widget';
  widgetName: string;
  fps: number;
  durationInFrames: number;
  props?: Record<string, unknown>;
}

// Animation Config

export interface AnimationConfig {
  preset: AnimationPresetName;
  delay: number;        // ms
  duration: number;     // ms
  easing: EasingName;
}

export type AnimationPresetName =
  | 'none'
  // Fade
  | 'fadeIn'
  | 'fadeOut'
  | 'softFadeOut'
  // Slide
  | 'slideInLeft'
  | 'slideInRight'
  | 'slideInTop'
  | 'slideInBottom'
  | 'slideOutLeft'
  | 'slideOutRight'
  // Scale & Zoom
  | 'scaleIn'
  | 'scaleOut'
  | 'scalePop'
  | 'zoomIn'
  | 'zoomOut'
  | 'cameraPush'
  // Rotation
  | 'rotate'
  | 'rotationReveal'
  | 'flipIn'
  | 'flipInY'
  // Bounce & Elastic
  | 'bounce'
  | 'elasticIn'
  | 'elasticScale'
  | 'pulse'
  | 'shake'
  // Reveal & Mask
  | 'wipeRight'
  | 'wipeDown'
  | 'wipeLeft'
  | 'barReveal'
  | 'maskCircle'
  // Stroke & Shape
  | 'strokeDraw'
  | 'shapeAssembly'
  // Glitch & Digital
  | 'glitch'
  | 'rgbSplit'
  | 'scanlines'
  // Light & Shine
  | 'lightSweep'
  | 'lightShadow'
  // Motion
  | 'motionBlur'
  | 'slowDrift'
  | 'parallaxDepth'
  | 'subtle3D'
  // Particle & Dissolve
  | 'particleBuild'
  | 'particleDissolve'
  // Dramatic
  | 'explode'
  | 'liquidReveal'
  | 'smokeReveal'
  | 'depthOfField';

export type EasingName =
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'spring'
  | 'bounce';

// Keyframes (full property snapshots)

export interface Keyframe {
  time: number;  // ms
  x: number;
  y: number;
  // Optional property overrides (only interpolated when present in both neighbors)
  width?: number;
  height?: number;
  rotation?: number;
  // Shape properties
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  borderRadius?: number;
  // Text properties
  color?: string;
  fontSize?: number;
}

// Camera Keyframes

export interface CameraKeyframe {
  time: number;   // ms
  x: number;      // Canvas-center X
  y: number;      // Canvas-center Y
  zoom: number;   // 1.0 = normal, 2.0 = 2x zoom
}

// Loop Effects

export type EffectType =
  // Bewegung
  | 'float' | 'pulse' | 'wobble' | 'spin' | 'bounce' | 'shake' | 'heartbeat'
  // Licht & Farbe
  | 'glow' | 'neonFlicker' | 'shine' | 'rainbow' | 'blink'
  // Perspektive
  | 'tilt3d'
  // Verzerrung (SVG-Filter)
  | 'ripple' | 'heatShimmer' | 'emboss' | 'pixelate' | 'chromaSplit' | 'morphBlur'
  // Kombi
  | 'hologram' | 'electrified'
  // Digital
  | 'glitch';

export interface Effect {
  type: EffectType;
  intensity: number;  // 0.1 - 2.0, default 1.0
  speed: number;      // 0.5 - 3.0, default 1.0
  enabled: boolean;
  color?: string;     // Glow color (hex), default '#5681ff'
}

export const EFFECT_DEFINITIONS: Record<EffectType, {
  displayName: string;
  icon: IconDefinition;
  description: string;
}> = {
  // Bewegung
  float:     { displayName: 'Schweben',       icon: faFeather,       description: 'Sanfte Auf/Ab-Bewegung' },
  pulse:     { displayName: 'Pulsieren',      icon: faCircleDot,     description: 'Subtile Skalierung' },
  wobble:    { displayName: 'Wackeln',        icon: faRotate,        description: 'Leichte Rotation' },
  spin:      { displayName: 'Drehen',         icon: faArrowsSpin,    description: 'Langsame Drehung' },
  bounce:    { displayName: 'Hüpfen',         icon: faArrowsUpDown,  description: 'Rhythmisches Hüpfen' },
  shake:     { displayName: 'Schütteln',      icon: faWaveSquare,    description: 'Schnelle Vibration' },
  heartbeat: { displayName: 'Herzschlag',     icon: faHeartPulse,    description: 'Asymmetrisches Pulsieren' },
  // Licht & Farbe
  glow:        { displayName: 'Leuchten',       icon: faSun,           description: 'Pulsierende Kontur' },
  neonFlicker: { displayName: 'Neon-Flackern',  icon: faBolt,          description: 'Defekte Neonröhre' },
  shine:       { displayName: 'Glanz',          icon: faWandSparkles,  description: 'Wandernder Lichtstreifen' },
  rainbow:     { displayName: 'Regenbogen',     icon: faRainbow,       description: 'Farbverschiebung' },
  blink:       { displayName: 'Blinken',        icon: faEye,           description: 'Ein/Aus-Flackern' },
  // Perspektive
  tilt3d: { displayName: '3D-Kippen', icon: faCube, description: 'Perspektivisches Kippen' },
  // Verzerrung (SVG-Filter)
  ripple:      { displayName: 'Wellen',         icon: faWater,             description: 'Wellenförmige Verzerrung' },
  heatShimmer: { displayName: 'Flimmern',       icon: faFire,              description: 'Hitze-Flimmern' },
  emboss:      { displayName: 'Relief',         icon: faDiamond,           description: 'Wandernder Lichtglanz' },
  pixelate:    { displayName: 'Verpixeln',      icon: faTableCells,        description: 'Pulsierender Pixel-Effekt' },
  chromaSplit: { displayName: 'Farbspaltung',   icon: faCircleHalfStroke,  description: 'RGB-Kanal-Versatz' },
  morphBlur:   { displayName: 'Puls-Unschärfe', icon: faCircle,            description: 'Pulsierende Unschärfe' },
  // Kombi
  hologram:    { displayName: 'Hologramm',      icon: faTv,    description: 'Scanlines + Cyan-Glow' },
  electrified: { displayName: 'Elektrisiert',   icon: faGhost, description: 'Vibration + Glow + Flackern' },
  // Digital
  glitch: { displayName: 'Glitch', icon: faSlash, description: 'Digitale Störung' },
};

// Backwards compatibility alias
export type PositionKeyframe = Keyframe;

// Helper: get effective animations array (handles legacy + new format)

export function getAnimations(el: CanvasElement): AnimationConfig[] {
  if (el.animations && el.animations.length > 0) return el.animations;
  if (el.animation && el.animation.preset !== 'none') return [el.animation];
  return [];
}

// Helper Types

export type PartialCanvasElement = Omit<CanvasElement, 'id'>;
