import { create } from 'zustand';
import { Project, CanvasElement, PartialCanvasElement, AnimationConfig } from '../types/project';

// Helper: Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Helper: Create blank project
function createBlankProject(): Project {
  return {
    id: generateId(),
    name: 'Untitled Project',
    version: '1.0',
    canvas: {
      width: 1920,  // YouTube 16:9 format
      height: 1080,
      backgroundColor: '#000000',  // Black background for YouTube
    },
    elements: [],
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
}

const MAX_HISTORY = 50;

// Store Interface
interface ProjectStore {
  // State
  project: Project;
  selectedElementId: string | null;
  previewingElementId: string | null;
  isPlayingAll: boolean;

  // History (Undo/Redo)
  history: Project[];
  future: Project[];
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Element Actions
  addElement: (element: PartialCanvasElement) => void;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  deleteElement: (id: string) => void;
  selectElement: (id: string | null) => void;

  // Silent updates (no history push, for real-time drag/resize)
  updateElementSilent: (id: string, updates: Partial<CanvasElement>) => void;
  pushSnapshot: (snapshot: Project) => void;

  // Convenience Actions
  updateElementPosition: (id: string, x: number, y: number) => void;
  updateElementSize: (id: string, width: number, height: number) => void;
  updateElementAnimation: (id: string, animation: AnimationConfig | undefined) => void;
  triggerPreview: (id: string) => void;
  playAllAnimations: () => void;
  stopAllAnimations: () => void;

  // Project Management
  loadProject: (project: Project) => void;
  exportProject: () => string;
  importProject: (json: string) => void;
  resetProject: () => void;
  updateProjectName: (name: string) => void;

  // Getters
  getSelectedElement: () => CanvasElement | null;
}

// Helper to push current project to history
function pushHistory(state: ProjectStore): { history: Project[]; future: Project[] } {
  const snapshot = JSON.parse(JSON.stringify(state.project));
  const history = [...state.history, snapshot];
  if (history.length > MAX_HISTORY) history.shift();
  return { history, future: [] };
}

// Zustand Store
export const useProjectStore = create<ProjectStore>((set, get) => ({
  // Initial State
  project: createBlankProject(),
  selectedElementId: null,
  previewingElementId: null,
  isPlayingAll: false,
  history: [],
  future: [],

  // Undo/Redo
  undo: () => {
    const { history, project } = get();
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    const newHistory = history.slice(0, -1);
    set({
      project: previous,
      history: newHistory,
      future: [JSON.parse(JSON.stringify(project)), ...get().future],
    });
  },

  redo: () => {
    const { future, project } = get();
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);
    set({
      project: next,
      future: newFuture,
      history: [...get().history, JSON.parse(JSON.stringify(project))],
    });
  },

  canUndo: () => get().history.length > 0,
  canRedo: () => get().future.length > 0,

  // Element Actions
  addElement: (element) => {
    const newElement: CanvasElement = {
      ...element,
      id: generateId(),
    };

    set((state) => ({
      ...pushHistory(state),
      project: {
        ...state.project,
        elements: [...state.project.elements, newElement],
        metadata: {
          ...state.project.metadata,
          updatedAt: new Date().toISOString(),
        },
      },
      selectedElementId: newElement.id,
    }));
  },

  updateElement: (id, updates) => {
    set((state) => ({
      ...pushHistory(state),
      project: {
        ...state.project,
        elements: state.project.elements.map((el) =>
          el.id === id ? { ...el, ...updates } : el
        ),
        metadata: {
          ...state.project.metadata,
          updatedAt: new Date().toISOString(),
        },
      },
    }));
  },

  deleteElement: (id) => {
    set((state) => ({
      ...pushHistory(state),
      project: {
        ...state.project,
        elements: state.project.elements.filter((el) => el.id !== id),
        metadata: {
          ...state.project.metadata,
          updatedAt: new Date().toISOString(),
        },
      },
      selectedElementId: state.selectedElementId === id ? null : state.selectedElementId,
    }));
  },

  selectElement: (id) => {
    set({ selectedElementId: id });
  },

  // Silent updates (no history push, for real-time drag/resize)
  updateElementSilent: (id, updates) => {
    set((state) => ({
      project: {
        ...state.project,
        elements: state.project.elements.map((el) =>
          el.id === id ? { ...el, ...updates } : el
        ),
      },
    }));
  },

  pushSnapshot: (snapshot) => {
    set((state) => {
      const history = [...state.history, snapshot];
      if (history.length > MAX_HISTORY) history.shift();
      return { history, future: [] };
    });
  },

  // Convenience Actions
  updateElementPosition: (id, x, y) => {
    get().updateElement(id, { position: { x, y } });
  },

  updateElementSize: (id, width, height) => {
    get().updateElement(id, { size: { width, height } });
  },

  updateElementAnimation: (id, animation) => {
    get().updateElement(id, { animation });
  },

  triggerPreview: (id) => {
    set({ previewingElementId: id });
    setTimeout(() => {
      set({ previewingElementId: null });
    }, 3000);
  },

  playAllAnimations: () => {
    set({ isPlayingAll: true, selectedElementId: null });

    const { project } = get();
    const maxDuration = project.elements.reduce((max, el) => {
      if (!el.animation) return max;
      const totalTime = (el.animation.delay || 0) + (el.animation.duration || 600);
      return Math.max(max, totalTime);
    }, 0);

    setTimeout(() => {
      set({ isPlayingAll: false });
    }, maxDuration + 1000);
  },

  stopAllAnimations: () => {
    set({ isPlayingAll: false });
  },

  // Project Management
  loadProject: (project) => {
    set((state) => ({
      ...pushHistory(state),
      project,
      selectedElementId: null,
    }));
  },

  exportProject: () => {
    return JSON.stringify(get().project, null, 2);
  },

  importProject: (json) => {
    try {
      const project = JSON.parse(json) as Project;

      if (!project.id || !project.canvas || !Array.isArray(project.elements)) {
        throw new Error('Invalid project format');
      }

      get().loadProject(project);
    } catch (error) {
      console.error('Failed to import project:', error);
      throw error;
    }
  },

  resetProject: () => {
    set((state) => ({
      ...pushHistory(state),
      project: createBlankProject(),
      selectedElementId: null,
    }));
  },

  updateProjectName: (name) => {
    set((state) => ({
      project: {
        ...state.project,
        name,
        metadata: {
          ...state.project.metadata,
          updatedAt: new Date().toISOString(),
        },
      },
    }));
  },

  // Getters
  getSelectedElement: () => {
    const state = get();
    if (!state.selectedElementId) return null;
    return state.project.elements.find((el) => el.id === state.selectedElementId) || null;
  },
}));
