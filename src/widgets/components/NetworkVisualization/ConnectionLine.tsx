import React from 'react';
import {
  HORIZONTAL_SAFE_MARGIN,
  VERTICAL_SAFE_MARGIN,
  mapPercentToAxis,
  queries,
} from './config';

// Seeded random for deterministic animation offsets
function seededRandom(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

interface ConnectionLineProps {
  index: number;
  person: { top: number; left: number; delay: number; flip: boolean };
  frame: number;
  opacity: number;
  width: number;
  height: number;
}

export const ConnectionLine: React.FC<ConnectionLineProps> = ({ index, person, frame, opacity, width, height }) => {
  const serverX = width / 2;
  const serverY = height / 2;
  const avatarX = mapPercentToAxis(person.left, width, HORIZONTAL_SAFE_MARGIN);
  const avatarY = mapPercentToAxis(person.top, height, VERTICAL_SAFE_MARGIN);

  // Dashed line flow: 1s = 30 frames cycle
  const dashOffset = person.flip
    ? ((frame % 30) / 30) * 12
    : -((frame % 30) / 30) * 12;

  // Text flow along path
  const seed = seededRandom(index);
  const textDuration = (5 + seed * 4) * 30;
  const textStart = seed * 8 * 30;
  const textProgress = ((frame + textStart) % textDuration) / textDuration;

  const startOffset = person.flip
    ? `${66 - textProgress * 32}%`
    : `${34 + textProgress * 32}%`;

  // Path direction
  const x1 = person.flip ? serverX : avatarX;
  const y1 = person.flip ? serverY : avatarY;
  const x2 = person.flip ? avatarX : serverX;
  const y2 = person.flip ? avatarY : serverY;

  const pathId = `line-path-${index}`;

  return (
    <g opacity={opacity} style={{ transition: 'none' }}>
      <path
        id={pathId}
        d={`M ${x1} ${y1} L ${x2} ${y2}`}
        stroke="#4A6BFF"
        strokeWidth={1.5}
        strokeDasharray="6,6"
        strokeDashoffset={dashOffset}
        opacity={0.45}
        fill="none"
      />
      <text
        fill="#E8F0FE"
        fontSize={13}
        fontWeight={500}
        letterSpacing={0.5}
        dy={-6}
        textAnchor="middle"
      >
        <textPath href={`#${pathId}`} startOffset={startOffset}>
          {queries[index]}
        </textPath>
      </text>
    </g>
  );
};
