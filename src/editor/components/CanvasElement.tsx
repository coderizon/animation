import { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CanvasElement as CanvasElementType, ShapeContent, WidgetContent } from '../../types/project';
import { useProjectStore } from '../../store/useProjectStore';
import { useViewportStore } from '../../store/useViewportStore';
import { animationPresets } from '../../animations/presets';
import { WidgetRenderer } from './WidgetRenderer';
import { CropOverlay } from './CropOverlay';
import { computeSnap } from '../utils/snapping';

interface CanvasElementProps {
  element: CanvasElementType;
  isSelected: boolean;
  zoom: number;
}

export const CanvasElement: React.FC<CanvasElementProps> = ({ element, isSelected, zoom }) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const updateElementSilent = useProjectStore((state) => state.updateElementSilent);
  const pushSnapshot = useProjectStore((state) => state.pushSnapshot);
  const selectElement = useProjectStore((state) => state.selectElement);
  const addToSelection = useProjectStore((state) => state.addToSelection);
  const toggleSelectElement = useProjectStore((state) => state.toggleSelectElement);
  const previewingElementId = useProjectStore((state) => state.previewingElementId);
  const isPlayingAll = useProjectStore((state) => state.isPlayingAll);
  const project = useProjectStore((state) => state.project);
  const croppingElementId = useProjectStore((state) => state.croppingElementId);
  const setContextMenu = useProjectStore((state) => state.setContextMenu);

  const isCropping = croppingElementId === element.id;

  const [animationKey, setAnimationKey] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const isPreviewing = previewingElementId === element.id;
  const shouldAnimate = isPreviewing || isPlayingAll;

  // Refs for drag/resize to avoid stale closures
  const dragStart = useRef({ mouseX: 0, mouseY: 0, elX: 0, elY: 0 });
  const resizeStart = useRef({ mouseX: 0, mouseY: 0, width: 0, height: 0, elX: 0, elY: 0, handle: '' });
  const snapshotRef = useRef<typeof project | null>(null);
  // For multi-drag: initial positions of all selected elements
  const multiDragStartPositions = useRef<Map<string, { x: number; y: number }>>(new Map());

  // Trigger re-animation
  useEffect(() => {
    if (shouldAnimate) {
      setAnimationKey((prev) => prev + 1);
    }
  }, [shouldAnimate]);

  // --- DRAG (native mouse events) ---
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (element.locked || isCropping) return;
    e.stopPropagation();
    e.preventDefault();

    // Modifier key handling for selection
    if (e.ctrlKey || e.metaKey) {
      toggleSelectElement(element.id);
      return; // Don't start drag on Ctrl+Click
    }

    if (e.shiftKey) {
      addToSelection(element.id);
    } else if (!isSelected) {
      selectElement(element.id);
    }

    // Save snapshot for undo before any changes
    snapshotRef.current = JSON.parse(JSON.stringify(project));

    // Capture start positions of ALL selected elements for multi-drag
    const { selectedElementIds } = useProjectStore.getState();
    const posMap = new Map<string, { x: number; y: number }>();
    for (const el of project.elements) {
      if (selectedElementIds.includes(el.id) || el.id === element.id) {
        posMap.set(el.id, { x: el.position.x, y: el.position.y });
      }
    }
    multiDragStartPositions.current = posMap;

    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      elX: element.position.x,
      elY: element.position.y,
    };
    setIsDragging(true);
  }, [element.id, element.position.x, element.position.y, element.locked, isCropping, project, isSelected, selectElement, addToSelection, toggleSelectElement]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - dragStart.current.mouseX) / zoom;
      const dy = (e.clientY - dragStart.current.mouseY) / zoom;

      const rawX = dragStart.current.elX + dx;
      const rawY = dragStart.current.elY + dy;

      // Snapping (only for the dragged element)
      const { project: proj } = useProjectStore.getState();
      const snap = computeSnap(
        { id: element.id, x: rawX, y: rawY, w: element.size.width, h: element.size.height },
        proj.elements,
        proj.canvas.width,
        proj.canvas.height,
      );

      useViewportStore.getState().setSnapGuides(snap.guides);

      // Snap delta = difference between snapped and raw
      const snapDx = snap.x - rawX;
      const snapDy = snap.y - rawY;

      // Move all selected elements by the same delta
      const { selectedElementIds } = useProjectStore.getState();
      for (const [id, startPos] of multiDragStartPositions.current) {
        if (selectedElementIds.includes(id) || id === element.id) {
          updateElementSilent(id, {
            position: {
              x: startPos.x + dx + snapDx,
              y: startPos.y + dy + snapDy,
            },
          });
        }
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      multiDragStartPositions.current.clear();
      useViewportStore.getState().setSnapGuides([]);
      if (snapshotRef.current) {
        pushSnapshot(snapshotRef.current);
        snapshotRef.current = null;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, element.id, element.size.width, element.size.height, zoom, updateElementSilent, pushSnapshot]);

  // --- RESIZE (native mouse events) ---
  const handleResizeStart = useCallback((e: React.MouseEvent, handle: string) => {
    e.stopPropagation();
    e.preventDefault();

    snapshotRef.current = JSON.parse(JSON.stringify(project));

    resizeStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      width: element.size.width,
      height: element.size.height,
      elX: element.position.x,
      elY: element.position.y,
      handle,
    };
    setIsResizing(true);
  }, [element.size.width, element.size.height, element.position.x, element.position.y, project]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - resizeStart.current.mouseX) / zoom;
      const dy = (e.clientY - resizeStart.current.mouseY) / zoom;
      const { handle, width, height, elX, elY } = resizeStart.current;
      const aspectRatio = width / height;

      // Lock aspect ratio for widgets always, or for any element when Shift is held
      const isCorner = handle.includes('-'); // e.g. "top-left", "bottom-right"
      const lockAspect = element.type === 'widget' || e.shiftKey;

      let newW = width;
      let newH = height;
      let newX = elX;
      let newY = elY;

      if (lockAspect && isCorner) {
        // For corner handles with locked aspect ratio: use dominant axis
        // Determine the scale factor from the larger movement
        let scale: number;
        if (handle === 'bottom-right') {
          scale = Math.max(dx / width, dy / height);
          newW = Math.max(20, width + width * scale);
          newH = newW / aspectRatio;
        } else if (handle === 'bottom-left') {
          scale = Math.max(-dx / width, dy / height);
          newW = Math.max(20, width + width * scale);
          newH = newW / aspectRatio;
          newX = elX + (width - newW);
        } else if (handle === 'top-right') {
          scale = Math.max(dx / width, -dy / height);
          newW = Math.max(20, width + width * scale);
          newH = newW / aspectRatio;
          newY = elY + (height - newH);
        } else if (handle === 'top-left') {
          scale = Math.max(-dx / width, -dy / height);
          newW = Math.max(20, width + width * scale);
          newH = newW / aspectRatio;
          newX = elX + (width - newW);
          newY = elY + (height - newH);
        }
      } else if (lockAspect && !isCorner) {
        // Side handles with locked aspect: scale proportionally from the dragged side
        if (handle === 'right' || handle === 'left') {
          newW = handle === 'right' ? Math.max(20, width + dx) : Math.max(20, width - dx);
          newH = newW / aspectRatio;
          if (handle === 'left') newX = elX + (width - newW);
          // Center vertically relative to original center
          newY = elY + (height - newH) / 2;
        } else {
          newH = handle === 'bottom' ? Math.max(20, height + dy) : Math.max(20, height - dy);
          newW = newH * aspectRatio;
          if (handle === 'top') newY = elY + (height - newH);
          // Center horizontally relative to original center
          newX = elX + (width - newW) / 2;
        }
      } else {
        // Free resize (no aspect lock)
        if (handle.includes('right')) { newW = Math.max(20, width + dx); }
        if (handle.includes('left')) { newW = Math.max(20, width - dx); newX = elX + (width - newW); }
        if (handle.includes('bottom')) { newH = Math.max(20, height + dy); }
        if (handle.includes('top')) { newH = Math.max(20, height - dy); newY = elY + (height - newH); }
      }

      updateElementSilent(element.id, {
        size: { width: newW, height: newH },
        position: { x: newX, y: newY },
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      if (snapshotRef.current) {
        pushSnapshot(snapshotRef.current);
        snapshotRef.current = null;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, element.id, zoom, updateElementSilent, pushSnapshot]);

  // --- Click to select (only if not dragging) ---
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Selection is handled in handleDragStart
  };

  // --- Right-click context menu ---
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isSelected) selectElement(element.id);
    setContextMenu({ x: e.clientX, y: e.clientY, elementId: element.id });
  }, [element.id, isSelected, selectElement, setContextMenu]);

  // --- Render content ---
  const renderContent = () => {
    switch (element.type) {
      case 'logo':
        return (
          <img
            src={(element.content as { src: string }).src}
            alt={(element.content as { alt: string }).alt}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              pointerEvents: 'none',
              userSelect: 'none',
              draggable: false,
            } as React.CSSProperties}
            draggable={false}
          />
        );
      case 'text': {
        const tc = element.content as { text: string; fontSize: number; color: string; fontFamily: string; fontWeight?: number };
        return (
          <div style={{
            fontSize: tc.fontSize,
            color: tc.color,
            fontFamily: tc.fontFamily,
            fontWeight: tc.fontWeight,
            pointerEvents: 'none',
            userSelect: 'none',
            whiteSpace: 'nowrap',
          }}>
            {tc.text}
          </div>
        );
      }
      case 'shape': {
        const content = element.content as ShapeContent;
        if (content.shape === 'triangle') {
          return (
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ pointerEvents: 'none' }}>
              <polygon
                points="50,0 100,100 0,100"
                fill={content.fill}
                stroke={content.stroke || 'none'}
                strokeWidth={content.strokeWidth || 0}
              />
            </svg>
          );
        }

        const shapeStyle: React.CSSProperties = {
          width: '100%',
          height: '100%',
          backgroundColor: content.fill,
          border: content.stroke ? `${content.strokeWidth || 1}px solid ${content.stroke}` : 'none',
          pointerEvents: 'none',
        };

        if (content.shape === 'circle') {
          shapeStyle.borderRadius = '50%';
        }

        return <div style={shapeStyle} />;
      }
      case 'widget':
        return (
          <WidgetRenderer
            content={element.content as WidgetContent}
            width={element.size.width}
            height={element.size.height}
          />
        );
      default:
        return null;
    }
  };

  // --- Animation ---
  const animationConfig = element.type !== 'widget' && element.animation && shouldAnimate
    ? animationPresets[element.animation.preset]
    : null;

  const motionProps = animationConfig
    ? {
        key: animationKey,
        initial: 'hidden',
        animate: 'visible',
        variants: animationConfig.variants,
        transition: {
          delay: (element.animation?.delay || 0) / 1000,
          duration: (element.animation?.duration || 600) / 1000,
          ease: element.animation?.easing === 'spring' ? undefined : element.animation?.easing || 'easeOut',
          type: element.animation?.easing === 'spring' || element.animation?.easing === 'bounce' ? 'spring' : 'tween',
        },
      }
    : {};

  return (
    <div
      ref={elementRef}
      data-canvas-element
      onMouseDown={handleDragStart}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      style={{
        position: 'absolute',
        left: element.position.x,
        top: element.position.y,
        width: element.size.width,
        height: element.size.height,
        transform: `rotate(${element.rotation}deg)`,
        zIndex: isDragging ? 9999 : element.zIndex,
        cursor: element.locked ? 'not-allowed' : isDragging ? 'grabbing' : 'grab',
        border: isSelected ? '2px solid #2196F3' : '1px solid transparent',
        boxShadow: isSelected ? '0 0 0 1px #2196F3' : 'none',
        pointerEvents: element.locked ? 'none' : 'auto',
        display: element.visible ? 'flex' : 'none',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
      }}
    >
      <motion.div
        {...motionProps}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...(element.clip && !isCropping ? {
            clipPath: `inset(${element.clip.top}% ${element.clip.right}% ${element.clip.bottom}% ${element.clip.left}%)`,
          } : {}),
        }}
      >
        {renderContent()}
      </motion.div>

      {/* Crop overlay */}
      {isCropping && <CropOverlay element={element} />}

      {/* Resize handles */}
      {isSelected && !element.locked && !isCropping && (
        <>
          {/* Corner handles */}
          {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map((position) => {
            const styles: Record<string, React.CSSProperties> = {
              'top-left': { top: -5, left: -5, cursor: 'nwse-resize' },
              'top-right': { top: -5, right: -5, cursor: 'nesw-resize' },
              'bottom-left': { bottom: -5, left: -5, cursor: 'nesw-resize' },
              'bottom-right': { bottom: -5, right: -5, cursor: 'nwse-resize' },
            };

            return (
              <div
                key={position}
                onMouseDown={(e) => handleResizeStart(e, position)}
                style={{
                  position: 'absolute',
                  ...styles[position],
                  width: 10,
                  height: 10,
                  backgroundColor: '#2196F3',
                  border: '2px solid white',
                  borderRadius: '50%',
                  pointerEvents: 'auto',
                  zIndex: 10,
                }}
              />
            );
          })}

          {/* Side handles */}
          {(['top', 'right', 'bottom', 'left'] as const).map((position) => {
            const styles: Record<string, React.CSSProperties> = {
              'top': { top: -4, left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize', width: 30, height: 6 },
              'right': { right: -4, top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize', width: 6, height: 30 },
              'bottom': { bottom: -4, left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize', width: 30, height: 6 },
              'left': { left: -4, top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize', width: 6, height: 30 },
            };

            return (
              <div
                key={position}
                onMouseDown={(e) => handleResizeStart(e, position)}
                style={{
                  position: 'absolute',
                  ...styles[position],
                  backgroundColor: '#2196F3',
                  border: '1px solid white',
                  borderRadius: 3,
                  pointerEvents: 'auto',
                  zIndex: 10,
                }}
              />
            );
          })}
        </>
      )}
    </div>
  );
};
