import React from 'react';

interface NeuralNetworkSVGProps {
  frame: number;
  size: number;
}

export const NeuralNetworkSVG: React.FC<NeuralNetworkSVGProps> = ({ frame, size }) => {
  // 5 nodes in a pentagon
  const baseNodes = [
    { angle: -90 },   // top
    { angle: -18 },   // top-right
    { angle: 54 },    // bottom-right
    { angle: 126 },   // bottom-left
    { angle: 198 },   // top-left
  ];

  const cx = 50;
  const cy = 50;
  const radius = 32;
  const nodeRadius = 3.8;

  // Organic movement: each node drifts on its own sine wave
  const getNodePos = (idx: number) => {
    const angleRad = (baseNodes[idx].angle * Math.PI) / 180;
    const baseX = cx + radius * Math.cos(angleRad);
    const baseY = cy + radius * Math.sin(angleRad);

    const seed = idx * 1.7 + 0.3;
    const driftX = Math.sin((frame * 0.02) * seed + idx * 2.1) * 1.8
                 + Math.cos((frame * 0.012) * (seed + 0.5) + idx) * 1.0;
    const driftY = Math.cos((frame * 0.017) * seed + idx * 1.8) * 1.6
                 + Math.sin((frame * 0.01) * (seed + 0.3) + idx * 0.7) * 1.2;

    return { x: baseX + driftX, y: baseY + driftY };
  };

  const nodes = baseNodes.map((_, i) => getNodePos(i));

  // Outer ring edges
  const edges: [number, number][] = [
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 0],
  ];

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ overflow: 'visible' }}>
      <defs>
        <filter id="nodeGlow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="nodeGrad" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#5FE8A0" />
          <stop offset="100%" stopColor="#34C77B" />
        </radialGradient>
      </defs>

      {/* Edges */}
      {edges.map(([a, b], i) => {
        const pulse = 0.35 + 0.15 * Math.sin(frame * 0.03 + i * 1.2);
        return (
          <line
            key={`e-${i}`}
            x1={nodes[a].x}
            y1={nodes[a].y}
            x2={nodes[b].x}
            y2={nodes[b].y}
            stroke="#2B5CFF"
            strokeWidth={2.2}
            strokeLinecap="round"
            opacity={pulse + 0.2}
          />
        );
      })}

      {/* Nodes */}
      {nodes.map((node, i) => {
        const sizePulse = 1 + 0.06 * Math.sin(frame * 0.025 + i * 1.5);
        return (
          <circle
            key={`n-${i}`}
            cx={node.x}
            cy={node.y}
            r={nodeRadius * sizePulse}
            fill="url(#nodeGrad)"
            filter="url(#nodeGlow)"
          />
        );
      })}
    </svg>
  );
};
