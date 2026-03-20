import { useEffect, useRef, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ImageContent, LogoContent, Project, Scene, CanvasElement, ShapeContent, TextContent, WidgetContent, getAnimations } from '../types/project';
import { animationPresets } from '../animations/presets';
import { WidgetRenderer } from '../editor/components/WidgetRenderer';
import { useProjectStore } from '../store/useProjectStore';
import { getInterpolatedProperties, getInterpolatedCamera } from '../editor/utils/keyframeInterpolation';
import { wrapWithEffects } from '../editor/utils/effectStyles';
import { getTypewriterText } from '../utils/typewriter';

interface PlayerControllerProps {
  project: Project;
  onExit: () => void;
}

function getSceneDuration(scene: Scene): number {
  // Manual duration takes priority
  if (scene.duration && scene.duration > 0) return scene.duration;

  // Auto-calculate from content
  const els = scene.elements;
  const maxAnim = els.reduce((max, el) => {
    if (el.type === 'widget') return max;
    const anims = getAnimations(el);
    if (anims.length === 0) return max;
    return Math.max(max, anims.reduce((m, a) => Math.max(m, (a.delay || 0) + (a.duration || 600)), 0));
  }, 0);

  const maxWidget = els.reduce((max, el) => {
    if (el.type !== 'widget') return max;
    const wc = el.content as WidgetContent;
    return Math.max(max, (wc.durationInFrames / wc.fps) * 1000);
  }, 0);

  const maxKf = els.reduce((max, el) => {
    if (!el.keyframes || el.keyframes.length === 0) return max;
    return Math.max(max, ...el.keyframes.map((kf) => kf.time));
  }, 0);

  const maxCam = (scene.cameraKeyframes || []).reduce((max, kf) => Math.max(max, kf.time), 0);

  return Math.max(maxAnim, maxWidget, maxKf + 500, maxCam + 500, 2000);
}

interface SceneSlot {
  scene: Scene;
  globalStart: number; // ms from total start
  duration: number;
  transitionDuration: number; // overlap with previous scene
}

