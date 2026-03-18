import { useState, useRef, useEffect, ReactNode } from 'react';

interface ResizablePanelProps {
  children: ReactNode;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  position?: 'left' | 'right';
}

export const ResizablePanel: React.FC<ResizablePanelProps> = ({
  children,
  defaultWidth = 400,
  minWidth = 250,
  maxWidth = 600,
  position = 'left',
}) => {
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !panelRef.current) return;

      const panelRect = panelRef.current.getBoundingClientRect();
      let newWidth: number;

      if (position === 'left') {
        newWidth = e.clientX - panelRect.left;
      } else {
        newWidth = panelRect.right - e.clientX;
      }

      // Clamp width between min and max
      newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, minWidth, maxWidth, position]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  return (
    <div
      ref={panelRef}
      style={{
        width: width,
        backgroundColor: '#1a1a2e',
        borderRight: position === 'left' ? '1px solid #2a2a3e' : 'none',
        borderLeft: position === 'right' ? '1px solid #2a2a3e' : 'none',
        padding: 20,
        overflowY: 'auto',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      {children}

      {/* Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          position: 'absolute',
          top: 0,
          [position === 'left' ? 'right' : 'left']: -4,
          width: 8,
          height: '100%',
          cursor: 'ew-resize',
          zIndex: 10,
          backgroundColor: 'transparent',
          transition: isResizing ? 'none' : 'background-color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(33, 150, 243, 0.3)';
        }}
        onMouseLeave={(e) => {
          if (!isResizing) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        {/* Visual indicator */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 2,
            height: 40,
            backgroundColor: isResizing ? '#2196F3' : '#4a4a6e',
            borderRadius: 2,
            opacity: isResizing ? 1 : 0.5,
            transition: 'opacity 0.2s',
          }}
        />
      </div>
    </div>
  );
};
