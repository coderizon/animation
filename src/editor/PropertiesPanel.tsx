import { useProjectStore } from '../store/useProjectStore';
import { ImageContent, ShapeContent, TextContent, WidgetContent, Keyframe } from '../types/project';
import { AnimationPicker } from './components/AnimationPicker';

const AE_ACCENT = 'var(--ae-accent)';
const PANEL_BORDER = 'var(--ae-border)';
const FIELD_BORDER = 'var(--ae-border)';
const FIELD_BG = 'var(--ae-bg-input)';
const PANEL_BG = 'var(--ae-bg-panel-raised)';
const MUTED_TEXT = 'var(--ae-text-secondary)';

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
        gap: 8,
      }}>
        <div style={{
          padding: '10px 14px',
          backgroundColor: PANEL_BG,
          border: `1px solid ${PANEL_BORDER}`,
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          textAlign: 'center',
          color: 'var(--ae-text-primary)',
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
            padding: '10px 16px',
            backgroundColor: 'var(--ae-danger)',
            color: 'var(--ae-gray-900)',
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
        color: MUTED_TEXT,
        textAlign: 'center',
        padding: 20,
        backgroundColor: PANEL_BG,
        border: `1px solid ${PANEL_BORDER}`,
        borderRadius: 12,
      }}>
        <div style={{ fontSize: 14, lineHeight: 1.5 }}>
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
      gap: 8,
    }}>
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
            marginTop: 4,
            accentColor: AE_ACCENT,
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
                  backgroundColor: FIELD_BG,
                  border: `1px solid ${FIELD_BORDER}`,
                  borderRadius: 8,
                  color: 'var(--ae-text-primary)',
                  fontSize: 13,
                  outline: 'none',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = AE_ACCENT; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = FIELD_BORDER; }}
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
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                color: MUTED_TEXT,
                cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={content.typewriter ?? false}
                  onChange={(e) => handleTextUpdate({ typewriter: e.target.checked })}
                />
                Typewriter
              </label>
            </PropertySection>
          </>
        );
      })()}

      {/* Image Properties */}
      {selectedElement.type === 'image' && (() => {
        const content = selectedElement.content as ImageContent;
        const handleImageUpdate = (updates: Partial<ImageContent>) => {
          updateElement(selectedElement.id, {
            content: { ...content, ...updates },
          });
        };
        return (
          <PropertySection title="Bild">
            <div style={{
              width: '100%',
              aspectRatio: '16 / 9',
              backgroundColor: 'var(--ae-bg-panel-muted)',
              border: `1px solid ${PANEL_BORDER}`,
              borderRadius: 8,
              overflow: 'hidden',
            }}>
              <img
                src={content.src}
                alt={content.alt}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            </div>
            <LabeledTextInput
              label="Quelle"
              value={content.src}
              onChange={(val) => handleImageUpdate({ src: val })}
              placeholder="/assets/your-image.png"
            />
            <LabeledTextInput
              label="Alt"
              value={content.alt}
              onChange={(val) => handleImageUpdate({ alt: val })}
              placeholder="Image description"
            />
            <div style={{ fontSize: 11, color: MUTED_TEXT, lineHeight: 1.4 }}>
              Verwende eine Datei unter <code>/public/assets</code> als Pfad wie <code>/assets/name.png</code>
              oder eine vollstaendige URL.
            </div>
          </PropertySection>
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
              padding: '5px 8px',
              backgroundColor: PANEL_BG,
              border: `1px solid ${PANEL_BORDER}`,
              borderRadius: 8,
              fontSize: 13,
              color: 'var(--ae-text-primary)',
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
            <div style={{ fontSize: 12, color: MUTED_TEXT }}>
              Dauer: {(content.durationInFrames / content.fps).toFixed(1)}s
            </div>
          </PropertySection>
        );
      })()}

      {/* Animation */}
      <PropertySection title="Animation">
        <AnimationPicker elementId={selectedElement.id} />
      </PropertySection>

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
            padding: '7px 10px',
            backgroundColor: 'var(--ae-notice)',
            color: 'var(--ae-gray-900)',
            border: 'none',
            borderRadius: 8,
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
                  gap: 6,
                  padding: '4px 6px',
                  backgroundColor: PANEL_BG,
                  border: `1px solid ${PANEL_BORDER}`,
                  borderRadius: 8,
                  fontSize: 11,
                }}
              >
                <span style={{ color: 'var(--ae-notice-strong)', fontWeight: 700 }}>◆</span>
                <span style={{ color: 'var(--ae-text-primary)', fontFamily: 'monospace', minWidth: 55 }}>
                  {kf.time >= 1000 ? `${(kf.time / 1000).toFixed(1)}s` : `${kf.time}ms`}
                </span>
                <span style={{ color: MUTED_TEXT, fontSize: 10 }}>
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
                    color: 'var(--ae-danger)',
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
        borderTop: `1px solid ${PANEL_BORDER}`,
        paddingTop: 12,
        marginTop: 'auto',
      }}>
        <button
          onClick={handleDelete}
          style={{
            width: '100%',
            padding: '10px 16px',
            backgroundColor: 'var(--ae-danger)',
            color: 'var(--ae-gray-900)',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--ae-danger-muted)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--ae-danger)';
          }}
        >
          Element löschen
        </button>
      </div>
    </div>
  );
};

