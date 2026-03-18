import { useState } from 'react';

interface ZoomControlsProps {
  onZoomChange: (zoom: number) => void;
  currentZoom: number;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({ onZoomChange, currentZoom }) => {
  const zoomLevels = [0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2];

  const handleZoomIn = () => {
    const currentIndex = zoomLevels.indexOf(currentZoom);
    if (currentIndex < zoomLevels.length - 1) {
      onZoomChange(zoomLevels[currentIndex + 1]);
    }
  };

  const handleZoomOut = () => {
    const currentIndex = zoomLevels.indexOf(currentZoom);
    if (currentIndex > 0) {
      onZoomChange(zoomLevels[currentIndex - 1]);
    }
  };

  const handleFitToScreen = () => {
    onZoomChange(0.45); // Default fit
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 40,
        right: 40,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        backgroundColor: '#1a1a2e',
        border: '1px solid #2a2a3e',
        borderRadius: 8,
        padding: 8,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        zIndex: 100,
      }}
    >
      {/* Zoom In */}
      <button
        onClick={handleZoomIn}
        disabled={currentZoom >= zoomLevels[zoomLevels.length - 1]}
        style={{
          width: 40,
          height: 40,
          backgroundColor: 'transparent',
          color: currentZoom >= zoomLevels[zoomLevels.length - 1] ? '#444' : '#ddd',
          border: 'none',
          borderRadius: 6,
          fontSize: 20,
          cursor: currentZoom >= zoomLevels[zoomLevels.length - 1] ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onMouseEnter={(e) => {
          if (currentZoom < zoomLevels[zoomLevels.length - 1]) {
            e.currentTarget.style.backgroundColor = '#252538';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
        title="Zoom In (Ctrl/Cmd +)"
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
          borderTop: '1px solid #2a2a3e',
          borderBottom: '1px solid #2a2a3e',
          padding: '4px 0',
        }}
      >
        {Math.round(currentZoom * 100)}%
      </div>

      {/* Zoom Out */}
      <button
        onClick={handleZoomOut}
        disabled={currentZoom <= zoomLevels[0]}
        style={{
          width: 40,
          height: 40,
          backgroundColor: 'transparent',
          color: currentZoom <= zoomLevels[0] ? '#444' : '#ddd',
          border: 'none',
          borderRadius: 6,
          fontSize: 20,
          cursor: currentZoom <= zoomLevels[0] ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onMouseEnter={(e) => {
          if (currentZoom > zoomLevels[0]) {
            e.currentTarget.style.backgroundColor = '#252538';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
        title="Zoom Out (Ctrl/Cmd -)"
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
          color: '#ddd',
          border: 'none',
          borderRadius: 6,
          fontSize: 16,
          cursor: 'pointer',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 4,
          borderTop: '1px solid #2a2a3e',
          paddingTop: 8,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#252538';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
        title="Fit to Screen (Ctrl/Cmd 0)"
      >
        ⊡
      </button>
    </div>
  );
};
