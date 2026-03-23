import { useEffect, useRef, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ImageContent, LogoContent, Project, Scene, CanvasElement, ShapeContent, TextContent, WidgetContent, SceneTransitionType, TransitionDirection, getAnimations } from '../types/project';
import { animationPresets } from '../animations/presets';
import { WidgetRenderer } from '../editor/components/WidgetRenderer';
import { useProjectStore } from '../store/useProjectStore';
import { getInterpolatedProperties, getInterpolatedCamera } from '../editor/utils/keyframeInterpolation';
import { wrapWithEffects } from '../editor/utils/effectStyles';
import { getTypewriterText } from '../utils/typewriter';
import { buildTimeline } from './timeline';
import { getTransitionStyles } from './transitions';

interface PlayerControllerProps {
  project: Project;
  onExit: () => void;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Render a single scene's elements at a given local time
function SceneRenderer({
  scene,
  localTime,
  canvasWidth,
  canvasHeight,
  opacity,
  skipAnimation,
}: {
  scene: Scene;
  localTime: number;
  canvasWidth: number;
  canvasHeight: number;
  opacity: number;
  skipAnimation?: boolean;
}) {
  const cam = getInterpolatedCamera(scene.cameraKeyframes, localTime);
  const zoom = cam ? cam.zoomX : 1; // zoomX === zoomY (16:9 locked)
  const cameraStyle: React.CSSProperties = cam ? {
    width: canvasWidth,
    height: canvasHeight,
    transform: `translate(${canvasWidth / 2 - cam.x * zoom}px, ${canvasHeight / 2 - cam.y * zoom}px) scale(${zoom})`,
    transformOrigin: '0 0',
  } : {
    width: '100%',
    height: '100%',
  };

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: canvasWidth,
      height: canvasHeight,
      opacity,
      overflow: 'hidden',
      transition: 'opacity 0.05s',
    }}>
      <div style={cameraStyle}>
        {scene.elements
          .filter((el) => el.visible)
          .sort((a, b) => a.zIndex - b.zIndex)
          .map((element) => (
            <ElementRenderer
              key={element.id}
              element={element}
              currentTime={localTime}
              skipAnimation={skipAnimation}
            />
          ))}
      </div>
    </div>
  );
}

