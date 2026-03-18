import React from 'react';
import { AVATAR_SIZE } from './config';

// Cyclic interpolation helper
function cycleValue(
  frame: number,
  cycleLengthFrames: number,
  keyframes: number[],
  values: number[],
  offset: number,
): number {
  const adjustedFrame = (frame + offset * 30) % cycleLengthFrames;
  const progress = adjustedFrame / cycleLengthFrames;
  for (let i = 0; i < keyframes.length - 1; i++) {
    if (progress >= keyframes[i] && progress <= keyframes[i + 1]) {
      const segProgress = (progress - keyframes[i]) / (keyframes[i + 1] - keyframes[i]);
      return values[i] + (values[i + 1] - values[i]) * segProgress;
    }
  }
  return values[values.length - 1];
}

interface TypingPersonProps {
  frame: number;
  delay: number;
  flip: boolean;
}

export const TypingPerson: React.FC<TypingPersonProps> = ({ frame, delay, flip }) => {
  const armFrontRot = cycleValue(frame, 18, [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1], [0, 3, -2, 1, 4, -1, 2, 0], delay);
  const armFrontY = cycleValue(frame, 18, [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1], [0, 1, -1, 0, 2, -1, 1, 0], delay);
  const armBackRot = cycleValue(frame, 21, [0, 0.2, 0.4, 0.6, 0.8, 1], [2, -2, 3, 0, 1, 2], delay);
  const armBackY = cycleValue(frame, 21, [0, 0.2, 0.4, 0.6, 0.8, 1], [1, -1, 2, 0, 1, 1], delay);
  const headBobRot = cycleValue(frame, 90, [0, 0.5, 1], [0, 2, 0], delay);
  const headBobY = cycleValue(frame, 90, [0, 0.5, 1], [0, 2, 0], delay);
  const screenGlow = cycleValue(frame, 120, [0, 0.5, 0.8, 1], [0.35, 0.65, 0.25, 0.35], delay);

  return (
    <svg
      viewBox="0 0 300 300"
      width={AVATAR_SIZE}
      height={AVATAR_SIZE}
      style={{ transform: flip ? 'scaleX(-1)' : undefined }}
    >
      <defs>
        <linearGradient id={`glowZoom-${delay}`} x1="1" y1="0.5" x2="0" y2="0.5">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.8} />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
        </linearGradient>
      </defs>
      <rect x="0" y="215" width="300" height="100" fill="#C9D9F9" />
      <polygon
        points="225,75 275,215 0,215 0,40"
        fill={`url(#glowZoom-${delay})`}
        opacity={screenGlow}
      />
      <path d="M 15 170 L 15 300" fill="none" stroke="#AECBFA" strokeWidth="22" strokeLinecap="round" />
      <g fill="none" stroke="#5F6368" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 160 215 L 285 215" strokeWidth="12" />
        <path d="M 275 215 L 225 75" strokeWidth="12" />
      </g>
      <path
        d="M 95 150 L 165 198 L 230 208"
        fill="none" stroke="#1967D2" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round"
        style={{
          transform: `rotate(${armBackRot}deg) translateY(${armBackY}px)`,
          transformOrigin: '95px 150px',
        }}
      />
      <path d="M 95 130 L 95 350" fill="none" stroke="#4285F4" strokeWidth="55" strokeLinecap="round" />
      <g style={{ transform: `rotate(${headBobRot}deg) translateY(${headBobY}px)`, transformOrigin: '95px 110px' }}>
        <circle cx="95" cy="65" r="38" fill="#4285F4" />
      </g>
      <path
        d="M 95 150 L 145 195 L 195 208"
        fill="none" stroke="#4285F4" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round"
        style={{
          transform: `rotate(${armFrontRot}deg) translateY(${armFrontY}px)`,
          transformOrigin: '95px 150px',
        }}
      />
    </svg>
  );
};
