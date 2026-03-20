import {
  AnimationConfig,
  CanvasElement,
  Project,
  ShapeContent,
  TextContent,
  WidgetContent,
} from '../types/project';

export interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  data: Project;
}

const now = () => new Date().toISOString();

function baseProject(id: string, name: string, elements: CanvasElement[]): Project {
  return {
    id,
    name,
    version: '1.0',
    canvas: {
      width: 1920,
      height: 1080,
      backgroundColor: '#000000',
    },
    elements,
    metadata: {
      createdAt: now(),
      updatedAt: now(),
    },
  };
}

function textElement(
  id: string,
  text: string,
  position: { x: number; y: number },
  size: { width: number; height: number },
  content: Omit<TextContent, 'type' | 'text'>,
  animation?: AnimationConfig,
): CanvasElement {
  return {
    id,
    type: 'text',
    name: text,
    position,
    size,
    rotation: 0,
    zIndex: 0,
    content: { type: 'text', text, ...content },
    animations: animation ? [animation] : undefined,
    visible: true,
    locked: false,
  };
}

function logoElement(
  id: string,
  name: string,
  src: string,
  position: { x: number; y: number },
  size: { width: number; height: number },
  animation?: AnimationConfig,
): CanvasElement {
  return {
    id,
    type: 'logo',
    name,
    position,
    size,
    rotation: 0,
    zIndex: 0,
    content: { type: 'logo', src, alt: name },
    animations: animation ? [animation] : undefined,
    visible: true,
    locked: false,
  };
}

function shapeElement(
  id: string,
  name: string,
  position: { x: number; y: number },
  size: { width: number; height: number },
  content: Omit<ShapeContent, 'type'>,
  animation?: AnimationConfig,
): CanvasElement {
  return {
    id,
    type: 'shape',
    name,
    position,
    size,
    rotation: 0,
    zIndex: 0,
    content: { type: 'shape', ...content },
    animations: animation ? [animation] : undefined,
    visible: true,
    locked: false,
  };
}

function widgetElement(
  id: string,
  name: string,
  widgetName: string,
  position: { x: number; y: number },
  size: { width: number; height: number },
  fps: number,
  durationInFrames: number,
): CanvasElement {
  const content: WidgetContent = {
    type: 'widget',
    widgetName,
    fps,
    durationInFrames,
  };

  return {
    id,
    type: 'widget',
    name,
    position,
    size,
    rotation: 0,
    zIndex: 0,
    content,
    visible: true,
    locked: false,
  };
}

function stack(elements: CanvasElement[]): CanvasElement[] {
  return elements.map((element, index) => ({
    ...element,
    zIndex: index,
  }));
}

const introHero = baseProject(
  'template-intro-hero',
  'Intro Hero',
  stack([
    shapeElement(
      'intro-bg',
      'Backdrop',
      { x: 160, y: 140 },
      { width: 1600, height: 800 },
      { shape: 'rectangle', fill: '#08111f' },
    ),
    shapeElement(
      'intro-accent',
      'Accent',
      { x: 128, y: 152 },
      { width: 12, height: 776 },
      { shape: 'rectangle', fill: '#4f73ff' },
      { preset: 'slideInLeft', delay: 0, duration: 700, easing: 'easeOut' },
    ),
    logoElement(
      'intro-logo',
      'OpenAI',
      '/assets/openai.svg',
      { x: 250, y: 230 },
      { width: 150, height: 150 },
      { preset: 'scalePop', delay: 150, duration: 800, easing: 'spring' },
    ),
    textElement(
      'intro-title',
      'Animation Builder',
      { x: 250, y: 410 },
      { width: 1180, height: 120 },
      {
        fontSize: 96,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#f7f9ff',
        fontWeight: 800,
      },
      { preset: 'fadeIn', delay: 250, duration: 700, easing: 'easeOut' },
    ),
    textElement(
      'intro-subtitle',
      'Story-driven motion, timeline control and reusable widgets.',
      { x: 252, y: 548 },
      { width: 1120, height: 64 },
      {
        fontSize: 28,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#b8c4dd',
        fontWeight: 500,
      },
      { preset: 'slideInBottom', delay: 420, duration: 600, easing: 'easeOut' },
    ),
    shapeElement(
      'intro-chip',
      'Status Chip',
      { x: 250, y: 650 },
      { width: 240, height: 56 },
      { shape: 'rectangle', fill: '#13233d', stroke: '#4f73ff', strokeWidth: 2 },
      { preset: 'fadeIn', delay: 520, duration: 500, easing: 'easeOut' },
    ),
    textElement(
      'intro-chip-text',
      'Preview ready',
      { x: 250, y: 650 },
      { width: 240, height: 56 },
      {
        fontSize: 20,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#e8f0fe',
        fontWeight: 700,
      },
      { preset: 'fadeIn', delay: 620, duration: 400, easing: 'easeOut' },
    ),
  ]),
);

