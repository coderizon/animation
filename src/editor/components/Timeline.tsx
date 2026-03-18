import { useProjectStore } from '../../store/useProjectStore';

export const Timeline: React.FC = () => {
  const project = useProjectStore((state) => state.project);
  const selectedElementId = useProjectStore((state) => state.selectedElementId);
  const selectElement = useProjectStore((state) => state.selectElement);
  const playAllAnimations = useProjectStore((state) => state.playAllAnimations);
  const isPlayingAll = useProjectStore((state) => state.isPlayingAll);

  const animatedElements = project.elements.filter((el) => el.animation && el.animation.preset !== 'none');

  // Calculate total timeline duration
  const maxTime = Math.max(
    3000,
    ...animatedElements.map((el) => (el.animation!.delay || 0) + (el.animation!.duration || 600))
  );

  // Scale: pixels per millisecond
  const timelineWidth = 600;
  const pxPerMs = timelineWidth / maxTime;

  // Time markers
  const markerInterval = maxTime <= 3000 ? 500 : maxTime <= 6000 ? 1000 : 2000;
  const markers: number[] = [];
  for (let t = 0; t <= maxTime; t += markerInterval) {
    markers.push(t);
  }

  return (
    <div style={{
      height: 140,
      backgroundColor: '#1a1a2e',
      borderTop: '1px solid #2a2a3e',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Timeline Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 16px',
        borderBottom: '1px solid #2a2a3e',
        minHeight: 32,
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Timeline
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#666' }}>
            {animatedElements.length} animated
          </span>
          <button
            onClick={playAllAnimations}
            disabled={isPlayingAll || animatedElements.length === 0}
            style={{
              padding: '4px 12px',
              backgroundColor: isPlayingAll ? '#4CAF50' : 'transparent',
              color: isPlayingAll ? '#fff' : '#aaa',
              border: '1px solid #2a2a3e',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              cursor: isPlayingAll || animatedElements.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            {isPlayingAll ? 'Playing...' : 'Play All'}
          </button>
        </div>
      </div>

      {/* Timeline Body */}
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'auto',
      }}>
        {/* Element Labels */}
        <div style={{
          minWidth: 120,
          maxWidth: 120,
          borderRight: '1px solid #2a2a3e',
          overflow: 'hidden',
        }}>
          {/* Time ruler spacer */}
          <div style={{ height: 20, borderBottom: '1px solid #2a2a3e' }} />
          {animatedElements.map((el) => (
            <div
              key={el.id}
              onClick={() => selectElement(el.id)}
              style={{
                height: 24,
                display: 'flex',
                alignItems: 'center',
                padding: '0 8px',
                fontSize: 11,
                color: el.id === selectedElementId ? '#2196F3' : '#aaa',
                cursor: 'pointer',
                backgroundColor: el.id === selectedElementId ? 'rgba(33, 150, 243, 0.1)' : 'transparent',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                borderBottom: '1px solid #1f1f35',
              }}
            >
              {el.type === 'text' && el.content.type === 'text' ? el.content.text : el.type}
              {el.type === 'logo' && el.content.type === 'logo' ? ` (${el.content.alt})` : ''}
            </div>
          ))}
          {animatedElements.length === 0 && (
            <div style={{ padding: '12px 8px', fontSize: 11, color: '#555' }}>
              No animations yet
            </div>
          )}
        </div>

        {/* Timeline Tracks */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          position: 'relative',
        }}>
          {/* Time Ruler */}
          <div style={{
            height: 20,
            position: 'relative',
            borderBottom: '1px solid #2a2a3e',
            minWidth: timelineWidth,
          }}>
            {markers.map((t) => (
              <div
                key={t}
                style={{
                  position: 'absolute',
                  left: t * pxPerMs,
                  top: 0,
                  height: '100%',
                  display: 'flex',
                  alignItems: 'flex-end',
                  paddingBottom: 2,
                }}
              >
                <span style={{
                  fontSize: 9,
                  color: '#555',
                  fontFamily: 'monospace',
                  marginLeft: 2,
                }}>
                  {t >= 1000 ? `${(t / 1000).toFixed(1)}s` : `${t}ms`}
                </span>
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: 1,
                  height: '100%',
                  backgroundColor: '#2a2a3e',
                }} />
              </div>
            ))}
          </div>

          {/* Tracks */}
          {animatedElements.map((el) => {
            const delay = el.animation!.delay || 0;
            const duration = el.animation!.duration || 600;
            const isSelected = el.id === selectedElementId;

            return (
              <div
                key={el.id}
                onClick={() => selectElement(el.id)}
                style={{
                  height: 24,
                  position: 'relative',
                  minWidth: timelineWidth,
                  borderBottom: '1px solid #1f1f35',
                  cursor: 'pointer',
                }}
              >
                {/* Animation bar */}
                <div style={{
                  position: 'absolute',
                  left: delay * pxPerMs,
                  width: Math.max(duration * pxPerMs, 4),
                  top: 4,
                  height: 16,
                  backgroundColor: isSelected ? '#2196F3' : '#3a3a5e',
                  borderRadius: 3,
                  border: isSelected ? '1px solid #64B5F6' : '1px solid #4a4a6e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}>
                  <span style={{
                    fontSize: 9,
                    color: isSelected ? '#fff' : '#999',
                    whiteSpace: 'nowrap',
                    padding: '0 4px',
                  }}>
                    {el.animation!.preset}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
