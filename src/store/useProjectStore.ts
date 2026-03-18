import { create } from 'zustand';
import { Project, CanvasElement, PartialCanvasElement, AnimationConfig, WidgetContent } from '../types/project';

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

// RAF playback state (module-level)
let playAnimationFrameId: number | null = null;
let playStartTimestamp: number | null = null;

// Store Interface
interface ProjectStore {
  // State
  project: Project;
  selectedElementIds: string[];
  previewingElementId: string | null;
  isPlayingAll: boolean;
  currentTime: number; // ms

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

  // Selection
  selectElement: (id: string | null) => void;
  toggleSelectElement: (id: string) => void;
  addToSelection: (id: string) => void;
  selectElements: (ids: string[]) => void;
  clearSelection: () => void;

  // Silent updates (no history push, for real-time drag/resize)
  updateElementSilent: (id: string, updates: Partial<CanvasElement>) => void;
  pushSnapshot: (snapshot: Project) => void;

  // Convenience Actions
  updateElementPosition: (id: string, x: number, y: number) => void;
  updateElementSize: (id: string, width: number, height: number) => void;
  updateElementAnimation: (id: string, animation: AnimationConfig | undefined) => void;
  setCurrentTime: (time: number) => void;
  triggerPreview: (id: string) => void;
  playAllAnimations: () => void;
  stopAllAnimations: () => void;

  // Project Management
  loadProject: (project: Project) => void;
  exportProject: () => string;
  importProject: (json: string) => void;
  resetProject: () => void;
  updateProjectName: (name: string) => void;

  // Layer operations
  reorderElements: (fromIndex: number, toIndex: number) => void;
  renameElement: (id: string, name: string) => void;
  toggleElementVisibility: (id: string) => void;
  toggleElementLock: (id: string) => void;

  // Getters
  getSelectedElement: () => CanvasElement | null;
  getSelectedElements: () => CanvasElement[];
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
  selectedElementIds: [],
  previewingElementId: null,
  isPlayingAll: false,
  currentTime: 0,
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
    const state = get();
    const typeCount = state.project.elements.filter((el) => el.type === element.type).length;
    const autoName = `${element.type.charAt(0).toUpperCase() + element.type.slice(1)} ${typeCount + 1}`;

    const newElement: CanvasElement = {
      ...element,
      id: generateId(),
      name: element.name || autoName,
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
      selectedElementIds: [newElement.id],
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
      selectedElementIds: state.selectedElementIds.filter((sid) => sid !== id),
    }));
  },

  // Selection
  selectElement: (id) => {
    set({ selectedElementIds: id ? [id] : [] });
  },

  toggleSelectElement: (id) => {
    set((state) => {
      const ids = state.selectedElementIds;
      if (ids.includes(id)) {
        return { selectedElementIds: ids.filter((sid) => sid !== id) };
      }
      return { selectedElementIds: [...ids, id] };
    });
  },

  addToSelection: (id) => {
    set((state) => {
      if (state.selectedElementIds.includes(id)) return state;
      return { selectedElementIds: [...state.selectedElementIds, id] };
    });
  },

  selectElements: (ids) => {
    set({ selectedElementIds: ids });
  },

  clearSelection: () => {
    set({ selectedElementIds: [] });
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

  setCurrentTime: (time) => {
    set({ currentTime: time });
  },

  triggerPreview: (id) => {
    set({ previewingElementId: id });
    setTimeout(() => {
      set({ previewingElementId: null });
    }, 3000);
  },

  playAllAnimations: () => {
    // Cancel any existing playback
    if (playAnimationFrameId !== null) {
      cancelAnimationFrame(playAnimationFrameId);
    }

    const { project } = get();

    // Calculate max duration
    const maxFramerDuration = project.elements.reduce((max, el) => {
      if (!el.animation || el.type === 'widget') return max;
      const totalTime = (el.animation.delay || 0) + (el.animation.duration || 600);
      return Math.max(max, totalTime);
    }, 0);

    const maxWidgetDuration = project.elements.reduce((max, el) => {
      if (el.type !== 'widget') return max;
      const wc = el.content as WidgetContent;
      const totalMs = (wc.durationInFrames / wc.fps) * 1000;
      return Math.max(max, totalMs);
    }, 0);

    const maxDuration = Math.max(maxFramerDuration, maxWidgetDuration, 3000);

    set({ isPlayingAll: true, selectedElementIds: [], currentTime: 0 });
    playStartTimestamp = null;

    const tick = (timestamp: number) => {
      if (playStartTimestamp === null) playStartTimestamp = timestamp;
      const elapsed = timestamp - playStartTimestamp;

      set({ currentTime: elapsed });

      if (elapsed < maxDuration + 500) {
        playAnimationFrameId = requestAnimationFrame(tick);
      } else {
        set({ isPlayingAll: false, currentTime: 0 });
        playAnimationFrameId = null;
        playStartTimestamp = null;
      }
    };

    playAnimationFrameId = requestAnimationFrame(tick);
  },

  stopAllAnimations: () => {
    if (playAnimationFrameId !== null) {
      cancelAnimationFrame(playAnimationFrameId);
      playAnimationFrameId = null;
      playStartTimestamp = null;
    }
    set({ isPlayingAll: false, currentTime: 0 });
  },

  // Project Management
  loadProject: (project) => {
    set((state) => ({
      ...pushHistory(state),
      project,
      selectedElementIds: [],
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

      // Backfill missing name fields
      const typeCounts: Record<string, number> = {};
      project.elements = project.elements.map((el) => {
        if (!el.name) {
          typeCounts[el.type] = (typeCounts[el.type] || 0) + 1;
          return { ...el, name: `${el.type.charAt(0).toUpperCase() + el.type.slice(1)} ${typeCounts[el.type]}` };
        }
        return el;
      });

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
      selectedElementIds: [],
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

  // Layer operations
  reorderElements: (fromIndex, toIndex) => {
    set((state) => {
      const elements = [...state.project.elements];
      const [moved] = elements.splice(fromIndex, 1);
      elements.splice(toIndex, 0, moved);
      // Re-assign zIndex based on array position
      const reindexed = elements.map((el, i) => ({ ...el, zIndex: i }));
      return {
        ...pushHistory(state),
        project: {
          ...state.project,
          elements: reindexed,
          metadata: { ...state.project.metadata, updatedAt: new Date().toISOString() },
        },
      };
    });
  },

  renameElement: (id, name) => {
    set((state) => ({
      project: {
        ...state.project,
        elements: state.project.elements.map((el) =>
          el.id === id ? { ...el, name } : el
        ),
      },
    }));
  },

  toggleElementVisibility: (id) => {
    set((state) => ({
      ...pushHistory(state),
      project: {
        ...state.project,
        elements: state.project.elements.map((el) =>
          el.id === id ? { ...el, visible: !el.visible } : el
        ),
        metadata: { ...state.project.metadata, updatedAt: new Date().toISOString() },
      },
    }));
  },

  toggleElementLock: (id) => {
    set((state) => ({
      ...pushHistory(state),
      project: {
        ...state.project,
        elements: state.project.elements.map((el) =>
          el.id === id ? { ...el, locked: !el.locked } : el
        ),
        metadata: { ...state.project.metadata, updatedAt: new Date().toISOString() },
      },
    }));
  },

  // Getters
  getSelectedElement: () => {
    const state = get();
    if (state.selectedElementIds.length !== 1) return null;
    return state.project.elements.find((el) => el.id === state.selectedElementIds[0]) || null;
  },

  getSelectedElements: () => {
    const state = get();
    return state.project.elements.filter((el) => state.selectedElementIds.includes(el.id));
  },
}));
