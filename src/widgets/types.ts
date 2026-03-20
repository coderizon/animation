import { ComponentType } from 'react';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

export interface WidgetComponentProps {
  frame: number;
  fps: number;
  durationInFrames: number;
  width: number;
  height: number;
  isPlaying: boolean;
  props?: Record<string, unknown>;
}

export interface WidgetRegistryEntry {
  name: string;
  displayName: string;
  description: string;
  icon: IconDefinition;
  component: ComponentType<WidgetComponentProps>;
  nativeWidth: number;
  nativeHeight: number;
  defaultFps: number;
  defaultDurationInFrames: number;
  defaultElementWidth: number;
  defaultElementHeight: number;
}
