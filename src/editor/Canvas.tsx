import { useRef, useState, useEffect, useCallback } from 'react';
import { useDrop } from 'react-dnd';
import { useProjectStore } from '../store/useProjectStore';
import { useViewportStore } from '../store/useViewportStore';
import { DragItemAsset } from '../types/animation';
import { CanvasElement } from './components/CanvasElement';
import { ZoomControls } from './components/ZoomControls';
import { SnapGuides } from './components/SnapGuides';
import { ContextMenu } from './components/ContextMenu';
import { getInterpolatedCamera } from './utils/keyframeInterpolation';
import { CameraKeyframe } from '../types/project';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVideo } from '@fortawesome/free-solid-svg-icons';

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
  const currentTime = useProjectStore((state) => state.currentTime);

  const zoom = useViewportStore((state) => state.zoom);
  const panOffset = useViewportStore((state) => state.panOffset);
  const zoomAtPoint = useViewportStore((state) => state.zoomAtPoint);
  const setPanOffset = useViewportStore((state) => state.setPanOffset);
  const fitToScreen = useViewportStore((state) => state.fitToScreen);
  const cameraEditMode = useViewportStore((state) => state.cameraEditMode);

  // Panning state (refs to avoid re-renders)
  const isPanning = useRef(false);

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

  // Space is now used for play/pause (handled in useKeyboardShortcuts).
  // Pan via middle mouse button only.

  // --- Pan via Middle Mouse ---
  const handleContainerMouseDown = useCallback((e: React.MouseEvent) => {
    // Middle mouse → pan
    if (e.button === 1) {
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
    if (e.button === 0) {
      // Check if clicking directly on the canvas background (not on an element)
      const target = e.target as HTMLElement;
      if (target === canvasRef.current || target === containerRef.current || target.closest('[data-viewport-transform]')) {
        // Only start marquee if we clicked on the canvas itself or the container background
        if (!target.closest('[data-canvas-element]') && !target.closest('[data-camera-frame]')) {
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
          containerRef.current.style.cursor = 'default';
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
        name: item.name,
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
          backgroundColor: 'var(--ae-bg-panel-raised)',
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
            transform: `translate(${panOffset.x / zoom}px, ${panOffset.y / zoom}px)`,
            zoom: zoom,
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
              border: isOver ? '2px solid var(--ae-accent)' : '1px solid rgba(255, 255, 255, 0.25)',
              borderRadius: 0,
              position: 'relative',
              boxShadow: isOver ? '0 0 0 3px rgba(86, 129, 255, 0.18), 0 18px 40px rgba(0, 0, 0, 0.45)' : '0 0 0 1px rgba(255, 255, 255, 0.1), 0 12px 30px rgba(0, 0, 0, 0.38)',
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

            {/* Camera frame overlay (interactive) */}
            {(project.cameraKeyframes && project.cameraKeyframes.length > 0) && (
              <CameraFrameOverlay
                cameraKeyframes={project.cameraKeyframes}
                canvasWidth={project.canvas.width}
                canvasHeight={project.canvas.height}
                currentTime={currentTime}
                editorZoom={zoom}
                interactive={cameraEditMode}
              />
            )}
          </div>
        </div>

        {/* Zoom Controls */}
        <ZoomControls />
      </div>

      <ContextMenu />
    </div>
  );
};

// --- Interactive Camera Frame Overlay ---

interface CameraFrameOverlayProps {
  cameraKeyframes: CameraKeyframe[];
  canvasWidth: number;
  canvasHeight: number;
  currentTime: number;
  editorZoom: number;
  interactive: boolean;
}

const CameraFrameOverlay: React.FC<CameraFrameOverlayProps> = ({
  cameraKeyframes,
  canvasWidth,
  canvasHeight,
  currentTime,
  editorZoom,
  interactive,
}) => {
  const pushSnapshot = useProjectStore((state) => state.pushSnapshot);

  const dragRef = useRef<{
    type: 'move' | 'resize';
    handle?: 'tl' | 'tr' | 'bl' | 'br' | 'top' | 'right' | 'bottom' | 'left';
    startMouseX: number;
    startMouseY: number;
    startCamX: number;
    startCamY: number;
    startZoom: number;
    // Frame rect in canvas coords at drag start
    startLeft: number;
    startTop: number;
    startFrameW: number;
    startFrameH: number;
    snapshot: any;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const cam = getInterpolatedCamera(cameraKeyframes, currentTime);
  if (!cam) return null;

  // Always use uniform zoom (zoomX === zoomY enforced)
  const camZoom = cam.zoomX;
  const viewW = canvasWidth / camZoom;
  const viewH = canvasHeight / camZoom;
  const left = cam.x - viewW / 2;
  const top = cam.y - viewH / 2;

  // Find the keyframe at or closest before currentTime to update
  const snappedTime = Math.round(currentTime / 50) * 50;

  const silentUpdateCamera = (x: number, y: number, zoom: number) => {
    const time = snappedTime;
    useProjectStore.setState((state) => {
      const existing = state.project.cameraKeyframes || [];
      const filtered = existing.filter((kf) => kf.time !== time);
      const updated = [...filtered, { time, x, y, zoomX: zoom, zoomY: zoom }].sort((a, b) => a.time - b.time);
      return { project: { ...state.project, cameraKeyframes: updated } };
    });
  };

  const handleMoveStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const snapshot = structuredClone(useProjectStore.getState().project);
    dragRef.current = {
      type: 'move',
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startCamX: cam.x,
      startCamY: cam.y,
      startZoom: camZoom,
      startLeft: left,
      startTop: top,
      startFrameW: viewW,
      startFrameH: viewH,
      snapshot,
    };
    setIsDragging(true);
  };

  const handleResizeStart = (handle: 'tl' | 'tr' | 'bl' | 'br' | 'top' | 'right' | 'bottom' | 'left') => (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const snapshot = structuredClone(useProjectStore.getState().project);
    dragRef.current = {
      type: 'resize',
      handle,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startCamX: cam.x,
      startCamY: cam.y,
      startZoom: camZoom,
      startLeft: left,
      startTop: top,
      startFrameW: viewW,
      startFrameH: viewH,
      snapshot,
    };
    setIsDragging(true);
  };

  // Global mouse handlers for drag
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const { type, startMouseX, startMouseY, startCamX, startCamY } = dragRef.current;

      if (type === 'move') {
        const dx = (e.clientX - startMouseX) / editorZoom;
        const dy = (e.clientY - startMouseY) / editorZoom;
        silentUpdateCamera(startCamX + dx, startCamY + dy, dragRef.current.startZoom);
      } else {
        // Resize: 16:9 aspect locked, opposite edge stays fixed
        const handle = dragRef.current.handle || 'br';
        const dx = (e.clientX - startMouseX) / editorZoom;
        const dy = (e.clientY - startMouseY) / editorZoom;
        const { startLeft, startTop, startFrameW, startFrameH } = dragRef.current;
        const aspect = canvasWidth / canvasHeight;
        const MIN_W = canvasWidth / 10;

        let newW = startFrameW;
        let newLeft = startLeft;
        let newTop = startTop;

        // Derive new width from the dragged axis
        if (handle === 'right') {
          newW = startFrameW + dx;
        } else if (handle === 'left') {
          newW = startFrameW - dx;
          newLeft = startLeft + startFrameW - newW;
        } else if (handle === 'bottom') {
          newW = (startFrameH + dy) * aspect;
        } else if (handle === 'top') {
          const newH = startFrameH - dy;
          newW = newH * aspect;
          newTop = startTop + startFrameH - newW / aspect;
        } else {
          // Corner handles: use horizontal delta
          if (handle.includes('l')) {
            newW = startFrameW - dx;
            newLeft = startLeft + startFrameW - newW;
          } else {
            newW = startFrameW + dx;
          }
        }

        newW = Math.max(MIN_W, newW);
        const newH = newW / aspect;

        // For edge handles, keep opposite edge fixed; adjust perpendicular center
        if (handle === 'right' || handle === 'left') {
          // Vertical center stays the same
          newTop = startTop + (startFrameH - newH) / 2;
        } else if (handle === 'bottom') {
          // Top edge fixed
          newTop = startTop;
        }
        // For corner handles, anchor opposite corner vertically too
        if (handle === 'br' || handle === 'tr') { /* newLeft already = startLeft */ }
        if (handle.includes('t') && handle.length === 2) {
          newTop = startTop + startFrameH - newH;
        }

        const newZoom = Math.max(0.1, Math.min(10, canvasWidth / newW));
        const newCamX = newLeft + newW / 2;
        const newCamY = newTop + newH / 2;
        silentUpdateCamera(newCamX, newCamY, newZoom);
      }
    };

    const handleMouseUp = () => {
      if (dragRef.current) {
        pushSnapshot(dragRef.current.snapshot);
      }
      dragRef.current = null;
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, editorZoom, canvasWidth, canvasHeight, pushSnapshot]);

  const HANDLE_SIZE = 8;
  const handleStyle = (cursor: string): React.CSSProperties => ({
    position: 'absolute',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    backgroundColor: '#00bcd4',
    border: '1px solid #00e5ff',
    cursor,
    zIndex: 1,
  });

  return (
    <div
      onMouseDown={interactive ? handleMoveStart : undefined}
      data-camera-frame
      style={{
        position: 'absolute',
        left,
        top,
        width: viewW,
        height: viewH,
        border: `2px dashed ${interactive ? '#00bcd4' : '#00bcd455'}`,
        borderRadius: 2,
        cursor: interactive ? (isDragging && dragRef.current?.type === 'move' ? 'grabbing' : 'move') : 'default',
        zIndex: interactive ? 9998 : 1,
        pointerEvents: interactive ? 'auto' : 'none',
        boxShadow: interactive ? '0 0 0 9999px rgba(0, 0, 0, 0.3)' : 'none',
      }}
    >
      {/* Label */}
      <div style={{
        position: 'absolute',
        top: -18,
        left: 0,
        fontSize: 10,
        color: interactive ? '#00bcd4' : '#00bcd455',
        fontFamily: 'monospace',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
      }}>
        <FontAwesomeIcon icon={faVideo} style={{ marginRight: 4 }} />{camZoom.toFixed(1)}×
      </div>

      {/* Resize handles — only when interactive */}
      {interactive && (<>
        <div onMouseDown={handleResizeStart('tl')} style={{ ...handleStyle('nwse-resize'), top: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2 }} />
        <div onMouseDown={handleResizeStart('tr')} style={{ ...handleStyle('nesw-resize'), top: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2 }} />
        <div onMouseDown={handleResizeStart('bl')} style={{ ...handleStyle('nesw-resize'), bottom: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2 }} />
        <div onMouseDown={handleResizeStart('br')} style={{ ...handleStyle('nwse-resize'), bottom: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2 }} />
        <div onMouseDown={handleResizeStart('top')} style={{ ...handleStyle('ns-resize'), top: -HANDLE_SIZE / 2, left: '50%', transform: 'translateX(-50%)' }} />
        <div onMouseDown={handleResizeStart('bottom')} style={{ ...handleStyle('ns-resize'), bottom: -HANDLE_SIZE / 2, left: '50%', transform: 'translateX(-50%)' }} />
        <div onMouseDown={handleResizeStart('left')} style={{ ...handleStyle('ew-resize'), top: '50%', left: -HANDLE_SIZE / 2, transform: 'translateY(-50%)' }} />
        <div onMouseDown={handleResizeStart('right')} style={{ ...handleStyle('ew-resize'), top: '50%', right: -HANDLE_SIZE / 2, transform: 'translateY(-50%)' }} />
      </>)}
    </div>
  );
};
