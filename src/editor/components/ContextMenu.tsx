import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useProjectStore } from '../../store/useProjectStore';

export const ContextMenu: React.FC = () => {
  const contextMenu = useProjectStore((s) => s.contextMenu);
  const setContextMenu = useProjectStore((s) => s.setContextMenu);
  const setCroppingElement = useProjectStore((s) => s.setCroppingElement);
  const updateElement = useProjectStore((s) => s.updateElement);
  const addPositionKeyframe = useProjectStore((s) => s.addPositionKeyframe);
  const lastDragStartPosition = useProjectStore((s) => s.lastDragStartPosition);
  const setLastDragStartPosition = useProjectStore((s) => s.setLastDragStartPosition);
  const project = useProjectStore((s) => s.project);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contextMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [contextMenu, setContextMenu]);

  if (!contextMenu) return null;

  const element = project.elements.find((el) => el.id === contextMenu.elementId);
  if (!element) return null;

  const hasClip = element.clip &&
    (element.clip.top > 0 || element.clip.right > 0 || element.clip.bottom > 0 || element.clip.left > 0);

  // Check if the element was just dragged (pre-drag position differs from current)
  const hasDragMovement = lastDragStartPosition
    && lastDragStartPosition.elementId === contextMenu.elementId
    && (lastDragStartPosition.x !== element.position.x || lastDragStartPosition.y !== element.position.y);

  const menuItems: { label: string; onClick: () => void; visible: boolean }[] = [
    {
      label: 'Bewegung hierher',
      onClick: () => {
        if (!lastDragStartPosition) return;
        const anim = element.animation;
        // Start keyframe = after entrance animation ends
        const animEnd = anim ? (anim.delay || 0) + (anim.duration || 600) : 0;
        const startTime = Math.max(animEnd, 0);
        const endTime = startTime + 1000; // 1s movement duration

        // Keyframe 1: start position (where element was before drag)
        addPositionKeyframe(contextMenu.elementId, {
          time: startTime,
          x: lastDragStartPosition.x,
          y: lastDragStartPosition.y,
        });
        // Keyframe 2: end position (current position after drag)
        addPositionKeyframe(contextMenu.elementId, {
          time: endTime,
          x: element.position.x,
          y: element.position.y,
        });

        setLastDragStartPosition(null);
        setContextMenu(null);
      },
      visible: !!hasDragMovement,
    },
    {
      label: 'Zuschneiden',
      onClick: () => {
        setCroppingElement(contextMenu.elementId);
        setContextMenu(null);
      },
      visible: true,
    },
    {
      label: 'Zuschnitt zurücksetzen',
      onClick: () => {
        updateElement(contextMenu.elementId, { clip: undefined });
        setCroppingElement(null);
        setContextMenu(null);
      },
      visible: !!hasClip,
    },
  ];

  const visibleItems = menuItems.filter((item) => item.visible);

  return ReactDOM.createPortal(
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: contextMenu.y,
        left: contextMenu.x,
        backgroundColor: '#1e1e2e',
        border: '1px solid #3a3a4a',
        borderRadius: 6,
        padding: '4px 0',
        minWidth: 180,
        zIndex: 100000,
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      }}
    >
      {visibleItems.map((item, i) => (
        <div
          key={i}
          onClick={item.onClick}
          style={{
            padding: '8px 16px',
            color: '#e0e0e0',
            fontSize: 13,
            cursor: 'pointer',
            userSelect: 'none',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.backgroundColor = '#2a2a3e';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent';
          }}
        >
          {item.label}
        </div>
      ))}
    </div>,
    document.body
  );
};