function buildTimeline(project: Project): { slots: SceneSlot[]; totalDuration: number } {
  const scenes = project.scenes || [];
  if (scenes.length === 0) return { slots: [], totalDuration: 0 };

  const slots: SceneSlot[] = [];
  let time = 0;

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const dur = getSceneDuration(scene);
    const transDur = i > 0 && scene.transition ? scene.transition.duration : 0;

    // Overlap: the transition starts transDur before the previous scene ends
    const start = i === 0 ? 0 : time - transDur;
    slots.push({ scene, globalStart: Math.max(0, start), duration: dur, transitionDuration: transDur });
    time = Math.max(0, start) + dur;
  }

  return { slots, totalDuration: time };
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
}: {
  scene: Scene;
  localTime: number;
  canvasWidth: number;
  canvasHeight: number;
  opacity: number;
}) {
  const cam = getInterpolatedCamera(scene.cameraKeyframes, localTime);
  const cameraStyle: React.CSSProperties = cam ? {
    width: canvasWidth,
    height: canvasHeight,
    transform: `translate(${canvasWidth / 2 - cam.x * cam.zoom}px, ${canvasHeight / 2 - cam.y * cam.zoom}px) scale(${cam.zoom})`,
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
      case 'widget':
        return <WidgetRenderer content={element.content as WidgetContent} width={w} height={h} />;
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
        display: hiddenBeforeDelay ? 'none' : undefined,
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

// Morph transition: renders matched elements interpolated, unmatched fade in/out
function MorphRenderer({
  fromScene,
  toScene,
  progress, // 0 = fully fromScene, 1 = fully toScene
  canvasWidth,
  canvasHeight,
}: {
  fromScene: Scene;
  toScene: Scene;
  progress: number;
  canvasWidth: number;
  canvasHeight: number;
}) {
  const fromEls = fromScene.elements.filter(el => el.visible);
  const toEls = toScene.elements.filter(el => el.visible);

  // Match by name
  const matched: { from: CanvasElement; to: CanvasElement }[] = [];
  const unmatchedFrom: CanvasElement[] = [];
  const unmatchedTo: CanvasElement[] = [];
  const toUsed = new Set<string>();

  for (const from of fromEls) {
    const to = toEls.find(el => el.name && el.name === from.name && !toUsed.has(el.id));
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
        const x = lerp(from.position.x, to.position.x);
        const y = lerp(from.position.y, to.position.y);
        const w = lerp(from.size.width, to.size.width);
        const h = lerp(from.size.height, to.size.height);
        const rot = lerp(from.rotation, to.rotation);
        // Use the "to" element for content (it's the target state)
        const displayEl = t < 0.5 ? from : to;
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
      {unmatchedFrom.map((el) => (
        <div key={`morph-out-${el.id}`} style={{
          position: 'absolute',
          left: el.position.x, top: el.position.y,
          width: el.size.width, height: el.size.height,
          transform: `rotate(${el.rotation}deg)`,
          zIndex: el.zIndex,
          opacity: 1 - t,
        }}>
          <ElementRenderer element={el} currentTime={0} skipAnimation />
        </div>
      ))}

      {/* Unmatched to: fade in */}
      {unmatchedTo.map((el) => (
        <div key={`morph-in-${el.id}`} style={{
          position: 'absolute',
          left: el.position.x, top: el.position.y,
          width: el.size.width, height: el.size.height,
          transform: `rotate(${el.rotation}deg)`,
          zIndex: el.zIndex,
          opacity: t,
        }}>
          <ElementRenderer element={el} currentTime={0} skipAnimation />
        </div>
      ))}
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

  const { slots, totalDuration } = useMemo(() => buildTimeline(project), [project]);

  const stageScale = previewAreaSize.width > 0 && previewAreaSize.height > 0
    ? Math.min(previewAreaSize.width / project.canvas.width, previewAreaSize.height / project.canvas.height, 1)
    : 1;

  // Determine what to render: normal scene, fade transition, or morph transition
  type RenderItem =
    | { type: 'scene'; scene: Scene; localTime: number; opacity: number; key: string }
    | { type: 'morph'; fromScene: Scene; toScene: Scene; progress: number; key: string };

  const renderItems: RenderItem[] = [];

  // Find active morph transition
  let morphActive = false;
  for (let i = 1; i < slots.length; i++) {
    const slot = slots[i];
    const prevSlot = slots[i - 1];
    const localTime = currentTime - slot.globalStart;

    if (slot.scene.transition?.type === 'morph' && slot.transitionDuration > 0 &&
        localTime >= 0 && localTime < slot.transitionDuration) {
      // We're in a morph transition
      const progress = localTime / slot.transitionDuration;
      renderItems.push({
        type: 'morph',
        fromScene: prevSlot.scene,
        toScene: slot.scene,
        progress,
        key: `morph-${prevSlot.scene.id}-${slot.scene.id}`,
      });
      morphActive = true;
      break;
    }
  }

  if (!morphActive) {
    // Normal rendering: scenes with fade opacity
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const localTime = currentTime - slot.globalStart;

      if (localTime < 0) continue;
      if (localTime > slot.duration + 500) continue;

      let opacity = 1;

      if (slot.transitionDuration > 0 && localTime < slot.transitionDuration) {
        const transType = slot.scene.transition?.type || 'cut';
        if (transType === 'fade') {
          opacity = localTime / slot.transitionDuration;
        }
      }

      if (i + 1 < slots.length) {
        const nextSlot = slots[i + 1];
        const nextLocalTime = currentTime - nextSlot.globalStart;
        if (nextLocalTime >= 0 && nextSlot.transitionDuration > 0 && nextLocalTime < nextSlot.transitionDuration) {
          const transType = nextSlot.scene.transition?.type || 'cut';
          if (transType === 'fade') {
            opacity = 1 - (nextLocalTime / nextSlot.transitionDuration);
          }
        }
      }

      renderItems.push({ type: 'scene', scene: slot.scene, localTime: Math.max(0, localTime), opacity, key: slot.scene.id });
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
            {slots.length > 1
              ? `Szene ${Math.max(0, currentSceneIdx) + 1} / ${slots.length}`
              : 'Player / Preview'}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={playbackState === 'playing' ? pauseAllAnimations : playAllAnimations}
            style={{
              padding: '10px 16px',
              backgroundColor: playbackState === 'playing' ? 'var(--ae-notice)' : 'var(--ae-accent)',
              color: 'var(--ae-gray-900)', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {playbackState === 'playing' ? 'Pause' : 'Play'}
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
                    canvasWidth={project.canvas.width}
                    canvasHeight={project.canvas.height}
                  />
                );
              }
              return (
                <SceneRenderer
                  key={item.key}
                  scene={item.scene}
                  localTime={item.localTime}
                  canvasWidth={project.canvas.width}
                  canvasHeight={project.canvas.height}
                  opacity={item.opacity}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Timeline scrubber */}
      <div style={{
        height: 72, minHeight: 72, flexShrink: 0,
        padding: '16px 24px',
        borderTop: '1px solid var(--ae-border)',
        backgroundColor: 'rgba(14, 14, 14, 0.82)', backdropFilter: 'blur(16px)',
        display: 'flex', alignItems: 'center', gap: 18,
      }}>
        <div style={{ minWidth: 72, fontSize: 13, color: 'var(--ae-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
          {formatTime(currentTime)}
        </div>

        {/* Scrubber with scene markers */}
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="range" min={0} max={totalDuration} step={1}
            value={Math.min(currentTime, totalDuration)}
            onChange={(e) => {
              const t = Number(e.target.value);
              // If playing, pause first so user can scrub
              if (playbackState === 'playing') pauseAllAnimations();
              setCurrentTime(t);
            }}
            style={{ width: '100%', accentColor: 'var(--ae-accent)' }}
          />
          {/* Scene boundary markers */}
          {slots.length > 1 && slots.slice(1).map((slot, i) => {
            const pct = totalDuration > 0 ? (slot.globalStart / totalDuration) * 100 : 0;
            return (
              <div key={i} style={{
                position: 'absolute', left: `${pct}%`, top: -4,
                width: 1, height: 8,
                backgroundColor: 'var(--ae-accent)',
                opacity: 0.6,
                pointerEvents: 'none',
              }} />
            );
          })}
        </div>

        <div style={{ minWidth: 72, textAlign: 'right', fontSize: 13, color: 'var(--ae-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
          {formatTime(totalDuration)}
        </div>
      </div>

      {/* Progress bar (thin strip above scrubber) */}
    </div>
  );
};
