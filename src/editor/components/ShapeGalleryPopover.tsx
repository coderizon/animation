import { useEffect, useMemo, useRef } from 'react';
import { allShapeDefs, filledShapeDefs, outlineShapeDefs, ShapeInsertDef } from '../insertPresets';

interface ShapeGalleryPopoverProps {
  anchorRef: React.RefObject<HTMLElement | null>;
  isOpen: boolean;
  onClose: () => void;
  onSelectShape: (shape: ShapeInsertDef) => void;
  recentShapeIds: string[];
}

export const ShapeGlyph: React.FC<{ shape: ShapeInsertDef; size?: number }> = ({ shape, size = 28 }) => {
  const stroke = shape.stroke || (shape.fill === 'transparent' ? '#667085' : 'none');
  const strokeWidth = shape.fill === 'transparent' ? (shape.strokeWidth || 2) : 0;

  switch (shape.shape) {
    case 'rectangle':
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
          <rect x="4" y="7" width="20" height="14" rx="3" fill={shape.fill === 'transparent' ? 'none' : shape.fill} stroke={stroke} strokeWidth={strokeWidth} />
        </svg>
      );
    case 'circle':
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
          <circle cx="14" cy="14" r="9" fill={shape.fill === 'transparent' ? 'none' : shape.fill} stroke={stroke} strokeWidth={strokeWidth} />
        </svg>
      );
    case 'triangle':
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
          <polygon points="14,4 24,23 4,23" fill={shape.fill === 'transparent' ? 'none' : shape.fill} stroke={stroke} strokeWidth={strokeWidth} />
        </svg>
      );
    case 'line':
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
          <line x1="5" y1="20" x2="23" y2="8" stroke={shape.stroke || shape.fill} strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
};

export const ShapeGalleryPopover: React.FC<ShapeGalleryPopoverProps> = ({
  anchorRef,
  isOpen,
  onClose,
  onSelectShape,
  recentShapeIds,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  const recentShapes = useMemo(
    () => recentShapeIds
      .map((shapeId) => allShapeDefs.find((shape) => shape.id === shapeId))
      .filter((shape): shape is ShapeInsertDef => Boolean(shape)),
    [recentShapeIds],
  );

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const anchorNode = anchorRef.current;

      if (popoverRef.current?.contains(target)) return;
      if (anchorNode?.contains(target)) return;
      onClose();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [anchorRef, isOpen, onClose]);

  if (!isOpen || !anchorRef.current) return null;

  const rect = anchorRef.current.getBoundingClientRect();
  const width = 440;
  const left = Math.min(Math.max(rect.left, 12), window.innerWidth - width - 12);
  const top = rect.bottom + 10;

  const renderSection = (title: string, shapes: ShapeInsertDef[]) => {
    if (shapes.length === 0) return null;

    return (
      <div key={title} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#475467', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {title}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 8 }}>
          {shapes.map((shape) => (
            <button
              key={shape.id}
              onClick={() => onSelectShape(shape)}
              style={{
                border: '1px solid #e4e7ec',
                backgroundColor: '#ffffff',
                borderRadius: 10,
                padding: '10px 6px 8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                color: '#344054',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#98a2b3';
                e.currentTarget.style.backgroundColor = '#f8fafc';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e4e7ec';
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <ShapeGlyph shape={shape} />
              <span style={{ fontSize: 10, fontWeight: 600, lineHeight: 1.2 }}>{shape.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={popoverRef}
      style={{
        position: 'fixed',
        top,
        left,
        width,
        maxHeight: '70vh',
        overflowY: 'auto',
        backgroundColor: '#ffffff',
        border: '1px solid #d0d5dd',
        borderRadius: 16,
        boxShadow: '0 24px 60px rgba(16, 24, 40, 0.18)',
        padding: 18,
        zIndex: 1200,
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#101828' }}>Formen</div>
          <div style={{ fontSize: 12, color: '#667085' }}>Zuletzt verwendet zuerst, dann die Standardgruppen.</div>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 30,
            height: 30,
            borderRadius: 999,
            border: '1px solid #e4e7ec',
            backgroundColor: '#ffffff',
            color: '#475467',
            fontSize: 16,
            cursor: 'pointer',
          }}
        >
          ×
        </button>
      </div>

      {renderSection('Zuletzt verwendet', recentShapes)}
      {renderSection('Gefüllt', filledShapeDefs)}
      {renderSection('Kontur', outlineShapeDefs)}
    </div>
  );
};
