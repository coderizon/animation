import { useState } from 'react';
import { useDrag } from 'react-dnd';
import { LogoAsset } from '../../types/animation';

// Logo Categories with lobe-icons
interface LogoCategory {
  id: string;
  name: string;
  icon: string;
  logos: LogoAsset[];
}

const categories: LogoCategory[] = [
  {
    id: 'ai-icons',
    name: 'AI Icons',
    icon: 'AI',
    logos: [],
  },
];

// Shape definitions
interface ShapeDef {
  id: string;
  name: string;
  shape: 'rectangle' | 'circle' | 'line' | 'triangle';
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  defaultWidth: number;
  defaultHeight: number;
}

// Filled shapes
const filledShapes: ShapeDef[] = [
  { id: 'rect', name: 'Rectangle', shape: 'rectangle', fill: '#2196F3', defaultWidth: 200, defaultHeight: 120 },
  { id: 'circle', name: 'Circle', shape: 'circle', fill: '#4CAF50', defaultWidth: 120, defaultHeight: 120 },
  { id: 'line', name: 'Line', shape: 'line', fill: '#FF9800', defaultWidth: 200, defaultHeight: 4 },
  { id: 'triangle', name: 'Triangle', shape: 'triangle', fill: '#9C27B0', defaultWidth: 140, defaultHeight: 120 },
];

// Outline-only shapes
const outlineShapes: ShapeDef[] = [
  { id: 'rect-outline', name: 'Rect', shape: 'rectangle', fill: 'transparent', stroke: '#2196F3', strokeWidth: 3, defaultWidth: 200, defaultHeight: 120 },
  { id: 'circle-outline', name: 'Circle', shape: 'circle', fill: 'transparent', stroke: '#4CAF50', strokeWidth: 3, defaultWidth: 120, defaultHeight: 120 },
  { id: 'triangle-outline', name: 'Triangle', shape: 'triangle', fill: 'transparent', stroke: '#9C27B0', strokeWidth: 3, defaultWidth: 140, defaultHeight: 120 },
];

// Shape preview SVG
const ShapePreview: React.FC<{ shape: ShapeDef['shape']; fill: string; stroke?: string; strokeWidth?: number }> = ({ shape, fill, stroke, strokeWidth }) => {
  const isOutline = fill === 'transparent' || fill === 'none';
  const sw = strokeWidth || 2;
  switch (shape) {
    case 'rectangle':
      return (
        <svg width="36" height="36" viewBox="0 0 36 36">
          <rect x="4" y="8" width="28" height="20" rx="2"
            fill={isOutline ? 'none' : fill}
            stroke={stroke || (isOutline ? '#888' : 'none')}
            strokeWidth={isOutline ? sw : 0}
          />
        </svg>
      );
    case 'circle':
      return (
        <svg width="36" height="36" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r={isOutline ? 13 : 14}
            fill={isOutline ? 'none' : fill}
            stroke={stroke || (isOutline ? '#888' : 'none')}
            strokeWidth={isOutline ? sw : 0}
          />
        </svg>
      );
    case 'line':
      return (
        <svg width="36" height="36" viewBox="0 0 36 36">
          <line x1="4" y1="18" x2="32" y2="18" stroke={stroke || fill} strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 'triangle':
      return (
        <svg width="36" height="36" viewBox="0 0 36 36">
          <polygon points="18,4 32,32 4,32"
            fill={isOutline ? 'none' : fill}
            stroke={stroke || (isOutline ? '#888' : 'none')}
            strokeWidth={isOutline ? sw : 0}
          />
        </svg>
      );
  }
};

// Draggable Shape Component
const DraggableShape: React.FC<{ shapeDef: ShapeDef }> = ({ shapeDef }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'ASSET',
    item: {
      type: 'ASSET',
      elementType: 'shape' as const,
      content: {
        type: 'shape',
        shape: shapeDef.shape,
        fill: shapeDef.fill,
        stroke: shapeDef.stroke,
        strokeWidth: shapeDef.strokeWidth,
      },
      defaultWidth: shapeDef.defaultWidth,
      defaultHeight: shapeDef.defaultHeight,
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: 'move',
        padding: 8,
        backgroundColor: '#252538',
        border: '2px solid #2a2a3e',
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        transition: 'all 0.2s',
        userSelect: 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#4a4a6e';
        e.currentTarget.style.backgroundColor = '#2a2a3e';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#2a2a3e';
        e.currentTarget.style.backgroundColor = '#252538';
      }}
    >
      <ShapePreview shape={shapeDef.shape} fill={shapeDef.fill} stroke={shapeDef.stroke} strokeWidth={shapeDef.strokeWidth} />
      <span style={{ fontSize: 10, fontWeight: 500, color: '#ddd', textAlign: 'center' }}>
        {shapeDef.name}
      </span>
    </div>
  );
};

