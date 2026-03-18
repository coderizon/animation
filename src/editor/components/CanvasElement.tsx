import { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CanvasElement as CanvasElementType, ShapeContent } from '../../types/project';
import { useProjectStore } from '../../store/useProjectStore';
import { animationPresets } from '../../animations/presets';

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
  const previewingElementId = useProjectStore((state) => state.previewingElementId);
  const isPlayingAll = useProjectStore((state) => state.isPlayingAll);
  const project = useProjectStore((state) => state.project);

  const [animationKey, setAnimationKey] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const isPreviewing = previewingElementId === element.id;
  const shouldAnimate = isPreviewing || isPlayingAll;

  // Refs for drag/resize to avoid stale closures
  const dragStart = useRef({ mouseX: 0, mouseY: 0, elX: 0, elY: 0 });
  const resizeStart = useRef({ mouseX: 0, mouseY: 0, width: 0, height: 0, elX: 0, elY: 0, handle: '' });
  const snapshotRef = useRef<typeof project | null>(null);

  // Trigger re-animation
  useEffect(() => {
    if (shouldAnimate) {
      setAnimationKey((prev) => prev + 1);
    }
  }, [shouldAnimate]);

  // --- DRAG (native mouse events) ---
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (element.locked) return;
    e.stopPropagation();
    e.preventDefault();

    selectElement(element.id);

    // Save snapshot for undo before any changes
    snapshotRef.current = JSON.parse(JSON.stringify(project));

    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      elX: element.position.x,
      elY: element.position.y,
    };
    setIsDragging(true);
  }, [element.id, element.position.x, element.position.y, element.locked, project, selectElement]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - dragStart.current.mouseX) / zoom;
      const dy = (e.clientY - dragStart.current.mouseY) / zoom;

      updateElementSilent(element.id, {
        position: {
          x: dragStart.current.elX + dx,
          y: dragStart.current.elY + dy,
        },
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      // Push the pre-drag snapshot to history
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
  }, [isDragging, element.id, zoom, updateElementSilent, pushSnapshot]);

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

      let newW = width;
      let newH = height;
      let newX = elX;
      let newY = elY;

      // Compute new size & position based on which handle is being dragged
      if (handle.includes('right')) { newW = Math.max(20, width + dx); }
      if (handle.includes('left')) { newW = Math.max(20, width - dx); newX = elX + (width - newW); }
      if (handle.includes('bottom')) { newH = Math.max(20, height + dy); }
      if (handle.includes('top')) { newH = Math.max(20, height - dy); newY = elY + (height - newH); }

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
    if (!isDragging) {
      selectElement(element.id);
    }
  };

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
      default:
        return null;
    }
  };

  // --- Animation ---
  const animationConfig = element.animation && shouldAnimate
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
      onMouseDown={handleDragStart}
      onClick={handleClick}
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
        }}
      >
        {renderContent()}
      </motion.div>

      {/* Resize handles */}
      {isSelected && !element.locked && (
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