interface LabeledTextInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const LabeledTextInput: React.FC<LabeledTextInputProps> = ({ label, value, onChange, placeholder }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 13, color: MUTED_TEXT }}>{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '6px 10px',
          boxSizing: 'border-box',
          backgroundColor: FIELD_BG,
          border: `1px solid ${FIELD_BORDER}`,
          borderRadius: 8,
          color: 'var(--ae-text-primary)',
          fontSize: 13,
          outline: 'none',
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = AE_ACCENT; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = FIELD_BORDER; }}
      />
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
      gap: 8,
      backgroundColor: PANEL_BG,
      border: `1px solid ${PANEL_BORDER}`,
      borderRadius: 8,
      padding: 10,
    }}>
      <h3 style={{
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--ae-text-primary)',
        letterSpacing: '0.02em',
        marginBottom: 0,
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
      display: 'grid',
      gridTemplateColumns: '1fr',
      gap: 6,
    }}>
      <label style={{ fontSize: 13, color: MUTED_TEXT }}>
        {label}
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: '28px minmax(0, 1fr) auto', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <input
          type="color"
          value={isNone ? '#ffffff' : value}
          onChange={(e) => onChange(e.target.value)}
          disabled={isNone}
          style={{
            width: 28,
            height: 28,
            border: `1px solid ${FIELD_BORDER}`,
            borderRadius: 6,
            backgroundColor: FIELD_BG,
            cursor: isNone ? 'not-allowed' : 'pointer',
            padding: 2,
            opacity: isNone ? 0.4 : 1,
          }}
        />
        <span style={{ fontSize: 12, color: MUTED_TEXT, fontFamily: 'monospace', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {isNone ? 'Keine' : value}
        </span>
        {allowNone && (
          <button
            onClick={() => onChange(isNone ? '#ffffff' : 'transparent')}
            style={{
              padding: '3px 6px',
              backgroundColor: isNone ? AE_ACCENT : 'transparent',
              color: isNone ? 'var(--ae-gray-900)' : MUTED_TEXT,
              border: `1px solid ${FIELD_BORDER}`,
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
      display: 'grid',
      gridTemplateColumns: unit ? '56px minmax(0, 1fr) auto' : '56px minmax(0, 1fr)',
      alignItems: 'center',
      gap: 6,
      minWidth: 0,
    }}>
      <label style={{
        fontSize: 13,
        color: MUTED_TEXT,
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
          width: '100%',
          minWidth: 0,
          padding: '6px 10px',
          boxSizing: 'border-box',
          backgroundColor: FIELD_BG,
          border: `1px solid ${FIELD_BORDER}`,
          borderRadius: 8,
          color: 'var(--ae-text-primary)',
          fontSize: 13,
          outline: 'none',
          transition: 'border-color 0.2s',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = AE_ACCENT;
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = FIELD_BORDER;
        }}
      />
      {unit && (
        <span style={{
          fontSize: 12,
          color: MUTED_TEXT,
          minWidth: 16,
          textAlign: 'right',
        }}>
          {unit}
        </span>
      )}
    </div>
  );
};
