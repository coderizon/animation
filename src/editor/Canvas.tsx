import { useRef, useState, useEffect, useCallback } from 'react';
import { useDrop } from 'react-dnd';
import { useProjectStore } from '../store/useProjectStore';
import { useViewportStore } from '../store/useViewportStore';
import { DragItemAsset } from '../types/animation';
import { CanvasElement } from './components/CanvasElement';
import { ZoomControls } from './components/ZoomControls';
import { SnapGuides } from './components/SnapGuides';
import { ContextMenu } from './components/ContextMenu';

const ZOOM_SENSITIVITY = 0.001;

interface MarqueeRect {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export const Canvas: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const project = useProjectStore((state) => state.project);
  const addElement = useProjectStore((state) => state.addElement);
  const selectElements = useProjectStore((state) => state.selectElements);
  const clearSelection = useProjectStore((state) => state.clearSelection);
  const selectedElementIds = useProjectStore((state) => state.selectedElementIds);
  const setCroppingElement = useProjectStore((state) => state.setCroppingElement);
  const setContextMenu = useProjectStore((state) => state.setContextMenu);

  const zoom = useViewportStore((state) => state.zoom);
  const panOffset = useViewportStore((state) => state.panOffset);
  const zoomAtPoint = useViewportStore((state) => state.zoomAtPoint);
  const setPanOffset = useViewportStore((state) => state.setPanOffset);
  const fitToScreen = useViewportStore((state) => state.fitToScreen);

  // Panning state (refs to avoid re-renders)
  const isPanning = useRef(false);
  const isSpaceDown = useRef(false);
  const panStart = useRef({ mouseX: 0, mouseY: 0, panX: 0, panY: 0 });

  // Marquee selection
  const [marquee, setMarquee] = useState<MarqueeRect | null>(null);
  const isMarqueeActive = useRef(false);

  // Auto-fit canvas on mount and resize
  useEffect(() => {
    const fit = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      fitToScreen(rect.width, rect.height, project.canvas.width, project.canvas.height);
    };

    fit();
    const onResize = () => { fit(); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [project.canvas.width, project.canvas.height, fitToScreen]);

  // --- Ctrl+Scroll Zoom ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const rect = container.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;

        const currentZoom = useViewportStore.getState().zoom;
        const delta = -e.deltaY * ZOOM_SENSITIVITY;
        const factor = 1 + delta;
        const newZoom = currentZoom * factor;

        zoomAtPoint(newZoom, screenX, screenY);
      } else {
        e.preventDefault();
        const { panOffset: p } = useViewportStore.getState();
        setPanOffset({
          x: p.x - e.deltaX,
          y: p.y - e.deltaY,
        });
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [zoomAtPoint, setPanOffset]);

  // --- Space key tracking for pan mode ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        isSpaceDown.current = true;
        if (containerRef.current) {
          containerRef.current.style.cursor = 'grab';
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpaceDown.current = false;
        if (containerRef.current && !isPanning.current) {
          containerRef.current.style.cursor = 'default';
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // --- Pan via Space+Drag or Middle Mouse ---
  const handleContainerMouseDown = useCallback((e: React.MouseEvent) => {
    // Middle mouse or space+left-click → pan
    if (e.button === 1 || (e.button === 0 && isSpaceDown.current)) {
      e.preventDefault();
      isPanning.current = true;
      const { panOffset: p } = useViewportStore.getState();
      panStart.current = { mouseX: e.clientX, mouseY: e.clientY, panX: p.x, panY: p.y };
      if (containerRef.current) {
        containerRef.current.style.cursor = 'grabbing';
      }
      return;
    }

    // Left click on empty canvas area → start marquee
    if (e.button === 0 && !isSpaceDown.current) {
      // Check if clicking directly on the canvas background (not on an element)
      const target = e.target as HTMLElement;
      if (target === canvasRef.current || target === containerRef.current || target.closest('[data-viewport-transform]')) {
        // Only start marquee if we clicked on the canvas itself or the container background
        if (!target.closest('[data-canvas-element]')) {
          const containerRect = containerRef.current!.getBoundingClientRect();
          const { zoom: z, panOffset: p } = useViewportStore.getState();
          const canvasX = (e.clientX - containerRect.left - p.x) / z;
          const canvasY = (e.clientY - containerRect.top - p.y) / z;

          isMarqueeActive.current = true;
          setMarquee({ startX: canvasX, startY: canvasY, currentX: canvasX, currentY: canvasY });

          if (!e.shiftKey) {
            clearSelection();
          }
        }
      }
    }
  }, [clearSelection]);

  // Pan + Marquee mouse move/up
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isPanning.current) {
        const dx = e.clientX - panStart.current.mouseX;
        const dy = e.clientY - panStart.current.mouseY;
        setPanOffset({
          x: panStart.current.panX + dx,
          y: panStart.current.panY + dy,
        });
        return;
      }

      if (isMarqueeActive.current && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const { zoom: z, panOffset: p } = useViewportStore.getState();
        const canvasX = (e.clientX - containerRect.left - p.x) / z;
        const canvasY = (e.clientY - containerRect.top - p.y) / z;

        setMarquee((prev) => prev ? { ...prev, currentX: canvasX, currentY: canvasY } : null);
      }
    };

