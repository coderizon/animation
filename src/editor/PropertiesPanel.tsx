import { useProjectStore } from '../store/useProjectStore';
import { ShapeContent, TextContent, WidgetContent, Keyframe } from '../types/project';
import { AnimationPicker } from './components/AnimationPicker';

export const PropertiesPanel: React.FC = () => {
  const selectedElement = useProjectStore((state) => state.getSelectedElement());
  const selectedElementIds = useProjectStore((state) => state.selectedElementIds);
  const updateElement = useProjectStore((state) => state.updateElement);
  const deleteElement = useProjectStore((state) => state.deleteElement);
  const currentTime = useProjectStore((state) => state.currentTime);
  const addKeyframe = useProjectStore((state) => state.addKeyframe);
  const removeKeyframe = useProjectStore((state) => state.removeKeyframe);

  // Multi-select: show count + delete button
  if (selectedElementIds.length > 1) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        padding: 10,
      }}>
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#2196F3',
          borderRadius: 6,
          fontSize: 14,
          fontWeight: 600,
          textAlign: 'center',
          color: '#fff',
        }}>
          {selectedElementIds.length} Elemente ausgewählt
        </div>
        <button
          onClick={() => {
            if (confirm(`${selectedElementIds.length} Elemente wirklich löschen?`)) {
              selectedElementIds.forEach((id) => deleteElement(id));
            }
          }}
          style={{
            width: '100%',
            padding: '12px 20px',
            backgroundColor: '#d32f2f',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Alle löschen
        </button>
      </div>
    );
  }

  if (!selectedElement) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: '#999',
        textAlign: 'center',
        padding: 20,
      }}>
        <div style={{ fontSize: 14 }}>
          Wähle ein Element aus<br />um Eigenschaften zu bearbeiten
        </div>
      </div>
    );
  }

  const handlePositionChange = (axis: 'x' | 'y', value: number) => {
    updateElement(selectedElement.id, {
      position: {
        ...selectedElement.position,
        [axis]: value,
      },
    });
  };

  const handleSizeChange = (dimension: 'width' | 'height', value: number) => {
    updateElement(selectedElement.id, {
      size: {
        ...selectedElement.size,
        [dimension]: Math.max(10, value), // Min size 10px
      },
    });
  };

  const handleRotationChange = (value: number) => {
    updateElement(selectedElement.id, {
      rotation: value,
    });
  };

  const handleDelete = () => {
    if (confirm('Element wirklich löschen?')) {
      deleteElement(selectedElement.id);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
    }}>
      {/* Element Type Badge */}
      <div style={{
        padding: '8px 12px',
        backgroundColor: '#2196F3',
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 600,
        textTransform: 'uppercase',
        textAlign: 'center',
        color: '#fff',
      }}>
        {selectedElement.type.charAt(0).toUpperCase() + selectedElement.type.slice(1)}
      </div>

      {/* Position */}
      <PropertySection title="Position">
        <PropertyInput
          label="X"
          value={Math.round(selectedElement.position.x)}
          onChange={(val) => handlePositionChange('x', val)}
          unit="px"
        />
        <PropertyInput
          label="Y"
          value={Math.round(selectedElement.position.y)}
          onChange={(val) => handlePositionChange('y', val)}
          unit="px"
        />
      </PropertySection>

      {/* Size */}
      <PropertySection title="Größe">
        <PropertyInput
          label="Breite"
          value={Math.round(selectedElement.size.width)}
          onChange={(val) => handleSizeChange('width', val)}
          unit="px"
          min={10}
        />
        <PropertyInput
          label="Höhe"
          value={Math.round(selectedElement.size.height)}
          onChange={(val) => handleSizeChange('height', val)}
          unit="px"
          min={10}
        />
      </PropertySection>

      {/* Rotation */}
      <PropertySection title="Rotation">
        <PropertyInput
          label="Winkel"
          value={selectedElement.rotation}
          onChange={handleRotationChange}
          unit="°"
          min={-180}
          max={180}
        />
        <input
          type="range"
          min="-180"
          max="180"
          value={selectedElement.rotation}
          onChange={(e) => handleRotationChange(Number(e.target.value))}
          style={{
            width: '100%',
            marginTop: 8,
            accentColor: '#2196F3',
          }}
        />
      </PropertySection>

      {/* Layer (z-index) */}
      <PropertySection title="Ebene">
        <PropertyInput
          label="Z-Index"
          value={selectedElement.zIndex}
          onChange={(val) => updateElement(selectedElement.id, { zIndex: val })}
          min={0}
        />
      </PropertySection>

      {/* Shape Properties */}
      {selectedElement.type === 'shape' && (() => {
        const content = selectedElement.content as ShapeContent;
        const handleShapeUpdate = (updates: Partial<ShapeContent>) => {
          updateElement(selectedElement.id, {
            content: { ...content, ...updates },
          });
        };
        return (
          <PropertySection title="Farbe">
            <ColorInput
              label="Füllung"
              value={content.fill}
              onChange={(val) => handleShapeUpdate({ fill: val })}
              allowNone
            />
            <ColorInput
              label="Kontur"
              value={content.stroke || 'transparent'}
              onChange={(val) => handleShapeUpdate({ stroke: val === 'transparent' ? undefined : val })}
              allowNone
            />
            {content.stroke && (
              <PropertyInput
                label="Stärke"
                value={content.strokeWidth || 1}
                onChange={(val) => handleShapeUpdate({ strokeWidth: Math.max(1, val) })}
                unit="px"
                min={1}
                max={50}
              />
            )}
          </PropertySection>
        );
      })()}

      {/* Text Properties */}
      {selectedElement.type === 'text' && (() => {
        const content = selectedElement.content as TextContent;
        const handleTextUpdate = (updates: Partial<TextContent>) => {
          updateElement(selectedElement.id, {
            content: { ...content, ...updates },
          });
        };
        return (
          <>
            <PropertySection title="Text">
              <input
                type="text"
                value={content.text}
                onChange={(e) => handleTextUpdate({ text: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: '#f0f0f4',
                  border: '1px solid #e0e0e8',
                  borderRadius: 6,
                  color: '#1a1a2e',
                  fontSize: 13,
                  outline: 'none',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#2196F3'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#e0e0e8'; }}
              />
              <ColorInput
                label="Farbe"
                value={content.color}
                onChange={(val) => handleTextUpdate({ color: val })}
              />
              <PropertyInput
                label="Größe"
                value={content.fontSize}
                onChange={(val) => handleTextUpdate({ fontSize: Math.max(8, val) })}
                unit="px"
                min={8}
              />
            </PropertySection>
          </>
        );
      })()}

      {/* Widget Properties */}
      {selectedElement.type === 'widget' && (() => {
        const content = selectedElement.content as WidgetContent;
        const handleWidgetUpdate = (updates: Partial<WidgetContent>) => {
          updateElement(selectedElement.id, {
            content: { ...content, ...updates },
          });
        };
        return (
          <PropertySection title="Widget">
            <div style={{
              padding: '6px 10px',
              backgroundColor: '#f0f0f4',
              borderRadius: 6,
              fontSize: 13,
              color: '#444',
              fontWeight: 500,
            }}>
              {content.widgetName}
            </div>
            <PropertyInput
              label="FPS"
              value={content.fps}
              onChange={(val) => handleWidgetUpdate({ fps: Math.max(1, Math.min(60, val)) })}
              min={1}
              max={60}
            />
            <PropertyInput
              label="Frames"
              value={content.durationInFrames}
              onChange={(val) => handleWidgetUpdate({ durationInFrames: Math.max(1, val) })}
              min={1}
            />
            <div style={{ fontSize: 12, color: '#888' }}>
              Dauer: {(content.durationInFrames / content.fps).toFixed(1)}s
            </div>
          </PropertySection>
        );
      })()}

      {/* Animation (not for widgets) */}
      {selectedElement.type !== 'widget' && (
        <PropertySection title="Animation">
          <AnimationPicker elementId={selectedElement.id} />
        </PropertySection>
      )}

      {/* Keyframes */}
      <PropertySection title="Keyframes">
        <button
          onClick={() => {
            const kf: Keyframe = {
              time: Math.round(currentTime / 50) * 50,
              x: selectedElement.position.x,
              y: selectedElement.position.y,
              width: selectedElement.size.width,
              height: selectedElement.size.height,
              rotation: selectedElement.rotation,
            };
            if (selectedElement.type === 'shape') {
              const c = selectedElement.content as ShapeContent;
              kf.fill = c.fill;
              kf.stroke = c.stroke;
              kf.strokeWidth = c.strokeWidth;
            } else if (selectedElement.type === 'text') {
              const c = selectedElement.content as TextContent;
              kf.color = c.color;
              kf.fontSize = c.fontSize;
            }
            addKeyframe(selectedElement.id, kf);
          }}
          style={{
            width: '100%',
            padding: '8px 12px',
            backgroundColor: '#FFC107',
            color: '#000',
            border: 'none',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          ◆ Keyframe bei {Math.round(currentTime)}ms
        </button>
        {selectedElement.keyframes && selectedElement.keyframes.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {selectedElement.keyframes.map((kf) => (
              <div
                key={kf.time}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '4px 8px',
                  backgroundColor: '#f0f0f4',
                  borderRadius: 4,
                  fontSize: 11,
                }}
              >
                <span style={{ color: '#FFC107', fontWeight: 700 }}>◆</span>
                <span style={{ color: '#666', fontFamily: 'monospace', minWidth: 55 }}>
                  {kf.time >= 1000 ? `${(kf.time / 1000).toFixed(1)}s` : `${kf.time}ms`}
                </span>
                <span style={{ color: '#888', fontSize: 10 }}>
                  ({Math.round(kf.x)}, {Math.round(kf.y)})
                  {kf.width !== undefined && ` ${Math.round(kf.width)}×${Math.round(kf.height ?? 0)}`}
                  {kf.fill !== undefined && ` ${kf.fill}`}
                </span>
                <button
                  onClick={() => removeKeyframe(selectedElement.id, kf.time)}
                  style={{
                    marginLeft: 'auto',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: '#d32f2f',
                    cursor: 'pointer',
                    fontSize: 14,
                    padding: '0 4px',
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </PropertySection>

      {/* Actions */}
      <div style={{
        borderTop: '1px solid #e0e0e8',
        paddingTop: 20,
        marginTop: 'auto',
      }}>
        <button
          onClick={handleDelete}
          style={{
            width: '100%',
            padding: '12px 20px',
            backgroundColor: '#d32f2f',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#c62828';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#d32f2f';
          }}
        >
          Element löschen
        </button>
      </div>
    </div>
  );
};

// Helper Components
interface PropertySectionProps {
  title: string;
  children: React.ReactNode;
}

const PropertySection: React.FC<PropertySectionProps> = ({ title, children }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      <h3 style={{
        fontSize: 13,
        fontWeight: 600,
        color: '#666',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: 5,
      }}>
        {title}
      </h3>
      {children}
    </div>
  );
};

// Color input with optional "none" toggle
interface ColorInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  allowNone?: boolean;
}

const ColorInput: React.FC<ColorInputProps> = ({ label, value, onChange, allowNone }) => {
  const isNone = !value || value === 'transparent' || value === 'none';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    }}>
      <label style={{ fontSize: 13, color: '#444', minWidth: 60 }}>
        {label}
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
        <input
          type="color"
          value={isNone ? '#ffffff' : value}
          onChange={(e) => onChange(e.target.value)}
          disabled={isNone}
          style={{
            width: 32,
            height: 32,
            border: '2px solid #e0e0e8',
            borderRadius: 6,
            backgroundColor: '#f0f0f4',
            cursor: isNone ? 'not-allowed' : 'pointer',
            padding: 2,
            opacity: isNone ? 0.4 : 1,
          }}
        />
        <span style={{ fontSize: 12, color: '#888', fontFamily: 'monospace', flex: 1 }}>
          {isNone ? 'Keine' : value}
        </span>
        {allowNone && (
          <button
            onClick={() => onChange(isNone ? '#ffffff' : 'transparent')}
            style={{
              padding: '4px 8px',
              backgroundColor: isNone ? '#2196F3' : 'transparent',
              color: isNone ? '#fff' : '#888',
              border: '1px solid #e0e0e8',
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {isNone ? 'AN' : 'AUS'}
          </button>
        )}
      </div>
    </div>
  );
};

interface PropertyInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  min?: number;
  max?: number;
}

const PropertyInput: React.FC<PropertyInputProps> = ({
  label,
  value,
  onChange,
  unit = '',
  min,
  max,
}) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    }}>
      <label style={{
        fontSize: 13,
        color: '#444',
        minWidth: 60,
      }}>
        {label}
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        style={{
          flex: 1,
          padding: '8px 12px',
          backgroundColor: '#f0f0f4',
          border: '1px solid #e0e0e8',
          borderRadius: 6,
          color: '#1a1a2e',
          fontSize: 13,
          outline: 'none',
          transition: 'border-color 0.2s',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = '#2196F3';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = '#e0e0e8';
        }}
      />
      {unit && (
        <span style={{
          fontSize: 12,
          color: '#888',
          minWidth: 25,
        }}>
          {unit}
        </span>
      )}
    </div>
  );
};
