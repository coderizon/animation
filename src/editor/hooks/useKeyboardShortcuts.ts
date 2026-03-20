import { useEffect } from 'react';
import { useProjectStore } from '../../store/useProjectStore';

export const useKeyboardShortcuts = () => {
  const undo = useProjectStore((state) => state.undo);
  const redo = useProjectStore((state) => state.redo);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Space: toggle play/pause
      if (e.code === 'Space') {
        e.preventDefault();
        const { playbackState, playAllAnimations, pauseAllAnimations } = useProjectStore.getState();
        if (playbackState === 'playing') {
          pauseAllAnimations();
        } else {
          playAllAnimations();
        }
        return;
      }

      // Undo: Ctrl+Z / Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // Redo: Ctrl+Shift+Z / Cmd+Shift+Z or Ctrl+Y
      if ((e.ctrlKey || e.metaKey) && (e.key === 'Z' || (e.key === 'z' && e.shiftKey) || e.key === 'y')) {
        e.preventDefault();
        redo();
        return;
      }

      // Ctrl+C: Copy element (without animations)
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !e.shiftKey) {
        const { selectedElementIds, copyElementClean } = useProjectStore.getState();
        if (selectedElementIds.length === 1) {
          e.preventDefault();
          copyElementClean(selectedElementIds[0]);
        }
        return;
      }

      // Ctrl+V: Paste element
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && !e.shiftKey) {
        const { clipboard, pasteElement } = useProjectStore.getState();
        if (clipboard) {
          e.preventDefault();
          pasteElement();
        }
        return;
      }

      // Ctrl+A: Select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        const { project, selectElements } = useProjectStore.getState();
        selectElements(project.elements.map((el) => el.id));
        return;
      }

      // Escape: exit crop mode first, then clear selection
      if (e.key === 'Escape') {
        e.preventDefault();
        const state = useProjectStore.getState();
        if (state.croppingElementId) {
          state.setCroppingElement(null);
        } else if (state.contextMenu) {
          state.setContextMenu(null);
        } else {
          state.clearSelection();
        }
        return;
      }

      const { selectedElementIds, getSelectedElements, deleteElement, updateElement, bringToFront, sendToBack, bringForward, sendBackward } = useProjectStore.getState();
      if (selectedElementIds.length === 0) return;

      // Layer ordering: Ctrl+] / Ctrl+[ (one step), Ctrl+Shift+] / Ctrl+Shift+[ (all the way)
      if ((e.ctrlKey || e.metaKey) && selectedElementIds.length === 1) {
        if (e.key === ']' && e.shiftKey) { e.preventDefault(); bringToFront(selectedElementIds[0]); return; }
        if (e.key === ']') { e.preventDefault(); bringForward(selectedElementIds[0]); return; }
        if (e.key === '[' && e.shiftKey) { e.preventDefault(); sendToBack(selectedElementIds[0]); return; }
        if (e.key === '[') { e.preventDefault(); sendBackward(selectedElementIds[0]); return; }
      }

      const step = e.shiftKey ? 10 : 1;

      switch (e.key) {
        case 'Delete':
        case 'Backspace': {
          e.preventDefault();
          const ids = [...selectedElementIds];
          ids.forEach((id) => deleteElement(id));
          break;
        }

        case 'ArrowUp':
        case 'ArrowDown':
        case 'ArrowLeft':
        case 'ArrowRight': {
          e.preventDefault();
          const elements = getSelectedElements();
          for (const el of elements) {
            const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
            const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
            updateElement(el.id, {
              position: {
                x: el.position.x + dx,
                y: el.position.y + dy,
              },
            });
          }
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);
};
