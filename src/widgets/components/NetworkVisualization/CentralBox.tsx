import React from 'react';

interface CentralBoxProps {
  frame: number;
}

function pulse(progress: number): { opacity: number; blur: number } {
  const t = (Math.sin(progress * Math.PI * 2) + 1) / 2;
  return { opacity: 0.5 + t * 0.5, blur: 2 + t * 8 };
}

export const CentralBox: React.FC<CentralBoxProps> = ({ frame }) => {
  const y1 = pulse((frame % 60) / 60);
  const r1 = pulse((frame % 45) / 45);
  const b1 = pulse((frame % 75) / 75);
  const b2 = pulse(((frame + 15) % 75) / 75);
  const y2 = pulse(((frame + 9) % 60) / 60);
  const r2 = pulse(((frame + 21) % 45) / 45);

  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: 180,
      height: 180,
      zIndex: 20,
    }}>
      <svg viewBox="0 0 200 200">
        <rect x="20" y="20" width="160" height="160" rx="12" fill="#13151A" stroke="#4A6BFF" strokeWidth="2"
          style={{ filter: 'drop-shadow(0 0 20px rgba(74, 107, 255, 0.3))' }} />

        <rect x="40" y="50" width="120" height="25" rx="4" fill="#2B303B" />
        <rect x="50" y="58" width="40" height="9" rx="2" fill="#1A1D24" />
        <circle cx="130" cy="62" r="4" fill="#FFD166" opacity={y1.opacity}
          style={{ filter: `drop-shadow(0 0 ${y1.blur}px #FFD166)` }} />
        <circle cx="145" cy="62" r="4" fill="#EF476F" opacity={r1.opacity}
          style={{ filter: `drop-shadow(0 0 ${r1.blur}px #EF476F)` }} />

        <rect x="40" y="87" width="120" height="25" rx="4" fill="#2B303B" />
        <rect x="50" y="95" width="40" height="9" rx="2" fill="#1A1D24" />
        <circle cx="130" cy="99" r="4" fill="#4A6BFF" opacity={b1.opacity}
          style={{ filter: `drop-shadow(0 0 ${b1.blur}px #4A6BFF)` }} />
        <circle cx="145" cy="99" r="4" fill="#4A6BFF" opacity={b2.opacity}
          style={{ filter: `drop-shadow(0 0 ${b2.blur}px #4A6BFF)` }} />

        <rect x="40" y="124" width="120" height="25" rx="4" fill="#2B303B" />
        <rect x="50" y="132" width="40" height="9" rx="2" fill="#1A1D24" />
        <circle cx="130" cy="136" r="4" fill="#FFD166" opacity={y2.opacity}
          style={{ filter: `drop-shadow(0 0 ${y2.blur}px #FFD166)` }} />
        <circle cx="145" cy="136" r="4" fill="#EF476F" opacity={r2.opacity}
          style={{ filter: `drop-shadow(0 0 ${r2.blur}px #EF476F)` }} />
      </svg>
    </div>
  );
};
