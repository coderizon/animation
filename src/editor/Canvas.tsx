import { useRef, useState, useEffect } from 'react';
import { useDrop } from 'react-dnd';
import { useProjectStore } from '../store/useProjectStore';
import { DragItemAsset } from '../types/animation';
import { CanvasElement } from './components/CanvasElement';
import { ZoomControls } from './components/ZoomControls';

export const Canvas: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const project = useProjectStore((state) => state.project);
  const addElement = useProjectStore((state) => state.addElement);
  const selectElement = useProjectStore((state) => state.selectElement);
  const selectedElementId = useProjectStore((state) => state.selectedElementId);

  const [zoom, setZoom] = useState(0.5);

  // Auto-fit canvas to available space
  useEffect(() => {
    const calculateOptimalZoom = () => {
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const padding = 80; // Extra padding for breathing room

      const availableWidth = containerRect.width - padding;
      const availableHeight = containerRect.height - padding;

      const scaleX = availableWidth / project.canvas.width;
      const scaleY = availableHeight / project.canvas.height;

      // Use the smaller scale to ensure canvas fits in both dimensions
      const optimalZoom = Math.min(scaleX, scaleY, 1); // Max 100% zoom

      setZoom(Math.max(0.2, optimalZoom)); // Min 20% zoom
    };

    calculateOptimalZoom();
    window.addEventListener('resize', calculateOptimalZoom);

    return () => window.removeEventListener('resize', calculateOptimalZoom);
  }, [project.canvas.width, project.canvas.height]);

  // Grid pattern for canvas background
  const gridPattern = `
    data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grid' width='40' height='40' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 40 0 L 0 0 0 40' fill='none' stroke='rgba(255,255,255,0.05)' stroke-width='1'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23grid)' /%3E%3C/svg%3E
  `.trim();

  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'ASSET',
    drop: (item: DragItemAsset & { defaultWidth?: number; defaultHeight?: number }, monitor) => {
      const offset = monitor.getClientOffset();
      if (!offset || !canvasRef.current) return;

      const canvasRect = canvasRef.current.getBoundingClientRect();
      const w = item.defaultWidth || 100;
      const h = item.defaultHeight || 100;
      const x = (offset.x - canvasRect.left) / zoom;
      const y = (offset.y - canvasRect.top) / zoom;

      addElement({
        type: item.elementType,
        position: { x: Math.max(0, x - w / 2), y: Math.max(0, y - h / 2) },
        size: { width: w, height: h },
        rotation: 0,
        zIndex: project.elements.length,
        content: item.content,
        visible: true,
        locked: false,
      });
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  // Deselect when clicking canvas background
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      selectElement(null);
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f0f1e',
        backgroundImage: `url("${gridPattern}")`,
        backgroundSize: '20px 20px',
        padding: 20,
        overflow: 'auto',
      }}
    >
      <div
        ref={drop}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '100%',
          minHeight: '100%',
        }}
      >
        <div
          ref={canvasRef}
          onClick={handleCanvasClick}
          style={{
            width: project.canvas.width,
            height: project.canvas.height,
            backgroundColor: project.canvas.backgroundColor,
            border: isOver ? '3px solid #4CAF50' : '1px solid #333',
            borderRadius: 4,
            position: 'relative',
            transform: `scale(${zoom})`,
            transformOrigin: 'center',
            transition: 'all 0.2s',
            boxShadow: isOver ? '0 0 30px rgba(76, 175, 80, 0.3)' : '0 4px 20px rgba(0, 0, 0, 0.5)',
          }}
        >
        {/* Placeholder text when empty */}
        {project.elements.length === 0 && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: '#666',
            fontSize: 24,
            pointerEvents: 'none',
          }}>
            <div style={{ fontSize: 24, marginBottom: 10, fontWeight: 600, letterSpacing: '0.5px' }}>Drop Assets Here</div>
            <div style={{ fontSize: 14, marginTop: 10, color: '#888' }}>
              {project.canvas.width} x {project.canvas.height} — Landscape (16:9)
            </div>
          </div>
        )}

        {/* Canvas info overlay - always visible */}
        <div style={{
          position: 'absolute',
          top: 10,
          left: 10,
          padding: '6px 12px',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          borderRadius: 6,
          fontSize: 11,
          color: '#aaa',
          pointerEvents: 'none',
          fontFamily: 'monospace',
        }}>
          {project.canvas.width} × {project.canvas.height} | {Math.round(zoom * 100)}%
        </div>

        {/* Render elements */}
        {project.elements.map((element) => (
          <CanvasElement
            key={element.id}
            element={element}
            isSelected={element.id === selectedElementId}
            zoom={zoom}
          />
        ))}
        </div>
      </div>

      {/* Zoom Controls */}
      <ZoomControls currentZoom={zoom} onZoomChange={setZoom} />
    </div>
  );
};