    const handleMouseUp = () => {
      if (isPanning.current) {
        isPanning.current = false;
        if (containerRef.current) {
          containerRef.current.style.cursor = isSpaceDown.current ? 'grab' : 'default';
        }
        return;
      }

      if (isMarqueeActive.current) {
        isMarqueeActive.current = false;

        // Calculate which elements intersect the marquee
        setMarquee((prev) => {
          if (!prev) return null;

          const left = Math.min(prev.startX, prev.currentX);
          const right = Math.max(prev.startX, prev.currentX);
          const top = Math.min(prev.startY, prev.currentY);
          const bottom = Math.max(prev.startY, prev.currentY);

          // Only select if marquee has meaningful size
          if (right - left > 3 || bottom - top > 3) {
            const { project: proj } = useProjectStore.getState();
            const ids = proj.elements
              .filter((el) => {
                if (!el.visible) return false;
                const elRight = el.position.x + el.size.width;
                const elBottom = el.position.y + el.size.height;
                // AABB intersection
                return el.position.x < right && elRight > left && el.position.y < bottom && elBottom > top;
              })
              .map((el) => el.id);

            if (ids.length > 0) {
              selectElements(ids);
            }
          }

          return null;
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [setPanOffset, selectElements]);

  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'ASSET',
    drop: (item: DragItemAsset & { defaultWidth?: number; defaultHeight?: number }, monitor) => {
      const offset = monitor.getClientOffset();
      if (!offset || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const { zoom: z, panOffset: p } = useViewportStore.getState();

      const canvasX = (offset.x - containerRect.left - p.x) / z;
      const canvasY = (offset.y - containerRect.top - p.y) / z;

      const w = item.defaultWidth || 100;
      const h = item.defaultHeight || 100;

      const isWidget = item.elementType === 'widget';

      addElement({
        type: item.elementType,
        position: isWidget ? { x: 0, y: 0 } : { x: Math.max(0, canvasX - w / 2), y: Math.max(0, canvasY - h / 2) },
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

  // Deselect when clicking canvas background (only if not panning/marquee)
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isPanning.current && !isMarqueeActive.current) {
      setCroppingElement(null);
      setContextMenu(null);
      clearSelection();
    }
  };

  // Marquee rect in canvas coordinates
  const marqueeStyle = marquee ? {
    position: 'absolute' as const,
    left: Math.min(marquee.startX, marquee.currentX),
    top: Math.min(marquee.startY, marquee.currentY),
    width: Math.abs(marquee.currentX - marquee.startX),
    height: Math.abs(marquee.currentY - marquee.startY),
    backgroundColor: 'var(--ae-accent-overlay)',
    border: '1px solid var(--ae-accent)',
    pointerEvents: 'none' as const,
    zIndex: 9999,
  } : null;

  return (
    <div
      style={{
        flex: 1,
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        ref={(node) => {
          (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          drop(node);
        }}
        onMouseDown={handleContainerMouseDown}
        data-viewport-container
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: 'var(--ae-bg-shell)',
          cursor: 'default',
        }}
      >
        {/* Viewport transform layer */}
        <div
          data-viewport-transform
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            willChange: 'transform',
          }}
        >
          {/* The actual canvas */}
          <div
            ref={canvasRef}
            onClick={handleCanvasClick}
            style={{
              width: project.canvas.width,
              height: project.canvas.height,
              backgroundColor: project.canvas.backgroundColor,
              border: isOver ? '2px solid var(--ae-accent)' : '1px solid var(--ae-border)',
              borderRadius: 0,
              position: 'relative',
              boxShadow: isOver ? '0 0 0 3px rgba(86, 129, 255, 0.18), 0 18px 40px rgba(0, 0, 0, 0.45)' : '0 12px 30px rgba(0, 0, 0, 0.38)',
            }}
          >
            {/* Canvas info overlay */}
            <div style={{
              position: 'absolute',
              top: 12,
              right: 12,
              padding: '4px 10px',
              backgroundColor: 'rgba(29, 29, 29, 0.92)',
              border: '1px solid var(--ae-border)',
              borderRadius: 999,
              fontSize: 11,
              color: 'var(--ae-text-secondary)',
              pointerEvents: 'none',
              fontFamily: 'Adobe Clean, Segoe UI, sans-serif',
              boxShadow: '0 6px 16px rgba(0, 0, 0, 0.28)',
            }}>
              {project.canvas.width} × {project.canvas.height} | {Math.round(zoom * 100)}%
            </div>

            {/* Snap guides */}
            <SnapGuides />

            {/* Marquee selection rect */}
            {marqueeStyle && <div style={marqueeStyle} />}

            {/* Render elements */}
            {project.elements.map((element) => (
              <CanvasElement
                key={element.id}
                element={element}
                isSelected={selectedElementIds.includes(element.id)}
                zoom={zoom}
              />
            ))}
          </div>
        </div>

        {/* Zoom Controls */}
        <ZoomControls />
      </div>

      <ContextMenu />
    </div>
  );
};
