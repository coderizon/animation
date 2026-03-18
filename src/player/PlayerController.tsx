import { motion } from 'framer-motion';
import { Project, CanvasElement, ShapeContent, WidgetContent } from '../types/project';
import { animationPresets } from '../animations/presets';
import { WidgetRenderer } from '../editor/components/WidgetRenderer';
import { useProjectStore } from '../store/useProjectStore';
import { getInterpolatedProperties, InterpolatedProps } from '../editor/utils/keyframeInterpolation';

interface PlayerControllerProps {
  project: Project;
}

export const PlayerController: React.FC<PlayerControllerProps> = ({ project }) => {
  const currentTime = useProjectStore((state) => state.currentTime);

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
      case 'text': {
        const c = element.content as { text: string; fontSize: number; color: string; fontFamily: string; fontWeight?: number };
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
            {c.text}
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
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f0f1e',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: project.canvas.width,
          height: project.canvas.height,
          backgroundColor: project.canvas.backgroundColor,
          position: 'relative',
          boxShadow: '0 10px 50px rgba(0, 0, 0, 0.5)',
        }}
      >
        {project.elements
          .filter((el) => el.visible)
          .sort((a, b) => a.zIndex - b.zIndex)
          .map((element) => {
            const animationConfig = element.type !== 'widget' && element.animation
              ? animationPresets[element.animation.preset]
              : null;

            const motionProps = (() => {
              if (!animationConfig) return {};
              const cleanVariants = { ...animationConfig.variants };
              if (cleanVariants.visible && typeof cleanVariants.visible === 'object' && !Array.isArray(cleanVariants.visible)) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
                  delay: (element.animation?.delay || 0) / 1000,
                  duration: isSpring ? undefined : (element.animation?.duration || 600) / 1000,
                  ease: isSpring ? undefined : easing,
                  type: isSpring ? 'spring' : 'tween',
                  ...(easing === 'spring' ? { stiffness: 200, damping: 20 } : {}),
                  ...(easing === 'bounce' ? { bounce: 0.5 } : {}),
                },
              };
            })();

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
  );
};