// Draggable Text Component
const DraggableText: React.FC = () => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'ASSET',
    item: {
      type: 'ASSET',
      elementType: 'text' as const,
      content: {
        type: 'text',
        text: 'Text',
        fontSize: 48,
        fontFamily: 'sans-serif',
        color: '#ffffff',
        fontWeight: 600,
      },
      defaultWidth: 200,
      defaultHeight: 60,
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: 'move',
        padding: 8,
        backgroundColor: '#252538',
        border: '2px solid #2a2a3e',
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        transition: 'all 0.2s',
        userSelect: 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#4a4a6e';
        e.currentTarget.style.backgroundColor = '#2a2a3e';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#2a2a3e';
        e.currentTarget.style.backgroundColor = '#252538';
      }}
    >
      <div style={{ fontSize: 20, fontWeight: 700, color: '#ddd', lineHeight: 1 }}>T</div>
      <span style={{ fontSize: 10, fontWeight: 500, color: '#ddd', textAlign: 'center' }}>
        Text
      </span>
    </div>
  );
};

// Draggable Logo Component
const DraggableLogo: React.FC<{ asset: LogoAsset }> = ({ asset }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'ASSET',
    item: {
      type: 'ASSET',
      elementType: 'logo',
      content: {
        type: 'logo',
        src: asset.src,
        alt: asset.name,
      },
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: 'move',
        padding: 10,
        backgroundColor: '#252538',
        border: '2px solid #2a2a3e',
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        transition: 'all 0.2s',
        userSelect: 'none',
        minHeight: 90,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#4a4a6e';
        e.currentTarget.style.backgroundColor = '#2a2a3e';
        e.currentTarget.style.transform = 'scale(1.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#2a2a3e';
        e.currentTarget.style.backgroundColor = '#252538';
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      <img
        src={asset.src}
        alt={asset.name}
        style={{
          width: 48,
          height: 48,
          objectFit: 'contain',
          pointerEvents: 'none',
        }}
      />
      <span
        style={{
          fontSize: 10,
          fontWeight: 500,
          color: '#ddd',
          textAlign: 'center',
          lineHeight: 1.2,
        }}
      >
        {asset.name}
      </span>
    </div>
  );
};

// Folder Component
const Folder: React.FC<{ category: LogoCategory; onClick: () => void }> = ({ category, onClick }) => {
  return (
    <div
      onClick={onClick}
      style={{
        padding: 20,
        backgroundColor: '#252538',
        border: '2px solid #2a2a3e',
        borderRadius: 12,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        cursor: 'pointer',
        transition: 'all 0.2s',
        userSelect: 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#4a4a6e';
        e.currentTarget.style.backgroundColor = '#2a2a3e';
        e.currentTarget.style.transform = 'scale(1.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#2a2a3e';
        e.currentTarget.style.backgroundColor = '#252538';
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      <div style={{ fontSize: 28, fontWeight: 700, color: '#888', letterSpacing: '1px' }}>{category.icon}</div>
      <div style={{
        fontSize: 14,
        fontWeight: 600,
        color: '#fff',
        textAlign: 'center',
      }}>
        {category.name}
      </div>
      <div style={{
        fontSize: 11,
        color: '#888',
      }}>
        {category.logos.length} logos
      </div>
    </div>
  );
};

// AssetLibrary Component
export const AssetLibrary: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<LogoCategory | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
      {/* Primitives Section - Always visible */}
      <div>
        <h3 style={{
          fontSize: 12,
          fontWeight: 600,
          color: '#888',
          marginBottom: 8,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          Filled
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 6,
          marginBottom: 10,
        }}>
          {filledShapes.map((s) => (
            <DraggableShape key={s.id} shapeDef={s} />
          ))}
          <DraggableText />
        </div>

        <h3 style={{
          fontSize: 12,
          fontWeight: 600,
          color: '#888',
          marginBottom: 8,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          Outline
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 6,
        }}>
          {outlineShapes.map((s) => (
            <DraggableShape key={s.id} shapeDef={s} />
          ))}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, backgroundColor: '#2a2a3e' }} />

      {/* Logo Categories */}
      <div>
        <h3
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#888',
            marginBottom: 8,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Assets
        </h3>

        {/* Breadcrumb Navigation */}
        {selectedCategory && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 12,
              fontSize: 12,
              color: '#888',
            }}
          >
            <span
              onClick={() => setSelectedCategory(null)}
              style={{
                cursor: 'pointer',
                color: '#2196F3',
                textDecoration: 'underline',
              }}
            >
              Back
            </span>
            <span>/</span>
            <span style={{ color: '#ddd' }}>{selectedCategory.name}</span>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
          maxHeight: 'calc(100vh - 380px)',
          overflowY: 'auto',
          padding: 4,
        }}
      >
        {!selectedCategory ? (
          categories.map((category) => (
            <Folder
              key={category.id}
              category={category}
              onClick={() => setSelectedCategory(category)}
            />
          ))
        ) : (
          selectedCategory.logos.map((logo) => (
            <DraggableLogo key={logo.id} asset={logo} />
          ))
        )}
      </div>

      {/* Tip */}
      <div
        style={{
          padding: 10,
          backgroundColor: '#252538',
          borderRadius: 6,
          fontSize: 11,
          color: '#888',
          lineHeight: 1.4,
        }}
      >
        <strong>Tip:</strong> Drag shapes, text, or logos onto the canvas
      </div>
    </div>
  );
};
