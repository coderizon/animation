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
        bottom: 20,
        right: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        backgroundColor: '#ffffff',
        border: '1px solid #e0e0e8',
        borderRadius: 8,
        padding: 8,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        zIndex: 100,
      }}
    >
      {/* Zoom In */}
      <button
        onClick={handleZoomIn}
        disabled={zoom >= MAX_ZOOM}
        style={{
          width: 40,
          height: 40,
          backgroundColor: 'transparent',
          color: '#444',
          border: 'none',
          borderRadius: 6,
          fontSize: 20,
          cursor: zoom >= MAX_ZOOM ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onMouseEnter={(e) => {
          if (zoom < MAX_ZOOM) e.currentTarget.style.backgroundColor = '#f0f0f4';
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
          width: 40,
          height: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 600,
          color: '#888',
          borderTop: '1px solid #e0e0e8',
          borderBottom: '1px solid #e0e0e8',
          padding: '4px 0',
        }}
      >
        {Math.round(zoom * 100)}%
      </div>

      {/* Zoom Out */}
      <button
        onClick={handleZoomOut}
        disabled={zoom <= MIN_ZOOM}
        style={{
          width: 40,
          height: 40,
          backgroundColor: 'transparent',
          color: '#444',
          border: 'none',
          borderRadius: 6,
          fontSize: 20,
          cursor: zoom <= MIN_ZOOM ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onMouseEnter={(e) => {
          if (zoom > MIN_ZOOM) e.currentTarget.style.backgroundColor = '#f0f0f4';
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
          width: 40,
          height: 40,
          backgroundColor: 'transparent',
          color: '#444',
          border: 'none',
          borderRadius: 6,
          fontSize: 16,
          cursor: 'pointer',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 4,
          borderTop: '1px solid #e0e0e8',
          paddingTop: 8,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#f0f0f4';
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
