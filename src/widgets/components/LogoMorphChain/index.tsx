import React from 'react';
import type { WidgetComponentProps, WidgetRegistryEntry } from '../../types';

/** smoothstep easing: t * t * (3 - 2 * t) */
function smoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

const LogoMorphChain: React.FC<WidgetComponentProps> = ({
  frame,
  fps,
  width,
  height,
  props,
}) => {
  const logos: string[] = (props?.logos as string[]) || [];
  const labels: string[] = (props?.labels as string[]) || [];
  const displayDuration = (props?.displayDuration as number) || 2;
  const transitionMode = (props?.transitionMode as string) || 'crossfade';
  const transitionDuration = (props?.transitionDuration as number) || 0.6;
  const showLabels = props?.showLabels !== undefined ? (props.showLabels as boolean) : true;
  const labelColor = (props?.labelColor as string) || '#ffffff';

  if (logos.length === 0) {
    return (
      <div style={{
        width, height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#666',
        fontSize: 14,
        fontFamily: 'sans-serif',
      }}>
        Keine Logos ausgewählt
      </div>
    );
  }

  // Single logo — just show it statically
  if (logos.length === 1) {
    const logoSize = Math.min(width, height) * 0.65;
    return (
      <div style={{
        width, height,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <img
          src={logos[0]}
          alt=""
          style={{
            maxWidth: logoSize,
            maxHeight: logoSize * 0.75,
            objectFit: 'contain',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
          draggable={false}
        />
        {showLabels && labels[0] && (
          <div style={{
            marginTop: 12,
            fontSize: 16,
            color: labelColor,
            fontFamily: 'sans-serif',
            textAlign: 'center',
          }}>
            {labels[0]}
          </div>
        )}
      </div>
    );
  }

  const framesPerDisplay = Math.round(displayDuration * fps);
  const framesPerTransition = Math.round(transitionDuration * fps);
  const framesPerLogo = framesPerDisplay + framesPerTransition;
  const totalFrames = framesPerLogo * logos.length;

  const loopFrame = totalFrames > 0 ? frame % totalFrames : 0;
  const currentIndex = Math.floor(loopFrame / framesPerLogo) % logos.length;
  const nextIndex = (currentIndex + 1) % logos.length;
  const frameInSlot = loopFrame % framesPerLogo;

  const isTransitioning = frameInSlot >= framesPerDisplay;
  const transitionProgress = isTransitioning
    ? smoothstep((frameInSlot - framesPerDisplay) / framesPerTransition)
    : 0;

  const logoSize = Math.min(width, height) * 0.65;
  const logoAreaStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const imgStyle: React.CSSProperties = {
    maxWidth: logoSize,
    maxHeight: logoSize * 0.75,
    objectFit: 'contain',
    pointerEvents: 'none',
    userSelect: 'none',
    transition: 'none',
  };

  // Build styles for current and next logo based on transition mode
  let currentStyle: React.CSSProperties = {};
  let nextStyle: React.CSSProperties = {};
  let currentLabelOpacity = 1;
  let nextLabelOpacity = 0;

  if (!isTransitioning) {
    // Display phase — only current logo visible
    currentStyle = { opacity: 1, transform: 'scale(1)' };
    nextStyle = { opacity: 0, transform: 'scale(0.85)' };
    currentLabelOpacity = 1;
    nextLabelOpacity = 0;
  } else {
    const t = transitionProgress;

    switch (transitionMode) {
      case 'flip': {
        const halfT = t < 0.5 ? t / 0.5 : (t - 0.5) / 0.5;
        if (t < 0.5) {
          // First half: current logo rotates away
          const rotY = smoothstep(halfT) * 90;
          currentStyle = {
            opacity: 1,
            transform: `perspective(600px) rotateY(${rotY}deg)`,
            backfaceVisibility: 'hidden',
          };
          nextStyle = { opacity: 0, transform: 'perspective(600px) rotateY(-90deg)' };
          currentLabelOpacity = 1 - smoothstep(halfT);
          nextLabelOpacity = 0;
        } else {
          // Second half: next logo rotates in
          const rotY = -90 + smoothstep(halfT) * 90;
          currentStyle = {
            opacity: 0,
            transform: 'perspective(600px) rotateY(90deg)',
          };
          nextStyle = {
            opacity: 1,
            transform: `perspective(600px) rotateY(${rotY}deg)`,
            backfaceVisibility: 'hidden',
          };
          currentLabelOpacity = 0;
          nextLabelOpacity = smoothstep(halfT);
        }
        break;
      }

      case 'zoomThrough': {
        const currentScale = 1 + t * 2; // 1 → 3
        const currentOpacity = 1 - t;
        const nextScale = 0.3 + t * 0.7; // 0.3 → 1
        const nextOpacity = t;
        currentStyle = {
          opacity: currentOpacity,
          transform: `scale(${currentScale})`,
        };
        nextStyle = {
          opacity: nextOpacity,
          transform: `scale(${nextScale})`,
        };
        currentLabelOpacity = currentOpacity;
        nextLabelOpacity = nextOpacity;
        break;
      }

      case 'crossfade':
      default: {
        const currentScale = 1 + t * 0.15; // 1 → 1.15
        const currentOpacity = 1 - t;
        const nextScale = 0.85 + t * 0.15; // 0.85 → 1
        const nextOpacity = t;
        currentStyle = {
          opacity: currentOpacity,
          transform: `scale(${currentScale})`,
        };
        nextStyle = {
          opacity: nextOpacity,
          transform: `scale(${nextScale})`,
        };
        currentLabelOpacity = currentOpacity;
        nextLabelOpacity = nextOpacity;
        break;
      }
    }
  }

  const renderLabel = (index: number, opacity: number) => {
    if (!showLabels || !labels[index]) return null;
    return (
      <div style={{
        marginTop: 12,
        fontSize: 16,
        color: labelColor,
        fontFamily: 'sans-serif',
        textAlign: 'center',
        opacity,
        transition: 'none',
      }}>
        {labels[index]}
      </div>
    );
  };

  return (
    <div style={{
      width,
      height,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Current logo */}
      <div style={{ ...logoAreaStyle, zIndex: isTransitioning ? 1 : 2 }}>
        <img
          src={logos[currentIndex]}
          alt=""
          style={{ ...imgStyle, ...currentStyle }}
          draggable={false}
        />
        {renderLabel(currentIndex, currentLabelOpacity)}
      </div>

      {/* Next logo (rendered during transition for overlap) */}
      {isTransitioning && (
        <div style={{ ...logoAreaStyle, zIndex: 2 }}>
          <img
            src={logos[nextIndex]}
            alt=""
            style={{ ...imgStyle, ...nextStyle }}
            draggable={false}
          />
          {renderLabel(nextIndex, nextLabelOpacity)}
        </div>
      )}
    </div>
  );
};

export const logoMorphChainWidget: WidgetRegistryEntry = {
  name: 'logoMorphChain',
  displayName: 'Logo-Showcase',
  description: 'Logos morphen mit Effekten ineinander über',
  icon: '◈',
  component: LogoMorphChain,
  nativeWidth: 500,
  nativeHeight: 400,
  defaultFps: 30,
  defaultDurationInFrames: 300,
  defaultElementWidth: 400,
  defaultElementHeight: 350,
};
