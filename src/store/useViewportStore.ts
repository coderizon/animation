import { create } from 'zustand';

export interface SnapGuide {
  orientation: 'horizontal' | 'vertical';
  position: number;
  start: number;
  end: number;
}

interface ViewportStore {
  zoom: number;
  panOffset: { x: number; y: number };
  snapGuides: SnapGuide[];
  cameraEditMode: boolean;

  setZoom: (zoom: number) => void;
  setPanOffset: (offset: { x: number; y: number }) => void;
  setSnapGuides: (guides: SnapGuide[]) => void;
  toggleCameraEditMode: () => void;

  /** Zoom centered on a point (screen coords relative to container) */
  zoomAtPoint: (newZoom: number, screenX: number, screenY: number) => void;

  /** Fit canvas to container */
  fitToScreen: (containerW: number, containerH: number, canvasW: number, canvasH: number) => void;

  /** Reset to defaults */
  resetViewport: () => void;
}

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 4;

function clampZoom(z: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
}

export const useViewportStore = create<ViewportStore>((set, get) => ({
  zoom: 0.5,
  panOffset: { x: 0, y: 0 },
  snapGuides: [],
  cameraEditMode: false,

  setZoom: (zoom) => set({ zoom: clampZoom(zoom) }),
  toggleCameraEditMode: () => set((s) => ({ cameraEditMode: !s.cameraEditMode })),

  setPanOffset: (offset) => set({ panOffset: offset }),

  setSnapGuides: (guides) => set({ snapGuides: guides }),

  zoomAtPoint: (newZoom, screenX, screenY) => {
    const clamped = clampZoom(newZoom);
    const { zoom, panOffset } = get();

    // Point in canvas coords before zoom
    const canvasX = (screenX - panOffset.x) / zoom;
    const canvasY = (screenY - panOffset.y) / zoom;

    // After zoom, that same canvas point should be at the same screen position
    const newPanX = screenX - canvasX * clamped;
    const newPanY = screenY - canvasY * clamped;

    set({ zoom: clamped, panOffset: { x: newPanX, y: newPanY } });
  },

  fitToScreen: (containerW, containerH, canvasW, canvasH) => {
    const padding = 28;
    const availW = containerW - padding;
    const availH = containerH - padding;
    const scale = clampZoom(Math.min(availW / canvasW, availH / canvasH, 1));

    const panX = (containerW - canvasW * scale) / 2;
    const panY = (containerH - canvasH * scale) / 2;

    set({ zoom: scale, panOffset: { x: panX, y: panY } });
  },

  resetViewport: () => set({ zoom: 0.5, panOffset: { x: 0, y: 0 }, snapGuides: [] }),
}));
