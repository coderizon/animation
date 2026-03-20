import React from 'react';
import { WidgetComponentProps, WidgetRegistryEntry } from '../../types';
import { NeuralNetworkSVG } from './NeuralNetworkSVG';
import { faBrain } from '@fortawesome/free-solid-svg-icons';

const NeuralNetAnimation: React.FC<WidgetComponentProps> = ({ frame, width, height }) => {
  // Neural network floats
  const floatY = Math.sin(frame * 0.04) * 12;
  const floatScale = 1 + Math.sin(frame * 0.04) * 0.015;

  return (
    <div style={{
      width,
      height,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Neural Network (centered) */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: `translate(-50%, calc(-50% + ${floatY}px)) scale(${floatScale})`,
        zIndex: 30,
        filter: 'drop-shadow(0 25px 25px rgba(0, 0, 0, 0.5))',
      }}>
        <NeuralNetworkSVG frame={frame} size={420} />
      </div>
    </div>
  );
};

export const neuralNetServerWidget: WidgetRegistryEntry = {
  name: 'neuralNetServer',
  displayName: 'Neural Network',
  description: 'Schwebendes Neural Network mit organisch bewegenden Knoten',
  icon: faBrain,
  component: NeuralNetAnimation,
  nativeWidth: 500,
  nativeHeight: 500,
  defaultFps: 30,
  defaultDurationInFrames: 300,
  defaultElementWidth: 500,
  defaultElementHeight: 500,
};
