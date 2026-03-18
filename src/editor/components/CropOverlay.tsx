import React, { useCallback, useRef } from 'react';
import { CanvasElement } from '../../types/project';
import { useProjectStore } from '../../store/useProjectStore';
import { useViewportStore } from '../../store/useViewportStore';

interface CropOverlayProps {
  element: CanvasElement;
}

type HandlePosition = 'top' | 'right' | 'bottom' | 'left' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

const HANDLE_SIZE = 10;

export const CropOverlay: React.FC<CropOverlayProps> = ({ element }) => {
  const updateElementSilent = useProjectStore((s) => s.updateElementSilent);
  const pushSnapshot = useProjectStore((s) => s.pushSnapshot);
  const project = useProjectStore((s) => s.project);
  const dragRef = useRef<{
    handle: HandlePosition;
    startMouseX: number;
    startMouseY: number;
    startClip: { top: number; right: number; bottom: number; left: number };
    snapshot: typeof project;
  } | null>(null);

  const clip = element.clip || { top: 0, right: 0, bottom: 0, left: 0 };
  const { width, height } = element.size;

  // Convert clip percentages to pixel values within the element
  const cropTop = (clip.top / 100) * height;
  const cropRight = (clip.right / 100) * width;
  const cropBottom = (clip.bottom / 100) * height;
  const cropLeft = (clip.left / 100) * width;

  const visibleW = width - cropLeft - cropRight;
  const visibleH = height - cropTop - cropBottom;

  const handleMouseDown = useCallback((e: React.MouseEvent, handle: HandlePosition) => {
    e.stopPropagation();
    e.preventDefault();

    const snapshot = JSON.parse(JSON.stringify(project));
    dragRef.current = {
      handle,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startClip: { ...clip },
      snapshot,
    };

    const zoom = useViewportStore.getState().zoom;

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const { handle: h, startMouseX, startMouseY, startClip } = dragRef.current;

      const deltaX = (ev.clientX - startMouseX) / zoom;
      const deltaY = (ev.clientY - startMouseY) / zoom;

      // Convert pixel delta to percentage
      const dxPct = (deltaX / width) * 100;
      const dyPct = (deltaY / height) * 100;

      const newClip = { ...startClip };

      // Apply delta based on handle position
      if (h === 'top' || h === 'top-left' || h === 'top-right') {
        newClip.top = Math.max(0, Math.min(100 - newClip.bottom - 5, startClip.top + dyPct));
      }
      if (h === 'bottom' || h === 'bottom-left' || h === 'bottom-right') {
        newClip.bottom = Math.max(0, Math.min(100 - newClip.top - 5, startClip.bottom - dyPct));
      }
      if (h === 'left' || h === 'top-left' || h === 'bottom-left') {
        newClip.left = Math.max(0, Math.min(100 - newClip.right - 5, startClip.left + dxPct));
      }
      if (h === 'right' || h === 'top-right' || h === 'bottom-right') {
        newClip.right = Math.max(0, Math.min(100 - newClip.left - 5, startClip.right - dxPct));
      }

      updateElementSilent(element.id, { clip: newClip });
    };

    const onMouseUp = () => {
      if (dragRef.current) {
        pushSnapshot(dragRef.current.snapshot);
      }
      dragRef.current = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [clip, element.id, width, height, updateElementSilent, pushSnapshot, project]);

  const handleStyle = (pos: HandlePosition): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      width: HANDLE_SIZE,
      height: HANDLE_SIZE,
      backgroundColor: '#FF9800',
      border: '2px solid #fff',
      borderRadius: '50%',
      zIndex: 10,
      pointerEvents: 'auto',
    };

    const halfH = HANDLE_SIZE / 2;

    switch (pos) {
      case 'top-left':
        return { ...base, top: cropTop - halfH, left: cropLeft - halfH, cursor: 'nwse-resize' };
      case 'top-right':
        return { ...base, top: cropTop - halfH, right: cropRight - halfH, cursor: 'nesw-resize' };
      case 'bottom-left':
        return { ...base, bottom: cropBottom - halfH, left: cropLeft - halfH, cursor: 'nesw-resize' };
      case 'bottom-right':
        return { ...base, bottom: cropBottom - halfH, right: cropRight - halfH, cursor: 'nwse-resize' };
      case 'top':
        return { ...base, top: cropTop - halfH, left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' };
      case 'bottom':
        return { ...base, bottom: cropBottom - halfH, left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' };
      case 'left':
        return { ...base, left: cropLeft - halfH, top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' };
      case 'right':
        return { ...base, right: cropRight - halfH, top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' };
    }
  };

  const handles: HandlePosition[] = ['top', 'right', 'bottom', 'left', 'top-left', 'top-right', 'bottom-left', 'bottom-right'];

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: 9999,
    }}>
      {/* Dark overlays on cropped areas */}
      {/* Top */}
      {cropTop > 0 && (
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: cropTop,
          backgroundColor: 'rgba(0,0,0,0.6)', pointerEvents: 'none',
        }} />
      )}
      {/* Bottom */}
      {cropBottom > 0 && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, width: '100%', height: cropBottom,
          backgroundColor: 'rgba(0,0,0,0.6)', pointerEvents: 'none',
        }} />
      )}
      {/* Left */}
      {cropLeft > 0 && (
        <div style={{
          position: 'absolute', top: cropTop, left: 0, width: cropLeft, height: visibleH,
          backgroundColor: 'rgba(0,0,0,0.6)', pointerEvents: 'none',
        }} />
      )}
      {/* Right */}
      {cropRight > 0 && (
        <div style={{
          position: 'absolute', top: cropTop, right: 0, width: cropRight, height: visibleH,
          backgroundColor: 'rgba(0,0,0,0.6)', pointerEvents: 'none',
        }} />
      )}

      {/* Dashed border around visible area */}
      <div style={{
        position: 'absolute',
        top: cropTop,
        left: cropLeft,
        width: visibleW,
        height: visibleH,
        border: '1px dashed #FF9800',
        pointerEvents: 'none',
      }} />

      {/* Handles */}
      {handles.map((pos) => (
        <div
          key={pos}
          style={handleStyle(pos)}
          onMouseDown={(e) => handleMouseDown(e, pos)}
        />
      ))}
    </div>
  );
};
