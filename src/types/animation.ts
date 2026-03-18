import { Variants } from 'framer-motion';
import { AnimationPresetName, EasingName } from './project';

// Animation Preset Definition

export interface AnimationPreset {
  name: AnimationPresetName;
  displayName: string;
  description: string;
  icon: string;            // Emoji or icon name
  defaultDuration: number; // ms
  variants: Variants;      // Framer Motion variants
}

// Drag & Drop Types

export interface DragItemAsset {
  type: 'ASSET';
  elementType: 'logo' | 'text' | 'shape' | 'image';
  content: any;
}

export interface DragItemElement {
  type: 'CANVAS_ELEMENT';
  id: string;
  initialX: number;
  initialY: number;
}

export type DragItem = DragItemAsset | DragItemElement;

// Asset Library Types

export interface LogoAsset {
  id: string;
  name: string;
  src: string;
  category?: string;
}

export interface TextAsset {
  id: string;
  name: string;
  template?: string;
}

export interface ShapeAsset {
  id: string;
  name: string;
  shape: 'rectangle' | 'circle' | 'line';
}
