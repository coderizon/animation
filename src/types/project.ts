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

  // Animation
  animation?: AnimationConfig;

  // Keyframes (sorted by time)
  keyframes?: Keyframe[];

  // Crop (inset percentages 0-100)
  clip?: { top: number; right: number; bottom: number; left: number };

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
  | 'fadeIn'
  | 'fadeOut'
  | 'slideInLeft'
  | 'slideInRight'
  | 'slideInTop'
  | 'slideInBottom'
  | 'scaleIn'
  | 'scaleOut'
  | 'bounce'
  | 'rotate'
  | 'pulse'
  | 'shake'
  | 'flipIn';

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
  // Text properties
  color?: string;
  fontSize?: number;
}

// Backwards compatibility alias
export type PositionKeyframe = Keyframe;

// Helper Types

export type PartialCanvasElement = Omit<CanvasElement, 'id'>;
