import React from 'react';
import type { WidgetComponentProps, WidgetRegistryEntry } from '../../types';
import { faArrowsRotate } from '@fortawesome/free-solid-svg-icons';

const LogoCarousel: React.FC<WidgetComponentProps> = ({
  frame,
  fps,
  width,
  height,
  props,
}) => {
  const logos: string[] = (props?.logos as string[]) || [];
  const displayDuration = (props?.displayDuration as number) || 2;
  const transitionDuration = (props?.transitionDuration as number) || 0.5;
  const floatDistance = (props?.floatDistance as number) || 30;
  const logoScale = (props?.logoScale as number) || 0.9;

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

  const framesPerTransition = Math.round(transitionDuration * fps);
  const framesPerDisplay = Math.round(displayDuration * fps);
  const framesPerLogo = framesPerTransition * 2 + framesPerDisplay;
  const totalFrames = framesPerLogo * logos.length;

  // Loop frame
  const loopFrame = totalFrames > 0 ? frame % totalFrames : 0;
  const currentIndex = Math.floor(loopFrame / framesPerLogo) % logos.length;
  const frameInSlot = loopFrame % framesPerLogo;

  // Calculate opacity and Y offset for current logo
  let opacity = 1;
  let translateY = 0;

  if (frameInSlot < framesPerTransition) {
    // Fade in + float up from below
    const t = frameInSlot / framesPerTransition;
    const eased = t * t * (3 - 2 * t); // smoothstep
    opacity = eased;
    translateY = floatDistance * (1 - eased);
  } else if (frameInSlot < framesPerTransition + framesPerDisplay) {
    // Holding — fully visible
    opacity = 1;
    translateY = 0;
  } else {
    // Fade out + float up
    const t = (frameInSlot - framesPerTransition - framesPerDisplay) / framesPerTransition;
    const eased = t * t * (3 - 2 * t); // smoothstep
    opacity = 1 - eased;
    translateY = -floatDistance * eased;
  }

  const logoSrc = logos[currentIndex];
  const logoSize = Math.min(width, height) * logoScale;

  return (
    <div style={{
      width,
      height,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <img
        key={currentIndex}
        src={logoSrc}
        alt=""
        style={{
          width: logoSize,
          height: logoSize,
          objectFit: 'contain',
          opacity,
          transform: `translateY(${translateY}px)`,
          transition: 'none',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
        draggable={false}
      />
    </div>
  );
};

export const logoCarouselWidget: WidgetRegistryEntry = {
  name: 'logoCarousel',
  displayName: 'Logo-Karussell',
  description: 'Logos nacheinander einblenden mit Schwebe-Animation',
  icon: faArrowsRotate,
  component: LogoCarousel,
  nativeWidth: 400,
  nativeHeight: 400,
  defaultFps: 30,
  defaultDurationInFrames: 300,
  defaultElementWidth: 300,
  defaultElementHeight: 300,
};
