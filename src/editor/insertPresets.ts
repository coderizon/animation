import { LogoAsset } from '../types/animation';
import { PartialCanvasElement, Project } from '../types/project';
import { WidgetRegistryEntry } from '../widgets/types';

export const imagePlaceholderSrc = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
    <rect width="640" height="360" fill="#142033"/>
    <rect x="24" y="24" width="592" height="312" rx="24" fill="#1d2d46" stroke="#4f73ff" stroke-width="4"/>
    <circle cx="200" cy="140" r="34" fill="#8ddcff"/>
    <path d="M84 276l118-112 88 84 72-58 138 86H84z" fill="#4f73ff"/>
    <path d="M246 276l64-74 54 46 40-34 78 62H246z" fill="#8ddcff"/>
  </svg>`,
)}`;

export interface ShapeInsertDef {
  id: string;
  label: string;
  shape: 'rectangle' | 'circle' | 'line' | 'triangle';
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  borderRadius?: number;
  defaultWidth: number;
  defaultHeight: number;
  group: 'filled' | 'outline';
}

export const filledShapeDefs: ShapeInsertDef[] = [
  { id: 'rect', label: 'Rectangle', shape: 'rectangle', fill: '#2196F3', defaultWidth: 200, defaultHeight: 120, group: 'filled' },
  { id: 'rounded-rect', label: 'Rounded Rect', shape: 'rectangle', fill: '#2196F3', borderRadius: 16, defaultWidth: 200, defaultHeight: 120, group: 'filled' },
  { id: 'circle', label: 'Circle', shape: 'circle', fill: '#4CAF50', defaultWidth: 120, defaultHeight: 120, group: 'filled' },
  { id: 'line', label: 'Line', shape: 'line', fill: '#FF9800', defaultWidth: 200, defaultHeight: 4, group: 'filled' },
  { id: 'triangle', label: 'Triangle', shape: 'triangle', fill: '#9C27B0', defaultWidth: 140, defaultHeight: 120, group: 'filled' },
];

export const outlineShapeDefs: ShapeInsertDef[] = [
  { id: 'rect-outline', label: 'Rect Outline', shape: 'rectangle', fill: 'transparent', stroke: '#FFFFFF', strokeWidth: 3, defaultWidth: 200, defaultHeight: 120, group: 'outline' },
  { id: 'rounded-rect-outline', label: 'Rounded Outline', shape: 'rectangle', fill: 'transparent', stroke: '#FFFFFF', strokeWidth: 3, borderRadius: 16, defaultWidth: 200, defaultHeight: 120, group: 'outline' },
  { id: 'circle-outline', label: 'Circle Outline', shape: 'circle', fill: 'transparent', stroke: '#FFFFFF', strokeWidth: 3, defaultWidth: 120, defaultHeight: 120, group: 'outline' },
  { id: 'triangle-outline', label: 'Triangle Outline', shape: 'triangle', fill: 'transparent', stroke: '#FFFFFF', strokeWidth: 3, defaultWidth: 140, defaultHeight: 120, group: 'outline' },
];

export const allShapeDefs = [...filledShapeDefs, ...outlineShapeDefs];
export const quickShapeIds = ['rect', 'circle', 'triangle', 'line'];

function getInsertPosition(
  project: Project,
  size: { width: number; height: number },
  cascadeIndex: number = project.elements.length,
) {
  const cascade = cascadeIndex % 6;
  const baseX = Math.max((project.canvas.width - size.width) / 2, 0);
  const baseY = Math.max((project.canvas.height - size.height) / 2, 0);
  const maxX = Math.max(project.canvas.width - size.width, 0);
  const maxY = Math.max(project.canvas.height - size.height, 0);

  return {
    x: Math.min(baseX + cascade * 28, maxX),
    y: Math.min(baseY + cascade * 22, maxY),
  };
}

export function createShapeInsert(project: Project, def: ShapeInsertDef): PartialCanvasElement {
  return {
    type: 'shape',
    name: def.label,
    position: getInsertPosition(project, { width: def.defaultWidth, height: def.defaultHeight }),
    size: { width: def.defaultWidth, height: def.defaultHeight },
    rotation: 0,
    zIndex: project.elements.length,
    content: {
      type: 'shape',
      shape: def.shape,
      fill: def.fill,
      stroke: def.stroke,
      strokeWidth: def.strokeWidth,
      borderRadius: def.borderRadius,
    },
    visible: true,
    locked: false,
  };
}

export function createTextInsert(project: Project): PartialCanvasElement {
  const size = { width: 420, height: 90 };
  return {
    type: 'text',
    name: 'Text',
    position: getInsertPosition(project, size),
    size,
    rotation: 0,
    zIndex: project.elements.length,
    content: {
      type: 'text',
      text: 'Text',
      fontSize: 54,
      fontFamily: 'sans-serif',
      color: '#ffffff',
      fontWeight: 700,
    },
    visible: true,
    locked: false,
  };
}

export function createImageInsert(project: Project): PartialCanvasElement {
  const size = { width: 320, height: 180 };
  return {
    type: 'image',
    name: 'Bild',
    position: getInsertPosition(project, size),
    size,
    rotation: 0,
    zIndex: project.elements.length,
    content: {
      type: 'image',
      src: imagePlaceholderSrc,
      alt: 'Placeholder image',
    },
    visible: true,
    locked: false,
  };
}

export function createWidgetInsert(project: Project, entry: WidgetRegistryEntry): PartialCanvasElement {
  const size = {
    width: entry.defaultElementWidth,
    height: entry.defaultElementHeight,
  };

  return {
    type: 'widget',
    name: entry.displayName || entry.name,
    position: getInsertPosition(project, size),
    size,
    rotation: 0,
    zIndex: project.elements.length,
    content: {
      type: 'widget',
      widgetName: entry.name,
      fps: entry.defaultFps,
      durationInFrames: entry.defaultDurationInFrames,
    },
    visible: true,
    locked: false,
  };
}

export function createLogoInsert(project: Project, asset: LogoAsset): PartialCanvasElement {
  const size = { width: 180, height: 180 };
  return {
    type: 'logo',
    name: asset.name,
    position: getInsertPosition(project, size),
    size,
    rotation: 0,
    zIndex: project.elements.length,
    content: {
      type: 'logo',
      src: asset.src,
      alt: asset.name,
    },
    visible: true,
    locked: false,
  };
}
