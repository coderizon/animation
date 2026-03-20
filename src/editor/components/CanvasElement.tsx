import { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CanvasElement as CanvasElementType, ImageContent, LogoContent, ShapeContent, TextContent, WidgetContent, Keyframe, getAnimations } from '../../types/project';
import { useProjectStore } from '../../store/useProjectStore';
import { useViewportStore } from '../../store/useViewportStore';
import { animationPresets } from '../../animations/presets';
import { WidgetRenderer } from './WidgetRenderer';
import { CropOverlay } from './CropOverlay';
import { computeSnap } from '../utils/snapping';
import { getInterpolatedProperties } from '../utils/keyframeInterpolation';
import { wrapWithEffects } from '../utils/effectStyles';
import { getTypewriterText } from '../../utils/typewriter';

interface CanvasElementProps {
  element: CanvasElementType;
  isSelected: boolean;
  zoom: number;
}

export const CanvasElement: React.FC<CanvasElementProps> = ({ element, isSelected, zoom }) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const updateElementSilent = useProjectStore((state) => state.updateElementSilent);
  const pushSnapshot = useProjectStore((state) => state.pushSnapshot);
  const addKeyframe = useProjectStore((state) => state.addKeyframe);
  const selectElement = useProjectStore((state) => state.selectElement);
  const addToSelection = useProjectStore((state) => state.addToSelection);
  const toggleSelectElement = useProjectStore((state) => state.toggleSelectElement);
  const previewingElementId = useProjectStore((state) => state.previewingElementId);
  const isPlayingAll = useProjectStore((state) => state.isPlayingAll);
  const playbackState = useProjectStore((state) => state.playbackState);
  const project = useProjectStore((state) => state.project);
  const currentTime = useProjectStore((state) => state.currentTime);
  const croppingElementId = useProjectStore((state) => state.croppingElementId);
  const setContextMenu = useProjectStore((state) => state.setContextMenu);
  const setLastDragStartPosition = useProjectStore((state) => state.setLastDragStartPosition);

  const isCropping = croppingElementId === element.id;

  // Auto-keyframe: after drag/resize, create keyframe if element has keyframes
  const autoKeyframeOnDragEnd = useCallback(() => {
    const el = useProjectStore.getState().project.elements.find((e) => e.id === element.id);
    if (!el?.keyframes || el.keyframes.length === 0) return;
    const snappedTime = Math.round(useProjectStore.getState().currentTime / 50) * 50;
    const kf: Keyframe = {
      time: snappedTime,
      x: el.position.x,
      y: el.position.y,
      width: el.size.width,
      height: el.size.height,
      rotation: el.rotation,
    };
    if (el.type === 'shape') {
      const c = el.content as ShapeContent;
      kf.fill = c.fill;
      kf.stroke = c.stroke;
      kf.strokeWidth = c.strokeWidth;
      kf.borderRadius = c.borderRadius;
    } else if (el.type === 'text') {
      const c = el.content as TextContent;
      kf.color = c.color;
      kf.fontSize = c.fontSize;
    }
    addKeyframe(element.id, kf);
  }, [element.id, addKeyframe]);

  const [animationKey, setAnimationKey] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isRadiusDragging, setIsRadiusDragging] = useState(false);
  const [previewElapsed, setPreviewElapsed] = useState(0);
  const isPreviewing = previewingElementId === element.id;
  const anims = getAnimations(element);
  const firstDelay = anims.length > 0 ? Math.min(...anims.map(a => a.delay || 0)) : 0;
  const isPlayback = isPlayingAll || playbackState === 'paused';
  const pastDelay = isPreviewing || (isPlayback && currentTime >= firstDelay);
  const shouldAnimate = isPreviewing || (isPlayingAll && pastDelay);

  // Refs for drag/resize to avoid stale closures
  const dragStart = useRef({ mouseX: 0, mouseY: 0, elX: 0, elY: 0 });
  const resizeStart = useRef({ mouseX: 0, mouseY: 0, width: 0, height: 0, elX: 0, elY: 0, handle: '' });
  const radiusStart = useRef({ mouseX: 0, startRadius: 0 });
  const snapshotRef = useRef<typeof project | null>(null);
  // For multi-drag: initial positions of all selected elements
  const multiDragStartPositions = useRef<Map<string, { x: number; y: number }>>(new Map());
  // For multi-resize: initial sizes/positions of all selected elements + bounding box
  const multiResizeStart = useRef<Map<string, { x: number; y: number; w: number; h: number }>>(new Map());
  const multiResizeBBox = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const prevPastDelay = useRef(false);

  // Trigger animation when crossing the delay threshold
  useEffect(() => {
    if (pastDelay && !prevPastDelay.current) {
      setAnimationKey((prev) => prev + 1);
    }
    prevPastDelay.current = pastDelay;
  }, [pastDelay]);

  // Reset when playback stops
  useEffect(() => {
    if (playbackState === 'stopped') {
      prevPastDelay.current = false;
    }
  }, [playbackState]);

  useEffect(() => {
    if (!isPreviewing) {
      setPreviewElapsed(0);
      return;
    }

    let frameId = 0;
    const start = performance.now();

    const tick = (now: number) => {
      setPreviewElapsed(now - start);
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [isPreviewing, animationKey]);

  // --- DRAG (native mouse events) ---
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left-click starts drag
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

    // Save pre-drag position for "Bewegung hierher" context menu
    setLastDragStartPosition({ elementId: element.id, x: element.position.x, y: element.position.y });

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
  }, [element.id, element.position.x, element.position.y, element.locked, isCropping, project, isSelected, selectElement, addToSelection, toggleSelectElement, setLastDragStartPosition]);

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
      autoKeyframeOnDragEnd();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, element.id, element.size.width, element.size.height, zoom, updateElementSilent, pushSnapshot, autoKeyframeOnDragEnd]);

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

    // Capture all selected elements for multi-resize
    const { selectedElementIds } = useProjectStore.getState();
    multiResizeStart.current.clear();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const el of project.elements) {
      if (selectedElementIds.includes(el.id) || el.id === element.id) {
        multiResizeStart.current.set(el.id, { x: el.position.x, y: el.position.y, w: el.size.width, h: el.size.height });
        minX = Math.min(minX, el.position.x);
        minY = Math.min(minY, el.position.y);
        maxX = Math.max(maxX, el.position.x + el.size.width);
        maxY = Math.max(maxY, el.position.y + el.size.height);
      }
    }
    multiResizeBBox.current = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };

    setIsResizing(true);
  }, [element.size.width, element.size.height, element.position.x, element.position.y, project, element.id]);

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

      // Multi-resize: scale other selected elements proportionally
      if (multiResizeStart.current.size > 1 && multiResizeBBox.current.w > 0 && multiResizeBBox.current.h > 0) {
        const scaleX = newW / width;
        const scaleY = newH / height;
        const bbox = multiResizeBBox.current;

        // Determine anchor point from handle (opposite corner)
        let anchorX = bbox.x;
        let anchorY = bbox.y;
        if (handle.includes('left')) anchorX = bbox.x + bbox.w;
        if (handle.includes('top')) anchorY = bbox.y + bbox.h;
        if (handle === 'right' || handle === 'bottom-right' || handle === 'top-right') anchorX = bbox.x;
        if (handle === 'bottom' || handle === 'bottom-left' || handle === 'bottom-right') anchorY = bbox.y;

        for (const [id, start] of multiResizeStart.current) {
          if (id === element.id) continue;
          const relX = start.x - anchorX;
          const relY = start.y - anchorY;
          updateElementSilent(id, {
            size: { width: Math.max(20, start.w * scaleX), height: Math.max(20, start.h * scaleY) },
            position: { x: anchorX + relX * scaleX, y: anchorY + relY * scaleY },
          });
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      if (snapshotRef.current) {
        pushSnapshot(snapshotRef.current);
        snapshotRef.current = null;
      }
      autoKeyframeOnDragEnd();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, element.id, zoom, updateElementSilent, pushSnapshot, autoKeyframeOnDragEnd]);

  // --- BORDER-RADIUS drag ---
  const handleRadiusStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    snapshotRef.current = JSON.parse(JSON.stringify(project));
    const content = element.content as ShapeContent;
    radiusStart.current = { mouseX: e.clientX, startRadius: content.borderRadius || 0 };
    setIsRadiusDragging(true);
  }, [element.content, project]);

  useEffect(() => {
    if (!isRadiusDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - radiusStart.current.mouseX) / zoom;
      const maxRadius = Math.min(element.size.width, element.size.height) / 2;
      const newRadius = Math.round(Math.max(0, Math.min(maxRadius, radiusStart.current.startRadius + dx)));
      const content = element.content as ShapeContent;
      updateElementSilent(element.id, { content: { ...content, borderRadius: newRadius } });
    };

    const handleMouseUp = () => {
      setIsRadiusDragging(false);
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
  }, [isRadiusDragging, element.id, element.content, element.size, zoom, updateElementSilent, pushSnapshot]);

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
      case 'logo': {
        const lc = element.content as LogoContent;
        return (
          <img
            src={lc.src}
            alt={lc.alt}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              pointerEvents: 'none',
              userSelect: 'none',
              draggable: false,
              filter: lc.filter || undefined,
            } as React.CSSProperties}
            draggable={false}
          />
        );
      }
      case 'image': {
        const ic = element.content as ImageContent;
        return (
          <img
            src={ic.src}
            alt={ic.alt}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              pointerEvents: 'none',
              userSelect: 'none',
              draggable: false,
            } as React.CSSProperties}
            draggable={false}
          />
        );
      }
      case 'text': {
        const tc = element.content as TextContent;
        const displayedText = getTypewriterText(
          tc.text,
          tc.typewriter,
          isPreviewing ? previewElapsed : (isPlayback ? currentTime - firstDelay : null),
          activeAnim?.config.duration,
        );
        return (
          <div style={{
            fontSize: interpolated?.fontSize ?? tc.fontSize,
            color: interpolated?.color ?? tc.color,
            fontFamily: tc.fontFamily,
            fontWeight: tc.fontWeight,
            pointerEvents: 'none',
            userSelect: 'none',
            whiteSpace: 'nowrap',
          }}>
            {displayedText}
          </div>
        );
      }
      case 'shape': {
        const content = element.content as ShapeContent;
        const fill = interpolated?.fill ?? content.fill;
        const stroke = interpolated?.stroke ?? content.stroke;
        const strokeWidth = interpolated?.strokeWidth ?? content.strokeWidth;

        if (content.shape === 'triangle') {
          return (
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ pointerEvents: 'none' }}>
              <polygon
                points="50,0 100,100 0,100"
                fill={fill}
                stroke={stroke || 'none'}
                strokeWidth={strokeWidth || 0}
              />
            </svg>
          );
        }

        const shapeStyle: React.CSSProperties = {
          width: '100%',
          height: '100%',
          backgroundColor: fill,
          border: stroke ? `${strokeWidth || 1}px solid ${stroke}` : 'none',
          pointerEvents: 'none',
        };

        if (content.shape === 'circle') {
          shapeStyle.borderRadius = '50%';
        } else if (content.borderRadius) {
          shapeStyle.borderRadius = interpolated?.borderRadius ?? content.borderRadius;
        }

        return <div style={shapeStyle} />;
      }
      case 'widget':
        return (
          <WidgetRenderer
            content={element.content as WidgetContent}
            width={renderW}
            height={renderH}
          />
        );
      default:
        return null;
    }
  };

  // --- Animation (supports multiple) ---
  // Find which animation is active at current time
  const getActiveAnim = () => {
    if (!shouldAnimate || anims.length === 0) return null;
    const effectiveTime = isPreviewing ? previewElapsed : currentTime;
    for (let i = anims.length - 1; i >= 0; i--) {
      if (effectiveTime >= (anims[i].delay || 0)) {
        return { config: anims[i], index: i };
      }
    }
    return null;
  };
  const activeAnim = getActiveAnim();

  const animationConfig = activeAnim
    ? animationPresets[activeAnim.config.preset]
    : null;

  // Build motion props, stripping inner transition from variants so user controls take effect
  const motionProps = (() => {
    if (!animationConfig || !activeAnim) return {};

    // Clone variants and remove transition from visible to prevent override
    const cleanVariants = { ...animationConfig.variants };
    if (cleanVariants.visible && typeof cleanVariants.visible === 'object' && !Array.isArray(cleanVariants.visible)) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { transition: _innerTransition, ...visibleWithoutTransition } = cleanVariants.visible as Record<string, any>;
      cleanVariants.visible = visibleWithoutTransition;
    }

    const easing = activeAnim.config.easing || 'easeOut';
    const isSpring = easing === 'spring' || easing === 'bounce';

    return {
      key: `${animationKey}-${activeAnim.index}`,
      initial: 'hidden',
      animate: 'visible',
      variants: cleanVariants,
      transition: {
        duration: isSpring ? undefined : (activeAnim.config.duration || 600) / 1000,
        ease: isSpring ? undefined : easing,
        type: isSpring ? 'spring' : 'tween',
        ...(easing === 'spring' ? { stiffness: 200, damping: 20 } : {}),
        ...(easing === 'bounce' ? { bounce: 0.5 } : {}),
      },
    };
  })();

  // Stroke draw overlay
  const isStrokeDraw = activeAnim?.config.preset === 'strokeDraw' && shouldAnimate;
  const strokeDrawDuration = activeAnim ? (activeAnim.config.duration || 1200) / 1000 : 1.2;

  // Hide element before its first animation's delay — only while actively playing, not when paused
  const hiddenBeforeDelay = isPlayingAll && !isPreviewing && firstDelay > 0 && currentTime < firstDelay;

  // Hide widget after its duration has elapsed
  const hiddenAfterWidgetEnd = (() => {
    if (!isPlayback || element.type !== 'widget') return false;
    const wc = element.content as import('../../types/project').WidgetContent;
    const widgetDurationMs = (wc.durationInFrames / wc.fps) * 1000;
    const startTime = firstDelay;
    return currentTime > startTime + widgetDurationMs;
  })();

  // Full keyframe interpolation during playback, paused, or when scrubbed (currentTime > 0)
  // Disable during drag so the user can freely move the element
  const showInterpolated = !isDragging && !isResizing && (isPlayback || currentTime > 0);
  const interpolated = showInterpolated
    ? getInterpolatedProperties(element.keyframes, currentTime)
    : null;
  const renderX = interpolated ? interpolated.x : element.position.x;
  const renderY = interpolated ? interpolated.y : element.position.y;
  const renderW = interpolated?.width ?? element.size.width;
  const renderH = interpolated?.height ?? element.size.height;
  const renderRotation = interpolated?.rotation ?? element.rotation;

  return (
    <div
      ref={elementRef}
      data-canvas-element
      onMouseDown={handleDragStart}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      style={{
        position: 'absolute',
        left: renderX,
        top: renderY,
        width: renderW,
        height: renderH,
        transform: `rotate(${renderRotation}deg)`,
        zIndex: isDragging ? 9999 : isSelected ? element.zIndex + 10000 : element.zIndex,
        cursor: element.locked ? 'not-allowed' : isDragging ? 'grabbing' : 'grab',
        border: isSelected ? '2px solid var(--ae-accent)' : '1px solid transparent',
        boxShadow: isSelected ? '0 0 0 1px var(--ae-accent)' : 'none',
        pointerEvents: element.locked ? 'none' : 'auto',
        display: element.visible && !hiddenBeforeDelay && !hiddenAfterWidgetEnd ? 'flex' : 'none',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
      }}
    >
      {wrapWithEffects(element.effects, (
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
            ...(isStrokeDraw ? {
              animation: `stroke-draw-fill ${strokeDrawDuration}s ease-in-out forwards`,
            } : {}),
          }}
        >
          {renderContent()}
        </motion.div>
      ), element.id)}

      {/* Stroke draw SVG overlay */}
      {isStrokeDraw && element.type === 'shape' && (() => {
        const content = element.content as ShapeContent;
        const sw = content.strokeWidth || 2;
        const color = content.stroke || content.fill || '#ffffff';
        const w = renderW;
        const h = renderH;
        const isCircle = content.shape === 'circle';
        const isTriangle = content.shape === 'triangle';
        const br = content.borderRadius || 0;
        // Calculate perimeter
        const perimeter = isCircle
          ? Math.PI * Math.min(w, h)
          : isTriangle
            ? (Math.sqrt((w/2)**2 + h**2) * 2 + w)
            : 2 * (w + h);

        return (
          <svg
            key={animationKey}
            width={w}
            height={h}
            viewBox={`0 0 ${w} ${h}`}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              pointerEvents: 'none',
              overflow: 'visible',
            }}
          >
            {isCircle ? (
              <ellipse
                cx={w / 2}
                cy={h / 2}
                rx={(w - sw) / 2}
                ry={(h - sw) / 2}
                fill="none"
                stroke={color}
                strokeWidth={sw}
                strokeDasharray={perimeter}
                style={{
                  '--stroke-perimeter': perimeter,
                  animation: `stroke-draw ${strokeDrawDuration * 0.7}s ease-in-out forwards`,
                  strokeDashoffset: perimeter,
                } as React.CSSProperties}
              />
            ) : isTriangle ? (
              <polygon
                points={`${w / 2},${sw / 2} ${w - sw / 2},${h - sw / 2} ${sw / 2},${h - sw / 2}`}
                fill="none"
                stroke={color}
                strokeWidth={sw}
                strokeLinejoin="round"
                strokeDasharray={perimeter}
                style={{
                  '--stroke-perimeter': perimeter,
                  animation: `stroke-draw ${strokeDrawDuration * 0.7}s ease-in-out forwards`,
                  strokeDashoffset: perimeter,
                } as React.CSSProperties}
              />
            ) : (
              <rect
                x={sw / 2}
                y={sw / 2}
                width={w - sw}
                height={h - sw}
                rx={br}
                ry={br}
                fill="none"
                stroke={color}
                strokeWidth={sw}
                strokeDasharray={perimeter}
                style={{
                  '--stroke-perimeter': perimeter,
                  animation: `stroke-draw ${strokeDrawDuration * 0.7}s ease-in-out forwards`,
                  strokeDashoffset: perimeter,
                } as React.CSSProperties}
              />
            )}
          </svg>
        );
      })()}

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
                  backgroundColor: 'var(--ae-accent)',
                  border: '2px solid var(--ae-gray-900)',
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
                  backgroundColor: 'var(--ae-accent)',
                  border: '1px solid var(--ae-gray-900)',
                  borderRadius: 3,
                  pointerEvents: 'auto',
                  zIndex: 10,
                }}
              />
            );
          })}

          {/* Border-radius drag handle (yellow circle, rectangle shapes only) */}
          {element.type === 'shape' && (element.content as ShapeContent).shape === 'rectangle' && (() => {
            const radius = (element.content as ShapeContent).borderRadius || 0;
            return (
              <div
                onMouseDown={handleRadiusStart}
                title={`Eckenradius: ${radius}px`}
                style={{
                  position: 'absolute',
                  left: Math.max(radius, 8) - 5,
                  top: -1,
                  width: 10,
                  height: 10,
                  backgroundColor: 'var(--ae-notice)',
                  border: '2px solid var(--ae-gray-900)',
                  borderRadius: '50%',
                  cursor: 'ew-resize',
                  pointerEvents: 'auto',
                  zIndex: 11,
                }}
              />
            );
          })()}
        </>
      )}
    </div>
  );
};
