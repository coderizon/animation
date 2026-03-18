import { useViewportStore } from '../../store/useViewportStore';

export const SnapGuides: React.FC = () => {
  const guides = useViewportStore((state) => state.snapGuides);

  if (guides.length === 0) return null;

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 10000,
        overflow: 'visible',
      }}
    >
      {guides.map((guide, i) =>
        guide.orientation === 'vertical' ? (
          <line
            key={i}
            x1={guide.position}
            y1={guide.start}
            x2={guide.position}
            y2={guide.end}
            stroke="#FF00FF"
            strokeWidth={1}
            strokeDasharray="4 2"
          />
        ) : (
          <line
            key={i}
            x1={guide.start}
            y1={guide.position}
            x2={guide.end}
            y2={guide.position}
            stroke="#FF00FF"
            strokeWidth={1}
            strokeDasharray="4 2"
          />
        )
      )}
    </svg>
  );
};
