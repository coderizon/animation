import { create } from 'zustand';
import { Project, Scene, SceneTransition, CanvasElement, PartialCanvasElement, AnimationConfig, Keyframe, CameraKeyframe, Effect } from '../types/project';
import { buildTimeline } from '../player/timeline';

// Helper: Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Helper: Create blank scene
function createBlankScene(name = 'Szene 1', canvasWidth = 1920, canvasHeight = 1080): Scene {
  return {
    id: generateId(),
    name,
    elements: [],
    cameraKeyframes: [{ time: 0, x: canvasWidth / 2, y: canvasHeight / 2, zoomX: 1.0, zoomY: 1.0 }],
  };
}

// Helper: Create blank project
export function createBlankProject(): Project {
  const scene = createBlankScene();
  return {
    id: generateId(),
    name: 'Untitled Project',
    version: '1.0',
    canvas: {
      width: 1920,
      height: 1080,
      backgroundColor: '#000000',
    },
    scenes: [scene],
    activeSceneId: scene.id,
    elements: scene.elements,
    cameraKeyframes: scene.cameraKeyframes,
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
}

// Helper: Ensure project has scenes (migrate old format)
function ensureScenes(project: Project): Project {
  if (project.scenes && project.scenes.length > 0) {
    // Sync elements/cameraKeyframes to active scene view
    const activeScene = project.scenes.find(s => s.id === project.activeSceneId) || project.scenes[0];
    return {
      ...project,
      activeSceneId: activeScene.id,
      elements: activeScene.elements,
      cameraKeyframes: activeScene.cameraKeyframes,
    };
  }
  // Legacy project without scenes — wrap existing elements in a scene
  const scene: Scene = {
    id: generateId(),
    name: 'Szene 1',
    elements: project.elements || [],
    cameraKeyframes: project.cameraKeyframes || [],
  };
  return {
    ...project,
    scenes: [scene],
    activeSceneId: scene.id,
  };
}

// Helper: Update active scene's elements/cameraKeyframes from project.elements
export function syncProjectToActiveScene(project: Project): Project {
  const scenes = project.scenes.map(s =>
    s.id === project.activeSceneId
      ? { ...s, elements: project.elements, cameraKeyframes: project.cameraKeyframes }
      : s
  );
  return { ...project, scenes };
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
  playbackState: 'stopped' | 'playing' | 'paused';
  isPlayingAll: boolean; // computed: playbackState === 'playing'
  currentTime: number; // ms
  croppingElementId: string | null;
  contextMenu: { x: number; y: number; elementId: string } | null;
  lastDragStartPosition: { elementId: string; x: number; y: number } | null;
  clipboard: CanvasElement | null;

  // History (Undo/Redo)
  history: Project[];
  future: Project[];
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Element Actions
  addElement: (element: PartialCanvasElement) => void;
  duplicateElement: (id: string, timeOffsetMs: number) => void;
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
  pauseAllAnimations: () => void;
  stopAllAnimations: () => void;

  // Project Management
  loadProject: (project: Project) => void;
  exportProject: () => string;
  importProject: (json: string) => void;
  resetProject: () => void;
  updateProjectName: (name: string) => void;

  // Scene Management
  addScene: (name?: string) => void;
  duplicateScene: (sceneId: string) => void;
  deleteScene: (sceneId: string) => void;
  switchScene: (sceneId: string) => void;
  renameScene: (sceneId: string, name: string) => void;
  reorderScenes: (fromIndex: number, toIndex: number) => void;
  setSceneTransition: (sceneId: string, transition: SceneTransition | undefined) => void;
  setSceneDuration: (sceneId: string, duration: number | undefined) => void;
  getActiveScene: () => Scene;
  getScenes: () => Scene[];

  // Layer operations
  reorderElements: (fromIndex: number, toIndex: number) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  renameElement: (id: string, name: string) => void;
  toggleElementVisibility: (id: string) => void;
  toggleElementLock: (id: string) => void;

  // Animations (multi)
  addAnimation: (id: string, animation: AnimationConfig) => void;
  removeAnimation: (id: string, index: number) => void;
  updateAnimationAtIndex: (id: string, index: number, animation: AnimationConfig) => void;

  // Keyframes
  addKeyframe: (elementId: string, keyframe: Keyframe) => void;
  removeKeyframe: (elementId: string, time: number) => void;

  // Effects
  addEffect: (elementId: string, effect: Effect) => void;
  removeEffect: (elementId: string, index: number) => void;
  updateEffect: (elementId: string, index: number, effect: Effect) => void;

  // Camera Keyframes
  addCameraKeyframe: (keyframe: CameraKeyframe) => void;
  removeCameraKeyframe: (time: number) => void;

  // Clipboard
  copyElementClean: (id: string) => void;
  pasteElement: () => void;

  // Crop
  setCroppingElement: (id: string | null) => void;
  setContextMenu: (menu: { x: number; y: number; elementId: string } | null) => void;
  setLastDragStartPosition: (pos: { elementId: string; x: number; y: number } | null) => void;

  // Getters
  getSelectedElement: () => CanvasElement | null;
  getSelectedElements: () => CanvasElement[];
}

// Helper to push current project to history
function pushHistory(state: ProjectStore): { history: Project[]; future: Project[] } {
  const synced = syncProjectToActiveScene(state.project);
  const snapshot = structuredClone(synced);
  const history = [...state.history, snapshot];
  if (history.length > MAX_HISTORY) history.shift();
  return { history, future: [] };
}

// Helper: update a single element with history push and metadata update
function updateElementWithHistory(state: ProjectStore, id: string, updater: (el: CanvasElement) => CanvasElement): Partial<ProjectStore> {
  return {
    ...pushHistory(state),
    project: {
      ...state.project,
      elements: state.project.elements.map((el) => el.id === id ? updater(el) : el),
      metadata: { ...state.project.metadata, updatedAt: new Date().toISOString() },
    },
  };
}

// Helper: update project-level fields with history push
function updateProjectWithHistory(state: ProjectStore, projectUpdates: Partial<Project>): Partial<ProjectStore> {
  return {
    ...pushHistory(state),
    project: {
      ...state.project,
      ...projectUpdates,
      metadata: { ...state.project.metadata, updatedAt: new Date().toISOString() },
    },
  };
}

// Helper: create state update that modifies elements and pushes history
function updateElementInProject(state: ProjectStore, id: string, updates: Partial<CanvasElement>): Partial<ProjectStore> {
  return {
    ...pushHistory(state),
    project: {
      ...state.project,
      elements: state.project.elements.map((el) =>
        el.id === id ? { ...el, ...updates } : el
      ),
      metadata: { ...state.project.metadata, updatedAt: new Date().toISOString() },
    },
  };
}

// Helper: create state update that modifies project-level data and pushes history
function updateProjectField(state: ProjectStore, projectUpdates: Partial<Project>): Partial<ProjectStore> {
  return {
    ...pushHistory(state),
    project: {
      ...state.project,
      ...projectUpdates,
      metadata: { ...state.project.metadata, updatedAt: new Date().toISOString() },
    },
  };
}

// Helper: create state update with new elements array (reindexed) and history
function updateElementsWithHistory(state: ProjectStore, elements: CanvasElement[]): Partial<ProjectStore> {
  const reindexed = elements.map((el, i) => ({ ...el, zIndex: i }));
  return {
    ...pushHistory(state),
    project: {
      ...state.project,
      elements: reindexed,
      metadata: { ...state.project.metadata, updatedAt: new Date().toISOString() },
    },
  };
}

// Zustand Store
export const useProjectStore = create<ProjectStore>((set, get) => ({
  // Initial State
  project: createBlankProject(),
  selectedElementIds: [],
  previewingElementId: null,
  playbackState: 'stopped',
  isPlayingAll: false,
  currentTime: 0,
  croppingElementId: null,
  contextMenu: null,
  lastDragStartPosition: null,
  clipboard: null,
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
      future: [structuredClone(project), ...get().future],
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
      history: [...get().history, structuredClone(project)],
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
      keyframes: element.keyframes || [
        { time: 0, x: element.position.x, y: element.position.y },
      ],
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

  duplicateElement: (id, timeOffsetMs) => {
    const state = get();
    const source = state.project.elements.find((el) => el.id === id);
    if (!source) return;

    const newId = generateId();
    const typeCount = state.project.elements.filter((el) => el.type === source.type).length;
    const autoName = `${source.type.charAt(0).toUpperCase() + source.type.slice(1)} ${typeCount + 1}`;

    const offsetAnimations = (anims: AnimationConfig[] | undefined): AnimationConfig[] | undefined => {
      if (!anims || anims.length === 0) return anims;
      return anims.map((a) => ({ ...a, delay: (a.delay || 0) + timeOffsetMs }));
    };

    const offsetKeyframes = (kfs: Keyframe[] | undefined): Keyframe[] | undefined => {
      if (!kfs || kfs.length === 0) return kfs;
      return kfs.map((kf) => ({ ...kf, time: kf.time + timeOffsetMs }));
    };

    const duplicate: CanvasElement = {
      ...structuredClone(source),
      id: newId,
      name: autoName,
      position: { x: source.position.x + 30, y: source.position.y + 30 },
      animation: source.animation
        ? { ...source.animation, delay: (source.animation.delay || 0) + timeOffsetMs }
        : undefined,
      animations: offsetAnimations(source.animations),
      keyframes: offsetKeyframes(source.keyframes),
    };

    set((state) => ({
      ...pushHistory(state),
      project: {
        ...state.project,
        elements: [...state.project.elements, duplicate],
        metadata: { ...state.project.metadata, updatedAt: new Date().toISOString() },
      },
      selectedElementIds: [newId],
    }));
  },

  updateElement: (id, updates) => {
    set((state) => updateElementInProject(state, id, updates));
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
    if (animation === undefined) {
      get().updateElement(id, { animations: undefined, animation: undefined });
    } else {
      const el = get().project.elements.find((e) => e.id === id);
      const existing = el?.animations || [];
      if (existing.length <= 1) {
        get().updateElement(id, { animations: [animation], animation: undefined });
      } else {
        get().updateElement(id, { animations: [animation, ...existing.slice(1)], animation: undefined });
      }
    }
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
    // Cancel any existing playback RAF
    if (playAnimationFrameId !== null) {
      cancelAnimationFrame(playAnimationFrameId);
    }

    const { project, playbackState, currentTime: resumeTime } = get();
    const synced = syncProjectToActiveScene(project);
    const { totalDuration } = buildTimeline(synced);
    const maxDuration = Math.max(totalDuration, 3000);

    // Resume from current position (stopAllAnimations resets to 0, seek updates it)
    const startFrom = resumeTime;

    set({ playbackState: 'playing', isPlayingAll: true, selectedElementIds: [], currentTime: startFrom });
    playStartTimestamp = null;

    const tick = (timestamp: number) => {
      if (playStartTimestamp === null) playStartTimestamp = timestamp;
      const elapsed = startFrom + (timestamp - playStartTimestamp);

      set({ currentTime: elapsed });

      if (elapsed < maxDuration + 500) {
        playAnimationFrameId = requestAnimationFrame(tick);
      } else {
        set({ playbackState: 'stopped', isPlayingAll: false, currentTime: 0 });
        playAnimationFrameId = null;
        playStartTimestamp = null;
      }
    };

    playAnimationFrameId = requestAnimationFrame(tick);
  },

  pauseAllAnimations: () => {
    if (playAnimationFrameId !== null) {
      cancelAnimationFrame(playAnimationFrameId);
      playAnimationFrameId = null;
      playStartTimestamp = null;
    }
    // Keep currentTime as-is
    set({ playbackState: 'paused', isPlayingAll: false });
  },

  stopAllAnimations: () => {
    if (playAnimationFrameId !== null) {
      cancelAnimationFrame(playAnimationFrameId);
      playAnimationFrameId = null;
      playStartTimestamp = null;
    }
    set({ playbackState: 'stopped', isPlayingAll: false, currentTime: 0 });
  },

  // Project Management
  loadProject: (project) => {
    const migrated = ensureScenes(project);
    set((state) => ({
      ...pushHistory(state),
      project: migrated,
      selectedElementIds: [],
    }));
  },

  exportProject: () => {
    const synced = syncProjectToActiveScene(get().project);
    return JSON.stringify(synced, null, 2);
  },

  importProject: (json) => {
    try {
      const project = JSON.parse(json) as Project;

      if (!project.id || !project.canvas || !Array.isArray(project.elements)) {
        throw new Error('Invalid project format');
      }

      // Backfill missing name fields + migrate animation → animations
      const typeCounts: Record<string, number> = {};
      project.elements = project.elements.map((el) => {
        let updated = el;
        if (!updated.name) {
          typeCounts[updated.type] = (typeCounts[updated.type] || 0) + 1;
          updated = { ...updated, name: `${updated.type.charAt(0).toUpperCase() + updated.type.slice(1)} ${typeCounts[updated.type]}` };
        }
        // Migrate legacy animation field to animations array
        if (updated.animation && !updated.animations) {
          updated = { ...updated, animations: [updated.animation], animation: undefined };
        }
        return updated;
      });

      // Migrate legacy camera keyframes: zoom → zoomX/zoomY
      const migrateCamKfs = (kfs: any[] | undefined) =>
        kfs?.map((kf: any) => ({ ...kf, zoomX: kf.zoomX ?? kf.zoom ?? 1, zoomY: kf.zoomY ?? kf.zoom ?? 1 }));
      project.cameraKeyframes = migrateCamKfs(project.cameraKeyframes);
      if (project.scenes) {
        project.scenes = project.scenes.map((s: any) => ({
          ...s,
          cameraKeyframes: migrateCamKfs(s.cameraKeyframes),
        }));
      }

      get().loadProject(ensureScenes(project));
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

  // Scene Management
  addScene: (name) => {
    set((state) => {
      const synced = syncProjectToActiveScene(state.project);
      const count = synced.scenes.length + 1;
      const scene = createBlankScene(name || `Szene ${count}`, synced.canvas.width, synced.canvas.height);
      const scenes = [...synced.scenes, scene];
      return {
        ...pushHistory(state),
        project: {
          ...synced,
          scenes,
          activeSceneId: scene.id,
          elements: scene.elements,
          cameraKeyframes: scene.cameraKeyframes,
          metadata: { ...synced.metadata, updatedAt: new Date().toISOString() },
        },
        selectedElementIds: [],
      };
    });
  },

  duplicateScene: (sceneId) => {
    set((state) => {
      const synced = syncProjectToActiveScene(state.project);
      const source = synced.scenes.find(s => s.id === sceneId);
      if (!source) return state;
      const newScene: Scene = {
        ...structuredClone(source),
        id: generateId(),
        name: `${source.name} (Kopie)`,
      };
      const idx = synced.scenes.findIndex(s => s.id === sceneId);
      const scenes = [...synced.scenes];
      scenes.splice(idx + 1, 0, newScene);
      return {
        ...pushHistory(state),
        project: {
          ...synced,
          scenes,
          activeSceneId: newScene.id,
          elements: newScene.elements,
          cameraKeyframes: newScene.cameraKeyframes,
          metadata: { ...synced.metadata, updatedAt: new Date().toISOString() },
        },
        selectedElementIds: [],
      };
    });
  },

  deleteScene: (sceneId) => {
    set((state) => {
      const synced = syncProjectToActiveScene(state.project);
      if (synced.scenes.length <= 1) return state; // can't delete last scene
      const scenes = synced.scenes.filter(s => s.id !== sceneId);
      const newActive = sceneId === synced.activeSceneId
        ? scenes[Math.max(0, synced.scenes.findIndex(s => s.id === sceneId) - 1)]
        : scenes.find(s => s.id === synced.activeSceneId) || scenes[0];
      return {
        ...pushHistory(state),
        project: {
          ...synced,
          scenes,
          activeSceneId: newActive.id,
          elements: newActive.elements,
          cameraKeyframes: newActive.cameraKeyframes,
          metadata: { ...synced.metadata, updatedAt: new Date().toISOString() },
        },
        selectedElementIds: [],
      };
    });
  },

  switchScene: (sceneId) => {
    set((state) => {
      if (sceneId === state.project.activeSceneId) return state;
      // Save current scene's elements before switching
      const synced = syncProjectToActiveScene(state.project);
      const target = synced.scenes.find(s => s.id === sceneId);
      if (!target) return state;
      return {
        project: {
          ...synced,
          activeSceneId: sceneId,
          elements: target.elements,
          cameraKeyframes: target.cameraKeyframes,
        },
        selectedElementIds: [],
        currentTime: 0,
        playbackState: 'stopped' as const,
        isPlayingAll: false,
      };
    });
  },

  renameScene: (sceneId, name) => {
    set((state) => ({
      project: {
        ...state.project,
        scenes: state.project.scenes.map(s => s.id === sceneId ? { ...s, name } : s),
      },
    }));
  },

  reorderScenes: (fromIndex, toIndex) => {
    set((state) => {
      const synced = syncProjectToActiveScene(state.project);
      const scenes = [...synced.scenes];
      const [moved] = scenes.splice(fromIndex, 1);
      scenes.splice(toIndex, 0, moved);
      return {
        ...pushHistory(state),
        project: { ...synced, scenes, metadata: { ...synced.metadata, updatedAt: new Date().toISOString() } },
      };
    });
  },

  setSceneTransition: (sceneId, transition) => {
    set((state) => updateProjectField(state, {
      scenes: state.project.scenes.map(s => s.id === sceneId ? { ...s, transition } : s),
    }));
  },

  setSceneDuration: (sceneId, duration) => {
    set((state) => updateProjectField(state, {
      scenes: state.project.scenes.map(s => s.id === sceneId ? { ...s, duration } : s),
    }));
  },

  getActiveScene: () => {
    const syncedProject = syncProjectToActiveScene(get().project);
    return syncedProject.scenes.find(s => s.id === syncedProject.activeSceneId) || syncedProject.scenes[0];
  },

  getScenes: () => {
    return syncProjectToActiveScene(get().project).scenes;
  },

  // Layer operations
  reorderElements: (fromIndex, toIndex) => {
    set((state) => {
      const elements = [...state.project.elements];
      const [moved] = elements.splice(fromIndex, 1);
      elements.splice(toIndex, 0, moved);
      return updateElementsWithHistory(state, elements);
    });
  },

  bringToFront: (id) => {
    set((state) => {
      const elements = [...state.project.elements];
      const idx = elements.findIndex((el) => el.id === id);
      if (idx === -1 || idx === elements.length - 1) return state;
      const [moved] = elements.splice(idx, 1);
      elements.push(moved);
      return updateElementsWithHistory(state, elements);
    });
  },

  sendToBack: (id) => {
    set((state) => {
      const elements = [...state.project.elements];
      const idx = elements.findIndex((el) => el.id === id);
      if (idx === -1 || idx === 0) return state;
      const [moved] = elements.splice(idx, 1);
      elements.unshift(moved);
      return updateElementsWithHistory(state, elements);
    });
  },

  bringForward: (id) => {
    set((state) => {
      const elements = [...state.project.elements];
      const idx = elements.findIndex((el) => el.id === id);
      if (idx === -1 || idx === elements.length - 1) return state;
      [elements[idx], elements[idx + 1]] = [elements[idx + 1], elements[idx]];
      return updateElementsWithHistory(state, elements);
    });
  },

  sendBackward: (id) => {
    set((state) => {
      const elements = [...state.project.elements];
      const idx = elements.findIndex((el) => el.id === id);
      if (idx === -1 || idx === 0) return state;
      [elements[idx], elements[idx - 1]] = [elements[idx - 1], elements[idx]];
      return updateElementsWithHistory(state, elements);
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
    const el = get().project.elements.find((e) => e.id === id);
    if (!el) return;
    set((state) => updateElementInProject(state, id, { visible: !el.visible }));
  },

  toggleElementLock: (id) => {
    const el = get().project.elements.find((e) => e.id === id);
    if (!el) return;
    set((state) => updateElementInProject(state, id, { locked: !el.locked }));
  },

  // Animations (multi)
  addAnimation: (id, animation) => {
    const el = get().project.elements.find((e) => e.id === id);
    if (!el) return;
    const existing = el.animations || [];
    get().updateElement(id, { animations: [...existing, animation] });
  },

  removeAnimation: (id, index) => {
    const el = get().project.elements.find((e) => e.id === id);
    if (!el) return;
    const existing = el.animations || [];
    const updated = existing.filter((_, i) => i !== index);
    get().updateElement(id, { animations: updated.length > 0 ? updated : undefined, animation: undefined });
  },

  updateAnimationAtIndex: (id, index, animation) => {
    const el = get().project.elements.find((e) => e.id === id);
    if (!el) return;
    const existing = [...(el.animations || [])];
    existing[index] = animation;
    get().updateElement(id, { animations: existing });
  },

  // Effects
  addEffect: (elementId, effect) => {
    const el = get().project.elements.find((e) => e.id === elementId);
    if (!el) return;
    const existing = el.effects || [];
    get().updateElement(elementId, { effects: [...existing, effect] });
  },

  removeEffect: (elementId, index) => {
    const el = get().project.elements.find((e) => e.id === elementId);
    if (!el) return;
    const existing = el.effects || [];
    const updated = existing.filter((_, i) => i !== index);
    get().updateElement(elementId, { effects: updated.length > 0 ? updated : undefined });
  },

  updateEffect: (elementId, index, effect) => {
    const el = get().project.elements.find((e) => e.id === elementId);
    if (!el) return;
    const existing = [...(el.effects || [])];
    existing[index] = effect;
    get().updateElement(elementId, { effects: existing });
  },

  // Keyframes
  addKeyframe: (elementId, keyframe) => {
    set((state) => ({
      ...pushHistory(state),
      project: {
        ...state.project,
        elements: state.project.elements.map((el) => {
          if (el.id !== elementId) return el;
          const existing = el.keyframes || [];
          // Replace if same time exists, otherwise add
          const filtered = existing.filter((kf) => kf.time !== keyframe.time);
          const updated = [...filtered, keyframe].sort((a, b) => a.time - b.time);
          return { ...el, keyframes: updated };
        }),
        metadata: { ...state.project.metadata, updatedAt: new Date().toISOString() },
      },
    }));
  },

  removeKeyframe: (elementId, time) => {
    set((state) => ({
      ...pushHistory(state),
      project: {
        ...state.project,
        elements: state.project.elements.map((el) => {
          if (el.id !== elementId) return el;
          const updated = (el.keyframes || []).filter((kf) => kf.time !== time);
          return { ...el, keyframes: updated.length > 0 ? updated : undefined };
        }),
        metadata: { ...state.project.metadata, updatedAt: new Date().toISOString() },
      },
    }));
  },

  // Camera Keyframes
  addCameraKeyframe: (keyframe) => {
    set((state) => {
      const existing = state.project.cameraKeyframes || [];
      const filtered = existing.filter((kf) => kf.time !== keyframe.time);
      const updated = [...filtered, keyframe].sort((a, b) => a.time - b.time);
      return {
        ...pushHistory(state),
        project: {
          ...state.project,
          cameraKeyframes: updated,
          metadata: { ...state.project.metadata, updatedAt: new Date().toISOString() },
        },
      };
    });
  },

  removeCameraKeyframe: (time) => {
    set((state) => {
      const updated = (state.project.cameraKeyframes || []).filter((kf) => kf.time !== time);
      return {
        ...pushHistory(state),
        project: {
          ...state.project,
          cameraKeyframes: updated.length > 0 ? updated : undefined,
          metadata: { ...state.project.metadata, updatedAt: new Date().toISOString() },
        },
      };
    });
  },

  // Clipboard
  copyElementClean: (id) => {
    const el = get().project.elements.find((e) => e.id === id);
    if (!el) return;
    // Deep clone, strip animations/keyframes/effects
    const clean: CanvasElement = {
      ...structuredClone(el),
      animation: undefined,
      animations: undefined,
      keyframes: undefined,
      effects: undefined,
    };
    set({ clipboard: clean });
  },

  pasteElement: () => {
    const { clipboard } = get();
    if (!clipboard) return;
    const newEl: CanvasElement = {
      ...structuredClone(clipboard),
      id: generateId(),
      position: { x: clipboard.position.x + 30, y: clipboard.position.y + 30 },
      keyframes: [{ time: 0, x: clipboard.position.x + 30, y: clipboard.position.y + 30 }],
    };
    set((state) => ({
      ...pushHistory(state),
      project: {
        ...state.project,
        elements: [...state.project.elements, newEl],
        metadata: { ...state.project.metadata, updatedAt: new Date().toISOString() },
      },
      selectedElementIds: [newEl.id],
    }));
  },

  // Crop
  setCroppingElement: (id) => {
    set({ croppingElementId: id });
  },

  setContextMenu: (menu) => {
    set({ contextMenu: menu });
  },

  setLastDragStartPosition: (pos) => {
    set({ lastDragStartPosition: pos });
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
