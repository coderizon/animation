import React from 'react';
import { WidgetComponentProps, WidgetRegistryEntry } from '../../types';
import { interpolate } from '../../interpolate';
import { networkConfig, TOTAL_USERS, COUNTER_FRAMES, AVATAR_SIZE } from './config';
import { TypingPerson } from './TypingPerson';
import { CentralBox } from './CentralBox';
import { ConnectionLine } from './ConnectionLine';

const CLAMP = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

const NetworkVisualization: React.FC<WidgetComponentProps> = ({ frame, width, height }) => {
  const counterValue = Math.min(
    Math.floor(interpolate(frame, [0, COUNTER_FRAMES], [0, TOTAL_USERS + 0.99], CLAMP)),
    TOTAL_USERS,
  );

  return (
    <div style={{
      width,
      height,
      backgroundColor: 'transparent',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Counter */}
      <div style={{
        position: 'absolute',
        top: 40,
        left: '50%',
        transform: 'translateX(-50%)',
        color: '#4A6BFF',
        fontSize: 24,
        fontWeight: 600,
        letterSpacing: 1,
        textShadow: '0 0 10px rgba(74, 107, 255, 0.5)',
        zIndex: 30,
        display: 'flex',
        alignItems: 'baseline',
        gap: 8,
      }}>
        <span style={{
          color: '#E8F0FE',
          fontSize: 42,
          fontWeight: 'bold',
          textShadow: '0 0 15px rgba(255, 255, 255, 0.8)',
        }}>
          {counterValue}
        </span>
        {' User Online'}
      </div>

      {/* Connection lines SVG */}
      <svg style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 5,
        pointerEvents: 'none',
      }}>
        {networkConfig.map((person, index) => {
          const userAppearFrame = (index / TOTAL_USERS) * COUNTER_FRAMES;
          const lineOpacity = interpolate(frame, [userAppearFrame, userAppearFrame + 15], [0, 1], CLAMP);

          return (
            <ConnectionLine
              key={index}
              index={index}
              person={person}
              frame={frame}
              opacity={lineOpacity}
              width={width}
              height={height}
            />
          );
        })}
      </svg>

      {/* Central hardware box */}
      <CentralBox frame={frame} />

      {/* Avatars */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 15,
        pointerEvents: 'none',
      }}>
        {networkConfig.map((person, index) => {
          const userAppearFrame = (index / TOTAL_USERS) * COUNTER_FRAMES;
          const avatarOpacity = interpolate(frame, [userAppearFrame, userAppearFrame + 15], [0, 1], CLAMP);

          return (
            <div
              key={index}
              style={{
                position: 'absolute',
                top: `${person.top}%`,
                left: `${person.left}%`,
                transform: 'translate(-50%, -50%)',
                opacity: avatarOpacity,
                borderRadius: '50%',
                overflow: 'hidden',
                boxShadow: '0 5px 15px rgba(0,0,0,0.8)',
                backgroundColor: '#E8F0FE',
                width: AVATAR_SIZE,
                height: AVATAR_SIZE,
              }}
            >
              <TypingPerson frame={frame} delay={person.delay} flip={person.flip} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const networkVisualizationWidget: WidgetRegistryEntry = {
  name: 'networkVisualization',
  displayName: 'Network Visualization',
  description: 'Netzwerk mit 20 tippenden Usern, Verbindungslinien und zentralem Server',
  icon: 'N',
  component: NetworkVisualization,
  nativeWidth: 1920,
  nativeHeight: 1080,
  defaultFps: 30,
  defaultDurationInFrames: 150,
  defaultElementWidth: 1920,
  defaultElementHeight: 1080,
};
