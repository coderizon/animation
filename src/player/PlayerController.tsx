import { motion } from 'framer-motion';
import { Project, CanvasElement } from '../types/project';
import { animationPresets } from '../animations/presets';

interface PlayerControllerProps {
  project: Project;
}

export const PlayerController: React.FC<PlayerControllerProps> = ({ project }) => {
  const renderContent = (element: CanvasElement) => {
    switch (element.type) {
      case 'logo':
        return (
          <img
            src={element.content.src}
            alt={element.content.alt}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
          />
        );
      case 'text':
        return (
          <div style={{
            fontSize: element.content.fontSize,
            color: element.content.color,
            fontFamily: element.content.fontFamily,
            fontWeight: element.content.fontWeight,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {element.content.text}
          </div>
        );
      case 'shape':
        const shapeStyle: React.CSSProperties = {
          width: '100%',
          height: '100%',
          backgroundColor: element.content.fill,
          border: element.content.stroke
            ? `${element.content.strokeWidth || 1}px solid ${element.content.stroke}`
            : 'none',
        };

        if (element.content.shape === 'circle') {
          shapeStyle.borderRadius = '50%';
        }

        return <div style={shapeStyle} />;
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
            const animationConfig = element.animation
              ? animationPresets[element.animation.preset]
              : null;

            const motionProps = animationConfig
              ? {
                  initial: 'hidden',
                  animate: 'visible',
                  variants: animationConfig.variants,
                  transition: {
                    delay: (element.animation?.delay || 0) / 1000,
                    duration: (element.animation?.duration || 600) / 1000,
                    ease:
                      element.animation?.easing === 'spring'
                        ? undefined
                        : element.animation?.easing || 'easeOut',
                    type:
                      element.animation?.easing === 'spring' ||
                      element.animation?.easing === 'bounce'
                        ? 'spring'
                        : 'tween',
                  },
                }
              : {};

            return (
              <motion.div
                key={element.id}
                {...motionProps}
                style={{
                  position: 'absolute',
                  left: element.position.x,
                  top: element.position.y,
                  width: element.size.width,
                  height: element.size.height,
                  transform: `rotate(${element.rotation}deg)`,
                  zIndex: element.zIndex,
                }}
              >
                {renderContent(element)}
              </motion.div>
            );
          })}
      </div>
    </div>
  );
};
