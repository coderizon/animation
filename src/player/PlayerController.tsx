import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ImageContent, Project, CanvasElement, ShapeContent, TextContent, WidgetContent } from '../types/project';
import { animationPresets } from '../animations/presets';
import { WidgetRenderer } from '../editor/components/WidgetRenderer';
import { useProjectStore } from '../store/useProjectStore';
import { getInterpolatedProperties, InterpolatedProps } from '../editor/utils/keyframeInterpolation';
import { getTypewriterText } from '../utils/typewriter';

interface PlayerControllerProps {
  project: Project;
  onExit: () => void;
}

function getProjectDuration(project: Project): number {
  const maxFramerDuration = project.elements.reduce((max, el) => {
    if (!el.animation || el.type === 'widget') return max;
    const totalTime = (el.animation.delay || 0) + (el.animation.duration || 600);
    return Math.max(max, totalTime);
  }, 0);

  const maxWidgetDuration = project.elements.reduce((max, el) => {
    if (el.type !== 'widget') return max;
    const wc = el.content as WidgetContent;
    const totalMs = (wc.durationInFrames / wc.fps) * 1000;
    return Math.max(max, totalMs);
  }, 0);

  const maxKeyframeDuration = project.elements.reduce((max, el) => {
    if (!el.keyframes || el.keyframes.length === 0) return max;
    return Math.max(max, ...el.keyframes.map((kf) => kf.time));
  }, 0);

  return Math.max(maxFramerDuration, maxWidgetDuration, maxKeyframeDuration + 500, 3000);
}

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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

    const updatePreviewAreaSize = () => {
      const styles = window.getComputedStyle(node);
      const paddingX = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
      const paddingY = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);

      setPreviewAreaSize({
        width: Math.max(node.clientWidth - paddingX, 0),
        height: Math.max(node.clientHeight - paddingY, 0),
      });
    };

    updatePreviewAreaSize();

    const resizeObserver = new ResizeObserver(() => {
      updatePreviewAreaSize();
    });

    resizeObserver.observe(node);
    return () => resizeObserver.disconnect();
  }, []);

  const duration = getProjectDuration(project);
  const progress = duration > 0 ? Math.min(currentTime / duration, 1) : 0;
  const stageScale = previewAreaSize.width > 0 && previewAreaSize.height > 0
    ? Math.min(
        previewAreaSize.width / project.canvas.width,
        previewAreaSize.height / project.canvas.height,
        1,
      )
    : 1;
  const scaledStageWidth = project.canvas.width * stageScale;
  const scaledStageHeight = project.canvas.height * stageScale;

  const renderContent = (element: CanvasElement, interp: InterpolatedProps | null) => {
    switch (element.type) {
      case 'logo': {
        const c = element.content as { src: string; alt: string };
        return (
          <img
            src={c.src}
            alt={c.alt}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
          />
        );
      }
      case 'image': {
        const c = element.content as ImageContent;
        return (
          <img
            src={c.src}
            alt={c.alt}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        );
      }
      case 'text': {
        const c = element.content as TextContent;
        const textElapsed = Math.max(0, currentTime - (element.animation?.delay || 0));
        const displayedText = getTypewriterText(
          c.text,
          c.typewriter,
          textElapsed,
          element.animation?.duration,
        );
        return (
          <div style={{
            fontSize: interp?.fontSize ?? c.fontSize,
            color: interp?.color ?? c.color,
            fontFamily: c.fontFamily,
            fontWeight: c.fontWeight,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
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
          width: '100%',
          height: '100%',
          backgroundColor: fill,
          border: stroke
            ? `${strokeWidth || 1}px solid ${stroke}`
            : 'none',
        };

        if (c.shape === 'circle') {
          shapeStyle.borderRadius = '50%';
        }

        return <div style={shapeStyle} />;
      }
      case 'widget':
        return (
          <WidgetRenderer
            content={element.content as WidgetContent}
            width={interp?.width ?? element.size.width}
            height={interp?.height ?? element.size.height}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background:
          'radial-gradient(circle at top, rgba(86, 129, 255, 0.12), transparent 30%), linear-gradient(180deg, var(--ae-bg-shell) 0%, var(--ae-bg-base) 100%)',
        overflow: 'hidden',
        color: 'var(--ae-text-primary)',
      }}
    >
      <div
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          borderBottom: '1px solid var(--ae-border)',
          backgroundColor: 'rgba(14, 14, 14, 0.82)',
          backdropFilter: 'blur(16px)',
          gap: 16,
        }}
      >
        <button
          onClick={onExit}
          style={{
            padding: '10px 14px',
            backgroundColor: 'transparent',
            color: 'var(--ae-text-primary)',
            border: '1px solid var(--ae-border)',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Zurück
        </button>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ae-text-primary)' }}>{project.name}</div>
          <div style={{ fontSize: 12, color: 'var(--ae-text-secondary)' }}>Player / Preview mode</div>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={playbackState === 'playing' ? pauseAllAnimations : playAllAnimations}
            style={{
              padding: '10px 16px',
              backgroundColor: playbackState === 'playing' ? 'var(--ae-notice)' : 'var(--ae-accent)',
              color: 'var(--ae-gray-900)',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {playbackState === 'playing' ? 'Pause' : 'Play'}
          </button>
          <button
            onClick={() => {
              stopAllAnimations();
              setCurrentTime(0);
            }}
            style={{
              padding: '10px 16px',
              backgroundColor: 'var(--ae-bg-panel-raised)',
              color: 'var(--ae-text-primary)',
              border: '1px solid var(--ae-border)',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Stop
          </button>
        </div>
      </div>

      <div
        ref={previewAreaRef}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          padding: 24,
        }}
      >
        <div
          style={{
            position: 'relative',
            width: scaledStageWidth,
            height: scaledStageHeight,
            flex: '0 0 auto',
          }}
        >
          <div
            style={{
              width: project.canvas.width,
              height: project.canvas.height,
              transform: `scale(${stageScale})`,
              transformOrigin: 'top left',
              position: 'absolute',
              top: 0,
              left: 0,
              backgroundColor: project.canvas.backgroundColor,
              boxShadow: '0 30px 80px rgba(0, 0, 0, 0.55)',
              overflow: 'hidden',
            }}
          >
            {project.elements
              .filter((el) => el.visible)
              .sort((a, b) => a.zIndex - b.zIndex)
              .map((element) => {
                const animationConfig = element.animation
                  ? animationPresets[element.animation.preset]
                  : null;

                const motionProps = (() => {
                  if (!animationConfig) return {};
                  const cleanVariants = { ...animationConfig.variants };
                  if (cleanVariants.visible && typeof cleanVariants.visible === 'object' && !Array.isArray(cleanVariants.visible)) {
                    const { transition: _t, ...rest } = cleanVariants.visible as Record<string, any>;
                    cleanVariants.visible = rest;
                  }
                  const easing = element.animation?.easing || 'easeOut';
                  const isSpring = easing === 'spring' || easing === 'bounce';
                  return {
                    initial: 'hidden',
                    animate: 'visible',
                    variants: cleanVariants,
                    transition: {
                      duration: isSpring ? undefined : (element.animation?.duration || 600) / 1000,
                      ease: isSpring ? undefined : easing,
                      type: isSpring ? 'spring' : 'tween',
                      ...(easing === 'spring' ? { stiffness: 200, damping: 20 } : {}),
                      ...(easing === 'bounce' ? { bounce: 0.5 } : {}),
                    },
                  };
                })();

                const animDelay = element.animation?.delay || 0;
                const hiddenBeforeDelay = animDelay > 0 && currentTime < animDelay;

                const interp = getInterpolatedProperties(element.keyframes, currentTime);
                const posX = interp ? interp.x : element.position.x;
                const posY = interp ? interp.y : element.position.y;
                const w = interp?.width ?? element.size.width;
                const h = interp?.height ?? element.size.height;
                const rot = interp?.rotation ?? element.rotation;

                return (
                  <motion.div
                    key={element.id}
                    {...motionProps}
                    style={{
                      position: 'absolute',
                      left: posX,
                      top: posY,
                      width: w,
                      height: h,
                      transform: `rotate(${rot}deg)`,
                      zIndex: element.zIndex,
                      display: hiddenBeforeDelay ? 'none' : undefined,
                      ...(element.clip ? {
                        clipPath: `inset(${element.clip.top}% ${element.clip.right}% ${element.clip.bottom}% ${element.clip.left}%)`,
                      } : {}),
                    }}
                  >
                    {renderContent(element, interp)}
                  </motion.div>
                );
              })}
          </div>
        </div>
      </div>

      <div
        style={{
          height: 96,
          padding: '18px 24px 20px',
          borderTop: '1px solid var(--ae-border)',
          backgroundColor: 'rgba(14, 14, 14, 0.82)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          gap: 18,
        }}
      >
        <div style={{ minWidth: 72, fontSize: 13, color: 'var(--ae-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
          {formatTime(currentTime)}
        </div>
        <input
          type="range"
          min={0}
          max={duration}
          step={1}
          value={Math.min(currentTime, duration)}
          onChange={(e) => setCurrentTime(Number(e.target.value))}
          style={{
            flex: 1,
            accentColor: 'var(--ae-accent)',
          }}
        />
        <div style={{ minWidth: 72, textAlign: 'right', fontSize: 13, color: 'var(--ae-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
          {formatTime(duration)}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 24,
          bottom: 110,
          height: 4,
          width: 'calc(100% - 48px)',
          borderRadius: 999,
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            width: `${progress * 100}%`,
            height: '100%',
            background: 'linear-gradient(90deg, var(--ae-accent), var(--ae-accent-strong))',
          }}
        />
      </div>
    </div>
  );
};
