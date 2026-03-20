/**
 * Script API — sandboxed interface exposed to user scripts as `api`.
 * Wraps store actions with a friendlier, return-value-based API.
 */
import { useProjectStore } from '../store/useProjectStore';
import type {
  AnimationPresetName,
  EasingName,
  Keyframe,
  CameraKeyframe,
  Effect,
  EffectType,
} from '../types/project';

// Helper types for script authors
interface ElementOptions {
  type: 'shape' | 'text' | 'logo' | 'image' | 'widget';
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  name?: string;
  // Shape
  shape?: 'rectangle' | 'circle' | 'line' | 'triangle';
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  borderRadius?: number;
  // Text
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  fontWeight?: number;
  // Logo / Image
  src?: string;
  // Widget
  widgetName?: string;
  fps?: number;
  durationInFrames?: number;
  props?: Record<string, unknown>;
}

interface AnimOptions {
  preset: AnimationPresetName;
  delay?: number;
  duration?: number;
  easing?: EasingName;
}

interface KfOptions {
  time: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  borderRadius?: number;
  color?: string;
  fontSize?: number;
}

function buildContent(opts: ElementOptions) {
  switch (opts.type) {
    case 'shape':
      return {
        type: 'shape' as const,
        shape: opts.shape || 'rectangle',
        fill: opts.fill || '#4a90d9',
        stroke: opts.stroke,
        strokeWidth: opts.strokeWidth,
        borderRadius: opts.borderRadius,
      };
    case 'text':
      return {
        type: 'text' as const,
        text: opts.text || 'Text',
        fontSize: opts.fontSize || 48,
        fontFamily: opts.fontFamily || 'Inter, sans-serif',
        color: opts.color || '#ffffff',
        fontWeight: opts.fontWeight,
      };
    case 'logo':
      return {
        type: 'logo' as const,
        src: opts.src || '/assets/placeholder.svg',
        alt: opts.name || 'Logo',
      };
    case 'image':
      return {
        type: 'image' as const,
        src: opts.src || '',
        alt: opts.name || 'Image',
      };
    case 'widget':
      return {
        type: 'widget' as const,
        widgetName: opts.widgetName || '',
        fps: opts.fps || 30,
        durationInFrames: opts.durationInFrames || 150,
        props: opts.props,
      };
    default:
      return {
        type: 'shape' as const,
        shape: 'rectangle' as const,
        fill: '#4a90d9',
      };
  }
}

export function createScriptApi() {
  const store = useProjectStore.getState;

  // Track last-added element id for return
  let lastAddedId: string | null = null;

  const api = {
    /**
     * Add a new element to the canvas. Returns its id.
     */
    addElement(opts: ElementOptions): string {
      const s = store();
      const prevIds = new Set(s.project.elements.map((e) => e.id));
      s.addElement({
        type: opts.type,
        position: { x: opts.x, y: opts.y },
        size: { width: opts.width || 200, height: opts.height || 200 },
        rotation: opts.rotation || 0,
        zIndex: s.project.elements.length,
        content: buildContent(opts),
        visible: true,
        locked: false,
        name: opts.name,
      } as any);
      // Find the newly added element
      const after = store().project.elements;
      const newEl = after.find((e) => !prevIds.has(e.id));
      lastAddedId = newEl?.id || null;
      return lastAddedId || '';
    },

    /**
     * Add an animation to an element.
     */
    addAnimation(elementId: string, opts: AnimOptions) {
      store().addAnimation(elementId, {
        preset: opts.preset,
        delay: opts.delay ?? 0,
        duration: opts.duration ?? 600,
        easing: opts.easing ?? 'easeOut',
      });
    },

    /**
     * Add a keyframe to an element.
     */
    addKeyframe(elementId: string, kf: KfOptions) {
      store().addKeyframe(elementId, kf as Keyframe);
    },

    /**
     * Update element properties.
     */
    updateElement(elementId: string, updates: Record<string, any>) {
      store().updateElement(elementId, updates);
    },

    /**
     * Duplicate an element with a time offset in ms.
     */
    duplicateElement(elementId: string, timeOffsetMs: number): void {
      store().duplicateElement(elementId, timeOffsetMs);
    },

    /**
     * Delete an element.
     */
    deleteElement(elementId: string) {
      store().deleteElement(elementId);
    },

    /**
     * Add an effect to an element.
     */
    addEffect(elementId: string, type: EffectType, intensity?: number, speed?: number) {
      store().addEffect(elementId, {
        type,
        intensity: intensity ?? 1.0,
        speed: speed ?? 1.0,
        enabled: true,
      } as Effect);
    },

    /**
     * Add a camera keyframe.
     */
    addCameraKeyframe(kf: CameraKeyframe) {
      store().addCameraKeyframe(kf);
    },

    /**
     * Layer ordering.
     */
    bringToFront(elementId: string) { store().bringToFront(elementId); },
    sendToBack(elementId: string) { store().sendToBack(elementId); },

    /**
     * Playback controls.
     */
    play() { store().playAllAnimations(); },
    pause() { store().pauseAllAnimations(); },
    stop() { store().stopAllAnimations(); },

    /**
     * Get all elements (read-only snapshot).
     */
    getElements() {
      return JSON.parse(JSON.stringify(store().project.elements));
    },

    /**
     * Get element by id.
     */
    getElement(id: string) {
      const el = store().project.elements.find((e) => e.id === id);
      return el ? JSON.parse(JSON.stringify(el)) : null;
    },

    /**
     * Get all element ids.
     */
    getElementIds(): string[] {
      return store().project.elements.map((e) => e.id);
    },

    /**
     * Select element(s).
     */
    select(id: string) { store().selectElement(id); },
    selectAll() {
      store().selectElements(store().project.elements.map((e) => e.id));
    },
    clearSelection() { store().clearSelection(); },

    /**
     * Wait (for sequencing in async scripts). Returns a promise.
     */
    wait(ms: number): Promise<void> {
      return new Promise((resolve) => setTimeout(resolve, ms));
    },

    /**
     * Log to the script console output.
     */
    _logs: [] as string[],
    log(...args: any[]) {
      api._logs.push(args.map(String).join(' '));
    },
  };

  return api;
}