function ElementRenderer({ element, currentTime, skipAnimation }: { element: CanvasElement; currentTime: number; skipAnimation?: boolean }) {
  const anims = skipAnimation ? [] : getAnimations(element);
  let activeAnimConfig = null;
  let activeAnimPreset = null;
  for (let i = anims.length - 1; i >= 0; i--) {
    if (currentTime >= (anims[i].delay || 0)) {
      activeAnimConfig = anims[i];
      activeAnimPreset = animationPresets[anims[i].preset];
      break;
    }
  }

  const motionProps = (() => {
    if (!activeAnimPreset || !activeAnimConfig) return {};
    const cleanVariants = { ...activeAnimPreset.variants };
    if (cleanVariants.visible && typeof cleanVariants.visible === 'object' && !Array.isArray(cleanVariants.visible)) {
      const { transition: _t, ...rest } = cleanVariants.visible as Record<string, any>;
      cleanVariants.visible = rest;
    }
    const easing = activeAnimConfig.easing || 'easeOut';
    const isSpring = easing === 'spring' || easing === 'bounce';
    return {
      initial: 'hidden',
      animate: 'visible',
      variants: cleanVariants,
      transition: {
        duration: isSpring ? undefined : (activeAnimConfig.duration || 600) / 1000,
        ease: isSpring ? undefined : easing,
        type: isSpring ? 'spring' : 'tween',
        ...(easing === 'spring' ? { stiffness: 200, damping: 20 } : {}),
        ...(easing === 'bounce' ? { bounce: 0.5 } : {}),
      },
    };
  })();

  const firstDelay = anims.length > 0 ? Math.min(...anims.map(a => a.delay || 0)) : 0;
  const hiddenBeforeDelay = firstDelay > 0 && currentTime < firstDelay;

  // Hide widget after its duration has elapsed
  const hiddenAfterWidgetEnd = (() => {
    if (element.type !== 'widget') return false;
    const wc = element.content as WidgetContent;
    const widgetDurationMs = (wc.durationInFrames / wc.fps) * 1000;
    return currentTime > firstDelay + widgetDurationMs;
  })();

  const interp = getInterpolatedProperties(element.keyframes, currentTime);
  const posX = interp ? interp.x : element.position.x;
  const posY = interp ? interp.y : element.position.y;
  const w = interp?.width ?? element.size.width;
  const h = interp?.height ?? element.size.height;
  const rot = interp?.rotation ?? element.rotation;

  const isStrokeDraw = activeAnimConfig?.preset === 'strokeDraw';
  const strokeDrawDur = activeAnimConfig ? (activeAnimConfig.duration || 1200) / 1000 : 1.2;

  const renderContent = () => {
    switch (element.type) {
      case 'logo': {
        const c = element.content as LogoContent;
        return (
          <img src={c.src} alt={c.alt}
            style={{ width: '100%', height: '100%', objectFit: 'contain', filter: c.filter || undefined }} />
        );
      }
      case 'image': {
        const c = element.content as ImageContent;
        return <img src={c.src} alt={c.alt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
      }
      case 'text': {
        const c = element.content as TextContent;
        const elAnims = getAnimations(element);
        const firstAnimDelay = elAnims.length > 0 ? Math.min(...elAnims.map(a => a.delay || 0)) : 0;
        const textElapsed = Math.max(0, currentTime - firstAnimDelay);
        const displayedText = getTypewriterText(c.text, c.typewriter, textElapsed, elAnims[0]?.duration);
        return (
          <div style={{
            fontSize: interp?.fontSize ?? c.fontSize,
            color: interp?.color ?? c.color,
            fontFamily: c.fontFamily,
            fontWeight: c.fontWeight,
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {displayedText}
          </div>
        );
      }
      case 'shape': {
        const c = element.content as ShapeContent;
        const fill = interp?.fill ?? c.fill;
        const stroke = interp?.stroke ?? c.stroke;
        const strokeWidth = interp?.strokeWidth ?? c.strokeWidth;
        const shapeStyle: React.CSSProperties = {
          width: '100%', height: '100%',
          backgroundColor: fill,
          border: stroke ? `${strokeWidth || 1}px solid ${stroke}` : 'none',
        };
        if (c.shape === 'circle') shapeStyle.borderRadius = '50%';
        else if (c.borderRadius) shapeStyle.borderRadius = interp?.borderRadius ?? c.borderRadius;
        return <div style={shapeStyle} />;
      }
      case 'widget': {
        const wAnims = getAnimations(element);
        const wDelay = wAnims.length > 0 ? Math.min(...wAnims.map(a => a.delay || 0)) : 0;
        return <WidgetRenderer content={element.content as WidgetContent} width={w} height={h} currentTimeOverride={currentTime} delayOverride={wDelay} />;
      }
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: posX, top: posY,
        width: w, height: h,
        transform: `rotate(${rot}deg)`,
        zIndex: element.zIndex,
        display: (hiddenBeforeDelay || hiddenAfterWidgetEnd) ? 'none' : undefined,
      }}
    >
      {wrapWithEffects(element.effects, (
        <motion.div
          {...motionProps}
          style={{
            width: '100%', height: '100%',
            ...(element.clip ? {
              clipPath: `inset(${element.clip.top}% ${element.clip.right}% ${element.clip.bottom}% ${element.clip.left}%)`,
            } : {}),
            ...(isStrokeDraw ? {
              animation: `stroke-draw-fill ${strokeDrawDur}s ease-in-out forwards`,
            } : {}),
          }}
        >
          {renderContent()}
        </motion.div>
      ), element.id)}
      {isStrokeDraw && element.type === 'shape' && (() => {
        const c = element.content as ShapeContent;
        const sw = c.strokeWidth || 2;
        const color = c.stroke || c.fill || '#ffffff';
        const isCircle = c.shape === 'circle';
        const isTriangle = c.shape === 'triangle';
        const br = c.borderRadius || 0;
        const perimeter = isCircle
          ? Math.PI * Math.min(w, h)
          : isTriangle
            ? (Math.sqrt((w/2)**2 + h**2) * 2 + w)
            : 2 * (w + h);
        return (
          <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', overflow: 'visible' }}>
            {isCircle ? (
              <ellipse cx={w/2} cy={h/2} rx={(w-sw)/2} ry={(h-sw)/2}
                fill="none" stroke={color} strokeWidth={sw}
                strokeDasharray={perimeter}
                style={{ '--stroke-perimeter': perimeter, animation: `stroke-draw ${strokeDrawDur*0.7}s ease-in-out forwards`, strokeDashoffset: perimeter } as React.CSSProperties} />
            ) : isTriangle ? (
              <polygon points={`${w/2},${sw/2} ${w-sw/2},${h-sw/2} ${sw/2},${h-sw/2}`}
                fill="none" stroke={color} strokeWidth={sw} strokeLinejoin="round"
                strokeDasharray={perimeter}
                style={{ '--stroke-perimeter': perimeter, animation: `stroke-draw ${strokeDrawDur*0.7}s ease-in-out forwards`, strokeDashoffset: perimeter } as React.CSSProperties} />
            ) : (
              <rect x={sw/2} y={sw/2} width={w-sw} height={h-sw} rx={br} ry={br}
                fill="none" stroke={color} strokeWidth={sw}
                strokeDasharray={perimeter}
                style={{ '--stroke-perimeter': perimeter, animation: `stroke-draw ${strokeDrawDur*0.7}s ease-in-out forwards`, strokeDashoffset: perimeter } as React.CSSProperties} />
            )}
          </svg>
        );
      })()}
    </div>
  );
}

function resolveElementForMorph(element: CanvasElement, time: number): CanvasElement {
  const interpolated = getInterpolatedProperties(element.keyframes, time);
  const content = (() => {
    switch (element.type) {
      case 'text': {
        const textContent = element.content as TextContent;
        return {
          ...textContent,
          color: interpolated?.color ?? textContent.color,
          fontSize: interpolated?.fontSize ?? textContent.fontSize,
        };
      }
      case 'shape': {
        const shapeContent = element.content as ShapeContent;
        return {
          ...shapeContent,
          fill: interpolated?.fill ?? shapeContent.fill,
          stroke: interpolated?.stroke ?? shapeContent.stroke,
          strokeWidth: interpolated?.strokeWidth ?? shapeContent.strokeWidth,
          borderRadius: interpolated?.borderRadius ?? shapeContent.borderRadius,
        };
      }
      default:
        return element.content;
    }
  })();

  return {
    ...element,
    position: {
      x: interpolated?.x ?? element.position.x,
      y: interpolated?.y ?? element.position.y,
    },
    size: {
      width: interpolated?.width ?? element.size.width,
      height: interpolated?.height ?? element.size.height,
    },
    rotation: interpolated?.rotation ?? element.rotation,
    content,
    keyframes: undefined,
  };
}

// Check if an element should be visible at a given local time
function isElementVisibleAtTime(element: CanvasElement, localTime: number): boolean {
  const anims = getAnimations(element);
  const firstDelay = anims.length > 0 ? Math.min(...anims.map(a => a.delay || 0)) : 0;

  // Hidden before first animation delay
  if (firstDelay > 0 && localTime < firstDelay) return false;

  // Widget: hidden after duration elapsed
  if (element.type === 'widget') {
    const wc = element.content as WidgetContent;
    const widgetDurationMs = (wc.durationInFrames / wc.fps) * 1000;
    if (localTime > firstDelay + widgetDurationMs) return false;
  }

  return true;
}

// Morph transition: renders matched elements interpolated, unmatched fade in/out
function MorphRenderer({
  fromScene,
  toScene,
  progress, // 0 = fully fromScene, 1 = fully toScene
  fromLocalTime,
  toLocalTime,
  canvasWidth,
  canvasHeight,
}: {
  fromScene: Scene;
  toScene: Scene;
  progress: number;
  fromLocalTime: number;
  toLocalTime: number;
  canvasWidth: number;
  canvasHeight: number;
}) {
  const fromEls = fromScene.elements.filter(el => el.visible && isElementVisibleAtTime(el, fromLocalTime));
  const toEls = toScene.elements.filter(el => el.visible && isElementVisibleAtTime(el, toLocalTime));

  // Match by stable element id first, then by name as a fallback.
  const matched: { from: CanvasElement; to: CanvasElement }[] = [];
  const unmatchedFrom: CanvasElement[] = [];
  const unmatchedTo: CanvasElement[] = [];
  const toUsed = new Set<string>();

  for (const from of fromEls) {
    const to = toEls.find((el) => el.id === from.id && !toUsed.has(el.id))
      || toEls.find(el => el.name && from.name && el.name === from.name && !toUsed.has(el.id));
    if (to) {
      matched.push({ from, to });
      toUsed.add(to.id);
    } else {
      unmatchedFrom.push(from);
    }
  }
  for (const to of toEls) {
    if (!toUsed.has(to.id)) unmatchedTo.push(to);
  }

  // Smooth ease-in-out for natural morph feel (like PowerPoint)
  const eased = progress < 0.5
    ? 2 * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 2) / 2;
  const lerp = (a: number, b: number) => a + (b - a) * eased;
  const t = eased;

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: canvasWidth, height: canvasHeight }}>
      {/* Matched elements: interpolate position, size, rotation */}
      {matched.map(({ from, to }) => {
        const resolvedFrom = resolveElementForMorph(from, fromLocalTime);
        const resolvedTo = resolveElementForMorph(to, toLocalTime);
        const x = lerp(resolvedFrom.position.x, resolvedTo.position.x);
        const y = lerp(resolvedFrom.position.y, resolvedTo.position.y);
        const w = lerp(resolvedFrom.size.width, resolvedTo.size.width);
        const h = lerp(resolvedFrom.size.height, resolvedTo.size.height);
        const rot = lerp(resolvedFrom.rotation, resolvedTo.rotation);
        // Use the "to" element for content (it's the target state)
        const displayEl = t < 0.5 ? resolvedFrom : resolvedTo;
        return (
          <div key={`morph-${from.id}-${to.id}`} style={{
            position: 'absolute',
            left: x, top: y, width: w, height: h,
            transform: `rotate(${rot}deg)`,
            zIndex: Math.max(from.zIndex, to.zIndex),
          }}>
            <ElementRenderer element={{ ...displayEl, position: { x: 0, y: 0 }, size: { width: w, height: h }, rotation: 0 }} currentTime={0} skipAnimation />
          </div>
        );
      })}

      {/* Unmatched from: fade out */}
      {unmatchedFrom.map((el) => {
        const resolved = resolveElementForMorph(el, fromLocalTime);
        return (
          <div key={`morph-out-${el.id}`} style={{
            position: 'absolute',
            left: resolved.position.x, top: resolved.position.y,
            width: resolved.size.width, height: resolved.size.height,
            transform: `rotate(${resolved.rotation}deg)`,
            zIndex: resolved.zIndex,
            opacity: 1 - t,
          }}>
            <ElementRenderer element={{ ...resolved, position: { x: 0, y: 0 }, rotation: 0 }} currentTime={0} skipAnimation />
          </div>
        );
      })}

      {/* Unmatched to: fade in */}
      {unmatchedTo.map((el) => {
        const resolved = resolveElementForMorph(el, toLocalTime);
        return (
          <div key={`morph-in-${el.id}`} style={{
            position: 'absolute',
            left: resolved.position.x, top: resolved.position.y,
            width: resolved.size.width, height: resolved.size.height,
            transform: `rotate(${resolved.rotation}deg)`,
            zIndex: resolved.zIndex,
            opacity: t,
          }}>
            <ElementRenderer element={{ ...resolved, position: { x: 0, y: 0 }, rotation: 0 }} currentTime={0} skipAnimation />
          </div>
        );
      })}
    </div>
  );
}

