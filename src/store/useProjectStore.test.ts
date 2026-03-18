import { beforeEach, describe, expect, it } from 'vitest';
import { Keyframe, PartialCanvasElement, Project } from '../types/project';
import { createBlankProject, useProjectStore } from './useProjectStore';

function resetStore() {
  useProjectStore.getState().stopAllAnimations();
  useProjectStore.setState({
    project: createBlankProject(),
    selectedElementIds: [],
    previewingElementId: null,
    playbackState: 'stopped',
    isPlayingAll: false,
    currentTime: 0,
    croppingElementId: null,
    contextMenu: null,
    lastDragStartPosition: null,
    history: [],
    future: [],
  });
}

function makeShapeElement(overrides: Partial<PartialCanvasElement> = {}): PartialCanvasElement {
  return {
    type: 'shape',
    position: { x: 0, y: 0 },
    size: { width: 100, height: 100 },
    rotation: 0,
    zIndex: 0,
    content: {
      type: 'shape',
      shape: 'rectangle',
      fill: '#2196F3',
    },
    visible: true,
    locked: false,
    ...overrides,
  };
}

beforeEach(() => {
  resetStore();
});

describe('useProjectStore', () => {
  it('auto-names added elements and selects the latest one', () => {
    const store = useProjectStore.getState();

    store.addElement(makeShapeElement());
    store.addElement(makeShapeElement());

    const state = useProjectStore.getState();
    expect(state.project.elements.map((element) => element.name)).toEqual(['Shape 1', 'Shape 2']);
    expect(state.selectedElementIds).toHaveLength(1);
    expect(state.selectedElementIds[0]).toBe(state.project.elements[1].id);
    expect(state.history).toHaveLength(2);
  });

  it('backfills missing names during import and clears selection', () => {
    useProjectStore.setState({ selectedElementIds: ['stale-selection'] });

    const project: Project = {
      id: 'imported-project',
      name: 'Imported',
      version: '1.0',
      canvas: {
        width: 1920,
        height: 1080,
        backgroundColor: '#000000',
      },
      elements: [
        {
          id: 'text-1',
          type: 'text',
          position: { x: 0, y: 0 },
          size: { width: 300, height: 60 },
          rotation: 0,
          zIndex: 0,
          content: {
            type: 'text',
            text: 'Hello',
            fontSize: 40,
            fontFamily: 'sans-serif',
            color: '#ffffff',
          },
          visible: true,
          locked: false,
        },
        {
          id: 'text-2',
          type: 'text',
          position: { x: 0, y: 100 },
          size: { width: 300, height: 60 },
          rotation: 0,
          zIndex: 1,
          content: {
            type: 'text',
            text: 'World',
            fontSize: 40,
            fontFamily: 'sans-serif',
            color: '#ffffff',
          },
          visible: true,
          locked: false,
        },
      ],
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    useProjectStore.getState().importProject(JSON.stringify(project));

    const state = useProjectStore.getState();
    expect(state.project.elements.map((element) => element.name)).toEqual(['Text 1', 'Text 2']);
    expect(state.selectedElementIds).toEqual([]);
    expect(state.history).toHaveLength(1);
  });

  it('reorders elements, reindexes z-order, and supports undo/redo', () => {
    const store = useProjectStore.getState();
    store.addElement(makeShapeElement({ name: 'First' }));
    store.addElement(makeShapeElement({ name: 'Second' }));

    store.reorderElements(0, 1);

    let state = useProjectStore.getState();
    expect(state.project.elements.map((element) => element.name)).toEqual(['Second', 'First']);
    expect(state.project.elements.map((element) => element.zIndex)).toEqual([0, 1]);

    state.undo();
    state = useProjectStore.getState();
    expect(state.project.elements.map((element) => element.name)).toEqual(['First', 'Second']);

    state.redo();
    state = useProjectStore.getState();
    expect(state.project.elements.map((element) => element.name)).toEqual(['Second', 'First']);
  });

  it('replaces keyframes at the same time and keeps them sorted', () => {
    const store = useProjectStore.getState();
    store.addElement(makeShapeElement({ name: 'Animated Shape' }));

    const elementId = useProjectStore.getState().project.elements[0].id;
    const earlyKeyframe: Keyframe = { time: 200, x: 20, y: 40 };
    const originalKeyframe: Keyframe = { time: 500, x: 50, y: 60 };
    const replacementKeyframe: Keyframe = { time: 500, x: 75, y: 90, rotation: 30 };

    store.addKeyframe(elementId, originalKeyframe);
    store.addKeyframe(elementId, earlyKeyframe);
    store.addKeyframe(elementId, replacementKeyframe);

    const keyframes = useProjectStore.getState().project.elements[0].keyframes;
    expect(keyframes).toEqual([earlyKeyframe, replacementKeyframe]);
  });
});