const networkLaunch = baseProject(
  'template-network-launch',
  'Network Launch',
  stack([
    widgetElement(
      'network-widget',
      'Network Visualization',
      'networkVisualization',
      { x: 0, y: 0 },
      { width: 1920, height: 1080 },
      30,
      150,
    ),
    shapeElement(
      'network-overlay',
      'Overlay',
      { x: 0, y: 0 },
      { width: 1920, height: 1080 },
      { shape: 'rectangle', fill: 'rgba(3, 9, 22, 0.42)' },
    ),
    textElement(
      'network-title',
      'Live network growth',
      { x: 120, y: 106 },
      { width: 860, height: 96 },
      {
        fontSize: 74,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#f3f7ff',
        fontWeight: 800,
      },
      { preset: 'fadeIn', delay: 120, duration: 600, easing: 'easeOut' },
    ),
    textElement(
      'network-copy',
      'Use the timeline to change the reveal speed and layer order.',
      { x: 124, y: 214 },
      { width: 980, height: 56 },
      {
        fontSize: 24,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#b8c4dd',
        fontWeight: 500,
      },
      { preset: 'slideInBottom', delay: 280, duration: 500, easing: 'easeOut' },
    ),
    logoElement(
      'network-brand',
      'Anthropic',
      '/assets/anthropic.svg',
      { x: 1608, y: 78 },
      { width: 180, height: 180 },
      { preset: 'scalePop', delay: 300, duration: 700, easing: 'spring' },
    ),
  ]),
);

const serverPulse = baseProject(
  'template-server-pulse',
  'Server Pulse',
  stack([
    shapeElement(
      'server-bg',
      'Backdrop',
      { x: 0, y: 0 },
      { width: 1920, height: 1080 },
      { shape: 'rectangle', fill: '#07101a' },
    ),
    widgetElement(
      'server-widget',
      'Server Animation',
      'serverAnimation',
      { x: 0, y: 156 },
      { width: 1920, height: 720 },
      30,
      150,
    ),
    shapeElement(
      'server-glow',
      'Glow',
      { x: 520, y: 220 },
      { width: 880, height: 440 },
      { shape: 'circle', fill: 'rgba(79, 115, 255, 0.16)' },
      { preset: 'pulse', delay: 0, duration: 1200, easing: 'easeInOut' },
    ),
    textElement(
      'server-title',
      'Server pulse sequence',
      { x: 140, y: 72 },
      { width: 940, height: 88 },
      {
        fontSize: 68,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#f7f9ff',
        fontWeight: 800,
      },
      { preset: 'slideInLeft', delay: 120, duration: 650, easing: 'easeOut' },
    ),
    textElement(
      'server-copy',
      'A template built for the player mode: run it, scrub it and adjust timings.',
      { x: 144, y: 150 },
      { width: 1120, height: 54 },
      {
        fontSize: 22,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#b8c4dd',
        fontWeight: 500,
      },
      { preset: 'fadeIn', delay: 300, duration: 500, easing: 'easeOut' },
    ),
    logoElement(
      'server-logo',
      'OpenAI',
      '/assets/openai.svg',
      { x: 1680, y: 64 },
      { width: 140, height: 140 },
      { preset: 'scalePop', delay: 320, duration: 650, easing: 'spring' },
    ),
  ]),
);

export const templates: Record<string, TemplateInfo> = {
  [introHero.id]: {
    id: introHero.id,
    name: introHero.name,
    description: 'A compact intro scene with logo, headline and CTA chip.',
    icon: 'I',
    data: introHero,
  },
  [networkLaunch.id]: {
    id: networkLaunch.id,
    name: networkLaunch.name,
    description: 'Network widget showcase with an overlay and brand card.',
    icon: 'N',
    data: networkLaunch,
  },
  [serverPulse.id]: {
    id: serverPulse.id,
    name: serverPulse.name,
    description: 'Player-friendly server scene with title and motion.',
    icon: 'S',
    data: serverPulse,
  },
};

export function loadTemplate(templateId: string): Project {
  const template = templates[templateId];
  if (!template) {
    throw new Error(`Template "${templateId}" not found`);
  }

  return JSON.parse(JSON.stringify(template.data));
}

export function getTemplateList(): TemplateInfo[] {
  return Object.values(templates);
}
