import React from 'react';
import type { WidgetComponentProps, WidgetRegistryEntry } from '../../types';
import { faAtom } from '@fortawesome/free-solid-svg-icons';

const LogoOrbit: React.FC<WidgetComponentProps> = ({
  frame,
  fps,
  width,
  height,
  props,
}) => {
  const logos: string[] = (props?.logos as string[]) || [];
  const centerLogo: string | undefined = props?.centerLogo as string | undefined;
  const orbitSpeed = (props?.orbitSpeed as number) || 0.3;
  const tiltAngle = (props?.tiltAngle as number) || 60;
  const logoScale = (props?.logoScale as number) || 0.2;

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

  const numLogos = logos.length;
  const radiusX = width * 0.35;
  const tiltRad = (tiltAngle * Math.PI) / 180;
  const radiusY = radiusX * Math.cos(tiltRad);
  const centerX = width / 2;
  const centerY = height / 2;
  const itemSize = Math.min(width, height) * logoScale;
  const centerLogoSize = Math.min(width, height) * 0.3;

  // Time-based rotation offset (loops seamlessly)
  const rotationOffset = (frame / fps) * orbitSpeed * 2 * Math.PI;

  // Build orbiting logo entries with computed positions
  const orbitItems = logos.map((src, i) => {
    const angle = (2 * Math.PI * i) / numLogos + rotationOffset;
    const x = centerX + Math.cos(angle) * radiusX;
    const y = centerY + Math.sin(angle) * radiusY;

    // depth: 1 = front, -1 = back
    const depth = Math.sin(angle);
    const normalizedDepth = depth * 0.5 + 0.5; // 0..1
    const scale = 0.6 + 0.4 * normalizedDepth;
    const opacity = 0.4 + 0.6 * normalizedDepth;
    const zIndex = Math.round(depth * 100);

    return { src, x, y, scale, opacity, zIndex, key: i };
  });

  return (
    <div style={{
      width,
      height,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Center logo */}
      {centerLogo && (
        <img
          src={centerLogo}
          alt=""
          style={{
            position: 'absolute',
            left: centerX - centerLogoSize / 2,
            top: centerY - centerLogoSize / 2,
            width: centerLogoSize,
            height: centerLogoSize,
            objectFit: 'contain',
            zIndex: 0,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
          draggable={false}
        />
      )}

      {/* Orbiting logos */}
      {orbitItems.map((item) => (
        <img
          key={item.key}
          src={item.src}
          alt=""
          style={{
            position: 'absolute',
            left: item.x - itemSize / 2,
            top: item.y - itemSize / 2,
            width: itemSize,
            height: itemSize,
            objectFit: 'contain',
            transform: `scale(${item.scale})`,
            opacity: item.opacity,
            zIndex: item.zIndex,
            pointerEvents: 'none',
            userSelect: 'none',
            transition: 'none',
          }}
          draggable={false}
        />
      ))}
    </div>
  );
};

export const logoOrbitWidget: WidgetRegistryEntry = {
  name: 'logoOrbit',
  displayName: 'Logo-Orbit',
  description: 'Logos kreisen auf einer 3D-Bahn um ein zentrales Element',
  icon: faAtom,
  component: LogoOrbit,
  nativeWidth: 500,
  nativeHeight: 500,
  defaultFps: 30,
  defaultDurationInFrames: 300,
  defaultElementWidth: 400,
  defaultElementHeight: 400,
};