/** TypeScript type declarations for Monaco intellisense */
export const SCRIPT_API_TYPES = `
interface ElementOptions {
  type: 'shape' | 'text' | 'logo' | 'image' | 'widget';
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  name?: string;
  // Shape
  shape?: 'rectangle' | 'circle' | 'line' | 'triangle';
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  borderRadius?: number;
  // Text
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  fontWeight?: number;
  // Logo / Image
  src?: string;
  // Widget
  widgetName?: string;
  fps?: number;
  durationInFrames?: number;
  props?: Record<string, unknown>;
}

interface AnimOptions {
  preset: 'none' | 'fadeIn' | 'fadeOut' | 'softFadeOut'
    | 'slideInLeft' | 'slideInRight' | 'slideInTop' | 'slideInBottom'
    | 'slideOutLeft' | 'slideOutRight'
    | 'scaleIn' | 'scaleOut' | 'scalePop' | 'zoomIn' | 'zoomOut' | 'cameraPush'
    | 'rotate' | 'rotationReveal' | 'flipIn' | 'flipInY'
    | 'bounce' | 'elasticIn' | 'elasticScale' | 'pulse' | 'shake'
    | 'wipeRight' | 'wipeDown' | 'wipeLeft' | 'barReveal' | 'maskCircle'
    | 'strokeDraw' | 'shapeAssembly'
    | 'glitch' | 'rgbSplit' | 'scanlines'
    | 'lightSweep' | 'lightShadow'
    | 'motionBlur' | 'slowDrift' | 'parallaxDepth' | 'subtle3D'
    | 'particleBuild' | 'particleDissolve'
    | 'explode' | 'liquidReveal' | 'smokeReveal' | 'depthOfField';
  delay?: number;
  duration?: number;
  easing?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'spring' | 'bounce';
}

interface KfOptions {
  time: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  borderRadius?: number;
  color?: string;
  fontSize?: number;
}

type EffectType = 'float' | 'pulse' | 'wobble' | 'spin' | 'bounce' | 'shake' | 'heartbeat'
  | 'glow' | 'neonFlicker' | 'shine' | 'rainbow' | 'blink'
  | 'tilt3d' | 'glitch' | 'ripple' | 'heatShimmer' | 'emboss'
  | 'pixelate' | 'chromaSplit' | 'morphBlur' | 'hologram' | 'electrified';

interface CameraKeyframe {
  time: number;
  x: number;
  y: number;
  zoom: number;
}

declare const api: {
  /** Add element to canvas. Returns element id. */
  addElement(opts: ElementOptions): string;
  /** Add animation preset to an element. */
  addAnimation(elementId: string, opts: AnimOptions): void;
  /** Add a keyframe to an element. */
  addKeyframe(elementId: string, kf: KfOptions): void;
  /** Update element properties. */
  updateElement(elementId: string, updates: Record<string, any>): void;
  /** Duplicate element with time offset in ms. */
  duplicateElement(elementId: string, timeOffsetMs: number): void;
  /** Delete an element. */
  deleteElement(elementId: string): void;
  /** Add a continuous effect. */
  addEffect(elementId: string, type: EffectType, intensity?: number, speed?: number): void;
  /** Add a camera keyframe. */
  addCameraKeyframe(kf: CameraKeyframe): void;
  /** Bring element to front. */
  bringToFront(elementId: string): void;
  /** Send element to back. */
  sendToBack(elementId: string): void;
  /** Start playback. */
  play(): void;
  /** Pause playback. */
  pause(): void;
  /** Stop playback (reset to 0). */
  stop(): void;
  /** Get all elements (read-only copy). */
  getElements(): any[];
  /** Get element by id (read-only copy). */
  getElement(id: string): any | null;
  /** Get all element ids. */
  getElementIds(): string[];
  /** Select an element. */
  select(id: string): void;
  /** Select all elements. */
  selectAll(): void;
  /** Clear selection. */
  clearSelection(): void;
  /** Wait ms (for async scripts). */
  wait(ms: number): Promise<void>;
  /** Log to script console. */
  log(...args: any[]): void;
};
`;