export const PlayerController: React.FC<PlayerControllerProps> = ({ project, onExit }) => {
  const currentTime = useProjectStore((state) => state.currentTime);
  const playbackState = useProjectStore((state) => state.playbackState);
  const playAllAnimations = useProjectStore((state) => state.playAllAnimations);
  const pauseAllAnimations = useProjectStore((state) => state.pauseAllAnimations);
  const stopAllAnimations = useProjectStore((state) => state.stopAllAnimations);
  const setCurrentTime = useProjectStore((state) => state.setCurrentTime);
  const previewAreaRef = useRef<HTMLDivElement>(null);
  const [previewAreaSize, setPreviewAreaSize] = useState({ width: 0, height: 0 });
  const [soloSceneId, setSoloSceneId] = useState<string | null>(null);

  // Spacebar play/pause (skip when interacting with form controls)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'BUTTON' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault();
        const state = useProjectStore.getState();
        if (state.playbackState === 'playing') {
          pauseAllAnimations();
        } else {
          playAllAnimations();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playAllAnimations, pauseAllAnimations]);

  useEffect(() => {
    const node = previewAreaRef.current;
    if (!node) return;
    const update = () => {
      const s = window.getComputedStyle(node);
      setPreviewAreaSize({
        width: Math.max(node.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight), 0),
        height: Math.max(node.clientHeight - parseFloat(s.paddingTop) - parseFloat(s.paddingBottom), 0),
      });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  // When soloing a scene, build a project with just that scene
  const effectiveProject = useMemo(() => {
    if (!soloSceneId) return project;
    const scene = project.scenes.find(s => s.id === soloSceneId);
    if (!scene) return project;
    return {
      ...project,
      scenes: [{ ...scene, transition: undefined }],
      activeSceneId: scene.id,
      elements: scene.elements,
      cameraKeyframes: scene.cameraKeyframes,
    };
  }, [project, soloSceneId]);

  const { slots, totalDuration } = useMemo(() => buildTimeline(effectiveProject), [effectiveProject]);

  const stageScale = previewAreaSize.width > 0 && previewAreaSize.height > 0
    ? Math.min(previewAreaSize.width / project.canvas.width, previewAreaSize.height / project.canvas.height, 1)
    : 1;

  // Determine what to render
  type RenderItem =
    | { type: 'scene'; scene: Scene; localTime: number; opacity: number; style?: React.CSSProperties; key: string }
    | {
      type: 'morph';
      fromScene: Scene;
      toScene: Scene;
      progress: number;
      fromLocalTime: number;
      toLocalTime: number;
      key: string;
    };

  const renderItems: RenderItem[] = [];

  // Detect active transition
  let activeTransition: {
    slotIndex: number;
    prevSlotIndex: number;
    progress: number;
    transType: SceneTransitionType;
    direction: TransitionDirection;
  } | null = null;

  for (let i = 1; i < slots.length; i++) {
    const slot = slots[i];
    const localTime = currentTime - slot.globalStart;

    if (slot.transitionDuration > 0 && localTime >= 0 && localTime < slot.transitionDuration) {
      const transType = slot.scene.transition?.type || 'cut';
      if (transType === 'cut') continue;

      activeTransition = {
        slotIndex: i,
        prevSlotIndex: i - 1,
        progress: localTime / slot.transitionDuration,
        transType,
        direction: slot.scene.transition?.direction || 'left',
      };
      break;
    }
  }

  // Morph transitions use their own dedicated renderer
  if (activeTransition && activeTransition.transType === 'morph') {
    const prevSlot = slots[activeTransition.prevSlotIndex];
    const slot = slots[activeTransition.slotIndex];
    renderItems.push({
      type: 'morph',
      fromScene: prevSlot.scene,
      toScene: slot.scene,
      progress: activeTransition.progress,
      fromLocalTime: currentTime - prevSlot.globalStart,
      toLocalTime: currentTime - slot.globalStart,
      key: `morph-${prevSlot.scene.id}-${slot.scene.id}`,
    });
  } else {
    // Render all visible scenes with STABLE keys (no remount = no animation replay).
    // During a styled transition, apply CSS from/to styles as overlays.
    const transStyles = activeTransition
      ? getTransitionStyles(
          activeTransition.transType,
          activeTransition.progress,
          activeTransition.direction,
          project.canvas.width,
          project.canvas.height,
        )
      : null;

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const localTime = currentTime - slot.globalStart;

      if (localTime < 0) continue;
      if (localTime > slot.duration + 500) continue;

      // Skip scene if the next scene's transition has completed
      // (prevents FROM scene from briefly re-mounting after morph/transition ends)
      if (i + 1 < slots.length) {
        const nextSlot = slots[i + 1];
        const nextLocalTime = currentTime - nextSlot.globalStart;
        const nextTransType = nextSlot.scene.transition?.type || 'cut';
        if (nextTransType !== 'cut' && nextSlot.transitionDuration > 0 && nextLocalTime >= nextSlot.transitionDuration) {
          continue;
        }
      }

      let opacity = 1;
      let style: React.CSSProperties | undefined;

      if (activeTransition) {
        if (i === activeTransition.prevSlotIndex && transStyles) {
          // FROM scene: apply transition's "from" style
          style = transStyles.from;
        } else if (i === activeTransition.slotIndex && transStyles) {
          // TO scene: apply transition's "to" style
          style = transStyles.to;
        } else if (i !== activeTransition.prevSlotIndex && i !== activeTransition.slotIndex) {
          // Other scenes not involved in the transition: hide
          continue;
        }
      }

      renderItems.push({
        type: 'scene',
        scene: slot.scene,
        localTime: Math.max(0, localTime),
        opacity,
        style,
        key: slot.scene.id, // Stable key = no React remount
      });
    }

    // Render transition overlay (flash, light leak, film burn, etc.)
    if (activeTransition && transStyles?.overlay) {
      renderItems.push({
        type: 'scene',
        scene: slots[0].scene, // dummy, won't render elements
        localTime: 0,
        opacity: 1,
        style: { ...transStyles.overlay, position: 'absolute' as const },
        key: '__transition-overlay__',
      });
    }

    if (renderItems.length === 0 && slots.length > 0) {
      renderItems.push({ type: 'scene', scene: slots[0].scene, localTime: 0, opacity: 1, key: slots[0].scene.id });
    }
  }

  // Scene indicator
  const currentSceneIdx = slots.findIndex(
    (s) => currentTime >= s.globalStart && currentTime < s.globalStart + s.duration
  );

  return (
    <div style={{
      width: '100vw', height: '100vh',
      display: 'flex', flexDirection: 'column',
      background: 'radial-gradient(circle at top, rgba(86, 129, 255, 0.12), transparent 30%), linear-gradient(180deg, var(--ae-bg-shell) 0%, var(--ae-bg-base) 100%)',
      overflow: 'hidden',
      color: 'var(--ae-text-primary)',
    }}>
      {/* Header */}
      <div style={{
        height: 64, minHeight: 64, flexShrink: 0,
        display: 'flex', alignItems: 'center', padding: '0 20px',
        borderBottom: '1px solid var(--ae-border)',
        backgroundColor: 'rgba(14, 14, 14, 0.82)', backdropFilter: 'blur(16px)', gap: 16,
      }}>
        <button onClick={onExit} style={{
          padding: '10px 14px', backgroundColor: 'transparent', color: 'var(--ae-text-primary)',
          border: '1px solid var(--ae-border)', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>
          Zurück
        </button>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{project.name}</div>
          <div style={{ fontSize: 12, color: 'var(--ae-text-secondary)' }}>
            {soloSceneId
              ? `Solo: ${project.scenes.find(s => s.id === soloSceneId)?.name || '?'}`
              : slots.length > 1
                ? `Szene ${Math.max(0, currentSceneIdx) + 1} / ${project.scenes.length}`
                : 'Player / Preview'}
          </div>
        </div>

        {/* Scene solo buttons */}
        {project.scenes.length > 1 && (
          <div style={{ display: 'flex', gap: 4, marginLeft: 16 }}>
            <button
              onClick={() => { setSoloSceneId(null); stopAllAnimations(); setCurrentTime(0); }}
              style={{
                padding: '6px 10px', fontSize: 11, fontWeight: 600, borderRadius: 6, cursor: 'pointer',
                backgroundColor: soloSceneId === null ? 'var(--ae-accent)' : 'var(--ae-bg-panel-raised)',
                color: soloSceneId === null ? 'var(--ae-gray-900)' : 'var(--ae-text-secondary)',
                border: soloSceneId === null ? 'none' : '1px solid var(--ae-border)',
              }}
            >
              Alle
            </button>
            {project.scenes.map((scene, i) => (
              <button
                key={scene.id}
                onClick={() => { setSoloSceneId(soloSceneId === scene.id ? null : scene.id); stopAllAnimations(); setCurrentTime(0); }}
                style={{
                  padding: '6px 10px', fontSize: 11, fontWeight: 600, borderRadius: 6, cursor: 'pointer',
                  backgroundColor: soloSceneId === scene.id ? 'var(--ae-accent)' : 'var(--ae-bg-panel-raised)',
                  color: soloSceneId === scene.id ? 'var(--ae-gray-900)' : 'var(--ae-text-secondary)',
                  border: soloSceneId === scene.id ? 'none' : '1px solid var(--ae-border)',
                }}
              >
                S{i + 1}
              </button>
            ))}
          </div>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={playbackState === 'playing' ? pauseAllAnimations : playAllAnimations}
            style={{
              padding: '10px 16px',
              backgroundColor: playbackState === 'playing' ? 'var(--ae-notice)' : 'var(--ae-accent)',
              color: 'var(--ae-gray-900)', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {playbackState === 'playing' ? 'Pause' : '▶ Play'}
          </button>
          <button
            onClick={() => { stopAllAnimations(); setCurrentTime(0); }}
            style={{
              padding: '10px 16px', backgroundColor: 'var(--ae-bg-panel-raised)',
              color: 'var(--ae-text-primary)', border: '1px solid var(--ae-border)',
              borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Stop
          </button>
        </div>
      </div>

      {/* Timeline scrubber — ABOVE video */}
      <div style={{
        height: 48, minHeight: 48, flexShrink: 0,
        padding: '8px 24px',
        borderBottom: '1px solid var(--ae-border)',
        backgroundColor: 'rgba(14, 14, 14, 0.6)',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{ minWidth: 56, fontSize: 12, color: 'var(--ae-text-secondary)', fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace' }}>
          {formatTime(currentTime)}
        </div>

        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="range" min={0} max={Math.max(1, totalDuration)} step={1}
            value={Math.min(currentTime, totalDuration)}
            onMouseDown={(e) => e.stopPropagation()}
            onInput={(e) => {
              const t = Number((e.target as HTMLInputElement).value);
              if (playbackState === 'playing') {
                pauseAllAnimations();
              } else if (playbackState === 'stopped') {
                useProjectStore.setState({ playbackState: 'paused' });
              }
              setCurrentTime(t);
            }}
            style={{ width: '100%', accentColor: 'var(--ae-accent)', cursor: 'pointer', position: 'relative', zIndex: 2 }}
          />
          {/* Scene boundary markers */}
          {!soloSceneId && slots.length > 1 && slots.slice(1).map((slot, i) => {
            const pct = totalDuration > 0 ? (slot.globalStart / totalDuration) * 100 : 0;
            return (
              <div key={i} style={{
                position: 'absolute', left: `${pct}%`, top: -2,
                width: 1, height: 6,
                backgroundColor: 'var(--ae-accent)',
                opacity: 0.6,
                pointerEvents: 'none',
              }} />
            );
          })}
        </div>

        <div style={{ minWidth: 56, textAlign: 'right', fontSize: 12, color: 'var(--ae-text-secondary)', fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace' }}>
          {formatTime(totalDuration)}
        </div>
      </div>

      {/* Canvas */}
      <div ref={previewAreaRef} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 24 }}>
        <div style={{ position: 'relative', width: project.canvas.width * stageScale, height: project.canvas.height * stageScale, flex: '0 0 auto' }}>
          <div style={{
            width: project.canvas.width, height: project.canvas.height,
            transform: `scale(${stageScale})`, transformOrigin: 'top left',
            position: 'absolute', top: 0, left: 0,
            backgroundColor: project.canvas.backgroundColor,
            boxShadow: '0 30px 80px rgba(0, 0, 0, 0.55)', overflow: 'hidden',
          }}>
            {renderItems.map((item) => {
              if (item.type === 'morph') {
                return (
                  <MorphRenderer
                    key={item.key}
                    fromScene={item.fromScene}
                    toScene={item.toScene}
                    progress={item.progress}
                    fromLocalTime={item.fromLocalTime}
                    toLocalTime={item.toLocalTime}
                    canvasWidth={project.canvas.width}
                    canvasHeight={project.canvas.height}
                  />
                );
              }
              // Scene rendering (normal + styled transitions).
              // key={scene.id} stays stable, so React never remounts = no animation replay.
              if (item.key === '__transition-overlay__') {
                return <div key={item.key} style={item.style} />;
              }
              return (
                <div key={item.key} style={{
                  position: 'absolute', top: 0, left: 0,
                  width: project.canvas.width, height: project.canvas.height,
                  ...item.style,
                }}>
                  <SceneRenderer
                    scene={item.scene}
                    localTime={item.localTime}
                    canvasWidth={project.canvas.width}
                    canvasHeight={project.canvas.height}
                    opacity={item.opacity}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Spacebar hint */}
    </div>
  );
};
