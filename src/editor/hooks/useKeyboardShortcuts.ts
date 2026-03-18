import { useEffect } from 'react';
import { useProjectStore } from '../../store/useProjectStore';

export const useKeyboardShortcuts = () => {
  const selectedElement = useProjectStore((state) => state.getSelectedElement());
  const deleteElement = useProjectStore((state) => state.deleteElement);
  const updateElement = useProjectStore((state) => state.updateElement);
  const undo = useProjectStore((state) => state.undo);
  const redo = useProjectStore((state) => state.redo);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
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

      if (!selectedElement) return;

      const step = e.shiftKey ? 10 : 1; // Shift = 10px, normal = 1px

      switch (e.key) {
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          deleteElement(selectedElement.id);
          break;

        case 'ArrowUp':
          e.preventDefault();
          updateElement(selectedElement.id, {
            position: {
              ...selectedElement.position,
              y: selectedElement.position.y - step,
            },
          });
          break;

        case 'ArrowDown':
          e.preventDefault();
          updateElement(selectedElement.id, {
            position: {
              ...selectedElement.position,
              y: selectedElement.position.y + step,
            },
          });
          break;

        case 'ArrowLeft':
          e.preventDefault();
          updateElement(selectedElement.id, {
            position: {
              ...selectedElement.position,
              x: selectedElement.position.x - step,
            },
          });
          break;

        case 'ArrowRight':
          e.preventDefault();
          updateElement(selectedElement.id, {
            position: {
              ...selectedElement.position,
              x: selectedElement.position.x + step,
            },
          });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElement, deleteElement, updateElement, undo, redo]);
};
