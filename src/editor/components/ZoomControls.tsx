import { useProjectStore } from '../../store/useProjectStore';
import { useViewportStore } from '../../store/useViewportStore';

const ZOOM_FACTOR = 1.25;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 4;

export const ZoomControls: React.FC = () => {
  const zoom = useViewportStore((state) => state.zoom);
  const setZoom = useViewportStore((state) => state.setZoom);

  const handleZoomIn = () => {
    setZoom(Math.min(MAX_ZOOM, zoom * ZOOM_FACTOR));
  };

  const handleZoomOut = () => {
    setZoom(Math.max(MIN_ZOOM, zoom / ZOOM_FACTOR));
  };

  const handleFitToScreen = () => {
    const container = document.querySelector('[data-viewport-container]') as HTMLElement;
    if (container) {
      const rect = container.getBoundingClientRect();
      const { canvas } = useProjectStore.getState().project;
      useViewportStore.getState().fitToScreen(rect.width, rect.height, canvas.width, canvas.height);
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(29, 29, 29, 0.96)',
        border: '1px solid var(--ae-border)',
        borderRadius: 999,
        padding: '4px 6px',
        boxShadow: 'var(--ae-shadow-elevated)',
        zIndex: 100,
      }}
    >
      {/* Zoom In */}
      <button
        onClick={handleZoomIn}
        disabled={zoom >= MAX_ZOOM}
        style={{
          width: 30,
          height: 30,
          backgroundColor: 'transparent',
          color: 'var(--ae-text-primary)',
          border: 'none',
          borderRadius: 999,
          fontSize: 18,
          cursor: zoom >= MAX_ZOOM ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onMouseEnter={(e) => {
          if (zoom < MAX_ZOOM) e.currentTarget.style.backgroundColor = 'var(--ae-bg-panel-raised)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
        title="Zoom In (Ctrl+Scroll)"
      >
        +
      </button>

      {/* Zoom Display */}
      <div
        style={{
          minWidth: 52,
          height: 30,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--ae-text-secondary)',
          padding: '0 8px',
        }}
      >
        {Math.round(zoom * 100)}%
      </div>

      {/* Zoom Out */}
      <button
        onClick={handleZoomOut}
        disabled={zoom <= MIN_ZOOM}
        style={{
          width: 30,
          height: 30,
          backgroundColor: 'transparent',
          color: 'var(--ae-text-primary)',
          border: 'none',
          borderRadius: 999,
          fontSize: 18,
          cursor: zoom <= MIN_ZOOM ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onMouseEnter={(e) => {
          if (zoom > MIN_ZOOM) e.currentTarget.style.backgroundColor = 'var(--ae-bg-panel-raised)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
        title="Zoom Out (Ctrl+Scroll)"
      >
        −
      </button>

      {/* Fit to Screen */}
      <button
        onClick={handleFitToScreen}
        style={{
          width: 30,
          height: 30,
          backgroundColor: 'transparent',
          color: 'var(--ae-text-primary)',
          border: 'none',
          borderRadius: 999,
          fontSize: 14,
          cursor: 'pointer',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginLeft: 2,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--ae-bg-panel-raised)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
        title="Fit to Screen"
      >
        ⊡
      </button>
    </div>
  );
};
