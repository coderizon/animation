import { useState } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { ImageContent, ShapeContent, TextContent, WidgetContent, Keyframe, CameraKeyframe, Effect, EffectType, EFFECT_DEFINITIONS } from '../types/project';
import { AnimationPicker } from './components/AnimationPicker';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCamera } from '@fortawesome/free-solid-svg-icons';

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
  const updateElementSilent = useProjectStore((state) => state.updateElementSilent);
  const deleteElement = useProjectStore((state) => state.deleteElement);
  const currentTime = useProjectStore((state) => state.currentTime);
  const addKeyframe = useProjectStore((state) => state.addKeyframe);
  const removeKeyframe = useProjectStore((state) => state.removeKeyframe);
  const project = useProjectStore((state) => state.project);
  const addCameraKeyframe = useProjectStore((state) => state.addCameraKeyframe);
  const removeCameraKeyframe = useProjectStore((state) => state.removeCameraKeyframe);
  const addEffect = useProjectStore((state) => state.addEffect);
  const removeEffect = useProjectStore((state) => state.removeEffect);
  const updateEffect = useProjectStore((state) => state.updateEffect);

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
    const cameraKfs = project.cameraKeyframes || [];
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: MUTED_TEXT,
          textAlign: 'center',
          padding: 16,
          backgroundColor: PANEL_BG,
          border: `1px solid ${PANEL_BORDER}`,
          borderRadius: 12,
        }}>
          </div>

        {/* Camera Keyframes Section */}
        <PropertySection title="Kamera-Keyframes">
          <button
            onClick={() => {
              const snappedTime = Math.round(currentTime / 50) * 50;
              addCameraKeyframe({
                time: snappedTime,
                x: project.canvas.width / 2,
                y: project.canvas.height / 2,
                zoom: 1.0,
              });
            }}
            style={{
              width: '100%',
              padding: '7px 10px',
              backgroundColor: '#00bcd4',
              color: '#000',
              border: 'none',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <FontAwesomeIcon icon={faCamera} style={{ marginRight: 6 }} />Kamera-KF bei {Math.round(currentTime)}ms
          </button>
          {cameraKfs.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {cameraKfs.map((kf) => (
                <CameraKeyframeRow
                  key={kf.time}
                  kf={kf}
                  canvasWidth={project.canvas.width}
                  canvasHeight={project.canvas.height}
                  onUpdate={(updates) => {
                    addCameraKeyframe({ ...kf, ...updates });
                  }}
                  onRemove={() => removeCameraKeyframe(kf.time)}
                />
              ))}
            </div>
          )}
        </PropertySection>
      </div>
    );
  }

  // Auto-keyframe: when element has keyframes, property changes create a KF at current time
  const hasKeyframes = selectedElement.keyframes && selectedElement.keyframes.length > 0;

  const maybeAutoKeyframe = (overrides: Partial<{
    x: number; y: number; width: number; height: number; rotation: number;
    fill: string; stroke: string; strokeWidth: number; borderRadius: number;
    color: string; fontSize: number;
  }>) => {
    if (!hasKeyframes) return;
    const snappedTime = Math.round(currentTime / 50) * 50;
    const kf: Keyframe = {
      time: snappedTime,
      x: overrides.x ?? selectedElement.position.x,
      y: overrides.y ?? selectedElement.position.y,
      width: overrides.width ?? selectedElement.size.width,
      height: overrides.height ?? selectedElement.size.height,
      rotation: overrides.rotation ?? selectedElement.rotation,
    };
    if (selectedElement.type === 'shape') {
      const c = selectedElement.content as ShapeContent;
      kf.fill = overrides.fill ?? c.fill;
      kf.stroke = overrides.stroke ?? c.stroke;
      kf.strokeWidth = overrides.strokeWidth ?? c.strokeWidth;
      kf.borderRadius = overrides.borderRadius ?? c.borderRadius;
    } else if (selectedElement.type === 'text') {
      const c = selectedElement.content as TextContent;
      kf.color = overrides.color ?? c.color;
      kf.fontSize = overrides.fontSize ?? c.fontSize;
    }
    addKeyframe(selectedElement.id, kf);
  };

  const handlePositionChange = (axis: 'x' | 'y', value: number) => {
    const update = hasKeyframes ? updateElementSilent : updateElement;
    update(selectedElement.id, {
      position: {
        ...selectedElement.position,
        [axis]: value,
      },
    });
    maybeAutoKeyframe({ [axis]: value });
  };

  const handleSizeChange = (dimension: 'width' | 'height', value: number) => {
    const clamped = Math.max(10, value);
    const update = hasKeyframes ? updateElementSilent : updateElement;
    update(selectedElement.id, {
      size: {
        ...selectedElement.size,
        [dimension]: clamped,
      },
    });
    maybeAutoKeyframe({ [dimension]: clamped });
  };

  const handleRotationChange = (value: number) => {
    const update = hasKeyframes ? updateElementSilent : updateElement;
    update(selectedElement.id, {
      rotation: value,
    });
    maybeAutoKeyframe({ rotation: value });
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
      {/* Animation */}
      <PropertySection title="Animation">
        <AnimationPicker elementId={selectedElement.id} />
      </PropertySection>

      {/* Effects */}
      <PropertySection title="Effekte">
        {(selectedElement.effects || []).map((effect, index) => (
          <EffectSlot
            key={`${effect.type}-${index}`}
            effect={effect}
            onUpdate={(updated) => updateEffect(selectedElement.id, index, updated)}
            onRemove={() => removeEffect(selectedElement.id, index)}
          />
        ))}
        <EffectAddButton
          existingTypes={(selectedElement.effects || []).map(e => e.type)}
          onAdd={(type) => addEffect(selectedElement.id, {
            type,
            intensity: 1.0,
            speed: 1.0,
            enabled: true,
          })}
        />
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
              kf.borderRadius = c.borderRadius;
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

      {/* Widget Properties */}
      {selectedElement.type === 'widget' && (() => {
        const content = selectedElement.content as WidgetContent;
        const handleWidgetUpdate = (updates: Partial<WidgetContent>) => {
          updateElement(selectedElement.id, {
            content: { ...content, ...updates },
          });
        };
        const handlePropsUpdate = (propUpdates: Record<string, unknown>) => {
          handleWidgetUpdate({ props: { ...content.props, ...propUpdates } });
        };
        return (
          <>
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
          </PropertySection>
          {content.widgetName === 'logoCarousel' && (
            <LogoCarouselSettings
              props={content.props || {}}
              onUpdate={handlePropsUpdate}
            />
          )}
          {content.widgetName === 'logoOrbit' && (
            <LogoOrbitSettings
              props={content.props || {}}
              onUpdate={handlePropsUpdate}
            />
          )}
          {content.widgetName === 'logoGridReveal' && (
            <LogoGridRevealSettings
              props={content.props || {}}
              onUpdate={handlePropsUpdate}
            />
          )}
          {content.widgetName === 'logoMorphChain' && (
            <LogoMorphChainSettings
              props={content.props || {}}
              onUpdate={handlePropsUpdate}
            />
          )}
          </>
        );
      })()}

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
          const update = hasKeyframes ? updateElementSilent : updateElement;
          update(selectedElement.id, {
            content: { ...content, ...updates },
          });
          maybeAutoKeyframe(updates as any);
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
            {content.shape === 'rectangle' && (
              <PropertyInput
                label="Eckenradius"
                value={content.borderRadius || 0}
                onChange={(val) => handleShapeUpdate({ borderRadius: Math.max(0, val) })}
                unit="px"
                min={0}
                max={Math.min(selectedElement.size.width, selectedElement.size.height) / 2}
              />
            )}
          </PropertySection>
        );
      })()}

      {/* Text Properties */}
      {selectedElement.type === 'text' && (() => {
        const content = selectedElement.content as TextContent;
        const handleTextUpdate = (updates: Partial<TextContent>) => {
          const update = hasKeyframes ? updateElementSilent : updateElement;
          update(selectedElement.id, {
            content: { ...content, ...updates },
          });
          maybeAutoKeyframe(updates as any);
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
          </PropertySection>
        );
      })()}

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

// Camera Keyframe Row
interface CameraKeyframeRowProps {
  kf: CameraKeyframe;
  canvasWidth: number;
  canvasHeight: number;
  onUpdate: (updates: Partial<CameraKeyframe>) => void;
  onRemove: () => void;
}

const CameraKeyframeRow: React.FC<CameraKeyframeRowProps> = ({ kf, canvasWidth, canvasHeight, onUpdate, onRemove }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      padding: '6px 8px',
      backgroundColor: PANEL_BG,
      border: `1px solid ${PANEL_BORDER}`,
      borderRadius: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: '#00bcd4', fontWeight: 700, fontSize: 12 }}>◆</span>
        <span style={{ color: 'var(--ae-text-primary)', fontFamily: 'monospace', fontSize: 11, flex: 1 }}>
          {kf.time >= 1000 ? `${(kf.time / 1000).toFixed(1)}s` : `${kf.time}ms`}
        </span>
        <button
          onClick={onRemove}
          style={{
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
      <div style={{ display: 'grid', gridTemplateColumns: '30px 1fr 30px', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 11, color: MUTED_TEXT }}>X</span>
        <input
          type="number"
          value={Math.round(kf.x)}
          onChange={(e) => onUpdate({ x: Number(e.target.value) })}
          min={0}
          max={canvasWidth}
          style={{
            width: '100%',
            padding: '4px 6px',
            boxSizing: 'border-box',
            backgroundColor: FIELD_BG,
            border: `1px solid ${FIELD_BORDER}`,
            borderRadius: 4,
            color: 'var(--ae-text-primary)',
            fontSize: 11,
            outline: 'none',
          }}
        />
        <span style={{ fontSize: 10, color: MUTED_TEXT }}>px</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '30px 1fr 30px', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 11, color: MUTED_TEXT }}>Y</span>
        <input
          type="number"
          value={Math.round(kf.y)}
          onChange={(e) => onUpdate({ y: Number(e.target.value) })}
          min={0}
          max={canvasHeight}
          style={{
            width: '100%',
            padding: '4px 6px',
            boxSizing: 'border-box',
            backgroundColor: FIELD_BG,
            border: `1px solid ${FIELD_BORDER}`,
            borderRadius: 4,
            color: 'var(--ae-text-primary)',
            fontSize: 11,
            outline: 'none',
          }}
        />
        <span style={{ fontSize: 10, color: MUTED_TEXT }}>px</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '30px 1fr 30px', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 11, color: MUTED_TEXT }}>Zoom</span>
        <input
          type="number"
          value={kf.zoom}
          onChange={(e) => onUpdate({ zoom: Math.max(0.1, Number(e.target.value)) })}
          min={0.1}
          max={10}
          step={0.1}
          style={{
            width: '100%',
            padding: '4px 6px',
            boxSizing: 'border-box',
            backgroundColor: FIELD_BG,
            border: `1px solid ${FIELD_BORDER}`,
            borderRadius: 4,
            color: 'var(--ae-text-primary)',
            fontSize: 11,
            outline: 'none',
          }}
        />
        <span style={{ fontSize: 10, color: MUTED_TEXT }}>×</span>
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

// Effect Slot
interface EffectSlotProps {
  effect: Effect;
  onUpdate: (effect: Effect) => void;
  onRemove: () => void;
}

const EffectSlot: React.FC<EffectSlotProps> = ({ effect, onUpdate, onRemove }) => {
  const def = EFFECT_DEFINITIONS[effect.type];
  return (
    <div style={{
      border: `1px solid ${effect.enabled ? 'var(--ae-accent)' : 'var(--ae-border)'}`,
      borderRadius: 6,
      padding: 8,
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      opacity: effect.enabled ? 1 : 0.5,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 13 }}><FontAwesomeIcon icon={def.icon} /></span>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ae-text-primary)', flex: 1 }}>
          {def.displayName}
        </span>
        <input
          type="checkbox"
          checked={effect.enabled}
          onChange={(e) => onUpdate({ ...effect, enabled: e.target.checked })}
          style={{ cursor: 'pointer' }}
        />
        <button
          onClick={onRemove}
          style={{
            border: 'none',
            backgroundColor: 'transparent',
            color: 'var(--ae-danger)',
            cursor: 'pointer',
            fontSize: 14,
            padding: '0 2px',
            lineHeight: 1,
          }}
        >
          x
        </button>
      </div>
      <div>
        <label style={{ fontSize: 11, color: MUTED_TEXT }}>
          Intensität: {effect.intensity.toFixed(1)}
        </label>
        <input
          type="range" min="0.1" max="2.0" step="0.1"
          value={effect.intensity}
          onChange={(e) => onUpdate({ ...effect, intensity: Number(e.target.value) })}
          style={{ width: '100%', accentColor: AE_ACCENT }}
        />
      </div>
      <div>
        <label style={{ fontSize: 11, color: MUTED_TEXT }}>
          Geschwindigkeit: {effect.speed.toFixed(1)}x
        </label>
        <input
          type="range" min="0.5" max="3.0" step="0.1"
          value={effect.speed}
          onChange={(e) => onUpdate({ ...effect, speed: Number(e.target.value) })}
          style={{ width: '100%', accentColor: AE_ACCENT }}
        />
      </div>
      {(effect.type === 'glow' || effect.type === 'neonFlicker' || effect.type === 'hologram' || effect.type === 'electrified') && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 11, color: MUTED_TEXT }}>Farbe</label>
          <input
            type="color"
            value={effect.color || (effect.type === 'neonFlicker' ? '#ff00ff' : effect.type === 'hologram' ? '#00ffff' : effect.type === 'electrified' ? '#4dc9f6' : '#5681ff')}
            onChange={(e) => onUpdate({ ...effect, color: e.target.value })}
            style={{
              width: 28,
              height: 28,
              border: `1px solid ${FIELD_BORDER}`,
              borderRadius: 6,
              backgroundColor: FIELD_BG,
              cursor: 'pointer',
              padding: 2,
            }}
          />
          <span style={{ fontSize: 11, color: MUTED_TEXT, fontFamily: 'monospace' }}>
            {effect.color || (effect.type === 'neonFlicker' ? '#ff00ff' : effect.type === 'hologram' ? '#00ffff' : effect.type === 'electrified' ? '#4dc9f6' : '#5681ff')}
          </span>
        </div>
      )}
    </div>
  );
};

// Effect Add Button
interface EffectAddButtonProps {
  existingTypes: EffectType[];
  onAdd: (type: EffectType) => void;
}

const EffectAddButton: React.FC<EffectAddButtonProps> = ({ existingTypes, onAdd }) => {
  const [showPicker, setShowPicker] = useState(false);
  const allTypes: EffectType[] = [
    'float', 'pulse', 'wobble', 'spin', 'bounce', 'shake', 'heartbeat',
    'glow', 'neonFlicker', 'shine', 'rainbow', 'blink',
    'tilt3d', 'glitch',
    'ripple', 'heatShimmer', 'emboss', 'pixelate', 'chromaSplit', 'morphBlur',
    'hologram', 'electrified',
  ];
  const available = allTypes.filter(t => !existingTypes.includes(t));

  if (available.length === 0) return null;

  return (
    <div>
      <button
        onClick={() => setShowPicker(!showPicker)}
        style={{
          width: '100%',
          padding: '7px 10px',
          backgroundColor: FIELD_BG,
          color: 'var(--ae-accent)',
          border: '1px dashed var(--ae-accent)',
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        + Effekt hinzufügen
      </button>
      {showPicker && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, marginTop: 6 }}>
          {available.map(type => {
            const def = EFFECT_DEFINITIONS[type];
            return (
              <button
                key={type}
                onClick={() => { onAdd(type); setShowPicker(false); }}
                style={{
                  padding: '8px 4px',
                  backgroundColor: FIELD_BG,
                  border: `1px solid ${PANEL_BORDER}`,
                  borderRadius: 5,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  minHeight: 48,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--ae-accent)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = PANEL_BORDER; }}
              >
                <span style={{ fontSize: 14 }}><FontAwesomeIcon icon={def.icon} /></span>
                <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--ae-text-primary)' }}>
                  {def.displayName}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// === Shared Logo Picker ===

const availableLogos = Object.entries(
  import.meta.glob('/public/assets/*.svg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
).map(([path, url]) => ({
  name: path.split('/').pop()!.replace('.svg', '').replace(/-color$/, '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
  src: url,
})).sort((a, b) => a.name.localeCompare(b.name));

interface WidgetSettingsProps {
  props: Record<string, unknown>;
  onUpdate: (updates: Record<string, unknown>) => void;
}

// Reusable logo list with add/remove/reorder
const LogoListEditor: React.FC<{
  logos: string[];
  onChange: (logos: string[]) => void;
  allowDuplicates?: boolean;
}> = ({ logos, onChange, allowDuplicates = true }) => {
  const [showPicker, setShowPicker] = useState(false);

  const addLogo = (src: string) => {
    onChange([...logos, src]);
    setShowPicker(false);
  };
  const removeLogo = (index: number) => {
    onChange(logos.filter((_, i) => i !== index));
  };
  const moveLogo = (from: number, to: number) => {
    if (to < 0 || to >= logos.length) return;
    const updated = [...logos];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    onChange(updated);
  };

  return (
    <div style={{ marginTop: 8 }}>
      <label style={{ fontSize: 11, color: MUTED_TEXT, fontWeight: 600 }}>
        Logos ({logos.length})
      </label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
        {logos.map((src, i) => {
          const asset = availableLogos.find(a => a.src === src);
          return (
            <div key={`${src}-${i}`} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 6px',
              border: `1px solid ${PANEL_BORDER}`,
              borderRadius: 5,
              backgroundColor: FIELD_BG,
            }}>
              <img src={src} alt="" style={{ width: 24, height: 24, objectFit: 'contain' }} />
              <span style={{ fontSize: 11, color: 'var(--ae-text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {asset?.name || src.split('/').pop()}
              </span>
              <button onClick={() => moveLogo(i, i - 1)} disabled={i === 0}
                style={{ border: 'none', background: 'none', color: i === 0 ? 'var(--ae-text-disabled)' : 'var(--ae-text-secondary)', cursor: i === 0 ? 'default' : 'pointer', fontSize: 12, padding: '0 2px' }}>
                ▲
              </button>
              <button onClick={() => moveLogo(i, i + 1)} disabled={i === logos.length - 1}
                style={{ border: 'none', background: 'none', color: i === logos.length - 1 ? 'var(--ae-text-disabled)' : 'var(--ae-text-secondary)', cursor: i === logos.length - 1 ? 'default' : 'pointer', fontSize: 12, padding: '0 2px' }}>
                ▼
              </button>
              <button onClick={() => removeLogo(i)}
                style={{ border: 'none', background: 'none', color: 'var(--ae-danger)', cursor: 'pointer', fontSize: 14, padding: '0 2px', lineHeight: 1 }}>
                x
              </button>
            </div>
          );
        })}
      </div>
      <button
        onClick={() => setShowPicker(!showPicker)}
        style={{
          width: '100%', marginTop: 6,
          padding: '7px 10px',
          backgroundColor: FIELD_BG,
          color: AE_ACCENT,
          border: `1px dashed ${AE_ACCENT}`,
          borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
        }}
      >
        + Logo hinzufügen
      </button>
      {showPicker && (
        <div style={{
          maxHeight: 200, overflowY: 'auto', marginTop: 4,
          border: `1px solid ${PANEL_BORDER}`, borderRadius: 6, backgroundColor: FIELD_BG,
        }}>
          {availableLogos
            .filter(a => allowDuplicates || !logos.includes(a.src))
            .map((asset) => (
            <div
              key={asset.src}
              onClick={() => addLogo(asset.src)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 8px', cursor: 'pointer',
                borderBottom: `1px solid ${PANEL_BORDER}`,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--ae-bg-panel-raised)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <img src={asset.src} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
              <span style={{ fontSize: 12, color: 'var(--ae-text-primary)' }}>{asset.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Reusable slider
const SettingsSlider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (val: number) => void;
}> = ({ label, value, min, max, step, unit = '', onChange }) => (
  <div>
    <label style={{ fontSize: 11, color: MUTED_TEXT }}>
      {label}: {value % 1 === 0 ? value : value.toFixed(1)}{unit}
    </label>
    <input
      type="range" min={min} max={max} step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ width: '100%', accentColor: AE_ACCENT }}
    />
  </div>
);

// === Logo Carousel Settings ===

const LogoCarouselSettings: React.FC<WidgetSettingsProps> = ({ props, onUpdate }) => {
  const logos = (props.logos as string[]) || [];
  return (
    <PropertySection title="Logo-Karussell">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <SettingsSlider label="Anzeigedauer" value={(props.displayDuration as number) || 2} min={0.5} max={10} step={0.5} unit="s" onChange={(v) => onUpdate({ displayDuration: v })} />
        <SettingsSlider label="Übergang" value={(props.transitionDuration as number) || 0.5} min={0.2} max={2} step={0.1} unit="s" onChange={(v) => onUpdate({ transitionDuration: v })} />
        <SettingsSlider label="Schwebeweg" value={(props.floatDistance as number) || 30} min={0} max={100} step={5} unit="px" onChange={(v) => onUpdate({ floatDistance: v })} />
        <SettingsSlider label="Logo-Größe" value={(props.logoScale as number) || 0.9} min={0.2} max={1.5} step={0.05} onChange={(v) => onUpdate({ logoScale: v })} />
      </div>
      <LogoListEditor logos={logos} onChange={(l) => onUpdate({ logos: l })} />
    </PropertySection>
  );
};

// === Logo Orbit Settings ===

const LogoOrbitSettings: React.FC<WidgetSettingsProps> = ({ props, onUpdate }) => {
  const logos = (props.logos as string[]) || [];
  const [showCenterPicker, setShowCenterPicker] = useState(false);
  const centerLogo = props.centerLogo as string | undefined;

  return (
    <PropertySection title="Logo-Orbit">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <SettingsSlider label="Geschwindigkeit" value={(props.orbitSpeed as number) || 0.3} min={0.05} max={1} step={0.05} unit="x" onChange={(v) => onUpdate({ orbitSpeed: v })} />
        <SettingsSlider label="Neigung" value={(props.tiltAngle as number) || 60} min={0} max={80} step={5} unit="°" onChange={(v) => onUpdate({ tiltAngle: v })} />
        <SettingsSlider label="Logo-Größe" value={(props.logoScale as number) || 0.2} min={0.1} max={0.5} step={0.05} onChange={(v) => onUpdate({ logoScale: v })} />
      </div>

      {/* Center logo */}
      <div style={{ marginTop: 8 }}>
        <label style={{ fontSize: 11, color: MUTED_TEXT, fontWeight: 600 }}>Zentrales Logo</label>
        {centerLogo ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, marginTop: 4,
            padding: '4px 6px', border: `1px solid ${PANEL_BORDER}`, borderRadius: 5, backgroundColor: FIELD_BG,
          }}>
            <img src={centerLogo} alt="" style={{ width: 24, height: 24, objectFit: 'contain' }} />
            <span style={{ fontSize: 11, color: 'var(--ae-text-primary)', flex: 1 }}>
              {availableLogos.find(a => a.src === centerLogo)?.name || 'Logo'}
            </span>
            <button onClick={() => onUpdate({ centerLogo: undefined })}
              style={{ border: 'none', background: 'none', color: 'var(--ae-danger)', cursor: 'pointer', fontSize: 14, padding: '0 2px', lineHeight: 1 }}>
              x
            </button>
          </div>
        ) : (
          <>
            <button onClick={() => setShowCenterPicker(!showCenterPicker)}
              style={{
                width: '100%', marginTop: 4, padding: '5px 8px', backgroundColor: FIELD_BG,
                color: MUTED_TEXT, border: `1px dashed ${PANEL_BORDER}`, borderRadius: 6,
                fontSize: 11, cursor: 'pointer',
              }}>
              Zentral-Logo wählen (optional)
            </button>
            {showCenterPicker && (
              <div style={{ maxHeight: 150, overflowY: 'auto', marginTop: 4, border: `1px solid ${PANEL_BORDER}`, borderRadius: 6, backgroundColor: FIELD_BG }}>
                {availableLogos.map((asset) => (
                  <div key={asset.src} onClick={() => { onUpdate({ centerLogo: asset.src }); setShowCenterPicker(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', cursor: 'pointer', borderBottom: `1px solid ${PANEL_BORDER}` }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--ae-bg-panel-raised)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                    <img src={asset.src} alt="" style={{ width: 24, height: 24, objectFit: 'contain' }} />
                    <span style={{ fontSize: 11, color: 'var(--ae-text-primary)' }}>{asset.name}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <LogoListEditor logos={logos} onChange={(l) => onUpdate({ logos: l })} allowDuplicates={false} />
    </PropertySection>
  );
};

// === Logo Grid Reveal Settings ===

const LogoGridRevealSettings: React.FC<WidgetSettingsProps> = ({ props, onUpdate }) => {
  const logos = (props.logos as string[]) || [];
  const revealOrder = (props.revealOrder as string) || 'leftToRight';

  return (
    <PropertySection title="Logo-Grid">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <SettingsSlider label="Spalten" value={(props.columns as number) || 3} min={2} max={6} step={1} onChange={(v) => onUpdate({ columns: v })} />
        <SettingsSlider label="Verzögerung" value={(props.staggerDelay as number) || 0.2} min={0.05} max={1} step={0.05} unit="s" onChange={(v) => onUpdate({ staggerDelay: v })} />
        <SettingsSlider label="Haltezeit" value={(props.holdDuration as number) || 2} min={0.5} max={10} step={0.5} unit="s" onChange={(v) => onUpdate({ holdDuration: v })} />
        <SettingsSlider label="Exit-Dauer" value={(props.exitDuration as number) || 0.5} min={0.2} max={2} step={0.1} unit="s" onChange={(v) => onUpdate({ exitDuration: v })} />
        <SettingsSlider label="Logo-Größe" value={(props.logoScale as number) || 0.8} min={0.2} max={1.5} step={0.05} onChange={(v) => onUpdate({ logoScale: v })} />
      </div>

      {/* Reveal order */}
      <div style={{ marginTop: 8 }}>
        <label style={{ fontSize: 11, color: MUTED_TEXT, fontWeight: 600 }}>Reihenfolge</label>
        <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
          {(['leftToRight', 'spiral', 'random'] as const).map((order) => {
            const labels: Record<string, string> = { leftToRight: 'L→R', spiral: 'Spirale', random: 'Zufall' };
            return (
              <button key={order} onClick={() => onUpdate({ revealOrder: order })}
                style={{
                  flex: 1, padding: '5px 4px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${revealOrder === order ? AE_ACCENT : PANEL_BORDER}`,
                  borderRadius: 5,
                  backgroundColor: revealOrder === order ? 'var(--ae-accent-overlay)' : FIELD_BG,
                  color: revealOrder === order ? AE_ACCENT : 'var(--ae-text-primary)',
                }}>
                {labels[order]}
              </button>
            );
          })}
        </div>
      </div>

      <LogoListEditor logos={logos} onChange={(l) => onUpdate({ logos: l })} />
    </PropertySection>
  );
};

// === Logo Morph Chain Settings ===

const LogoMorphChainSettings: React.FC<WidgetSettingsProps> = ({ props, onUpdate }) => {
  const logos = (props.logos as string[]) || [];
  const labels = (props.labels as string[]) || [];
  const transitionMode = (props.transitionMode as string) || 'crossfade';
  const showLabels = props.showLabels !== undefined ? (props.showLabels as boolean) : true;

  const updateLabel = (index: number, text: string) => {
    const updated = [...labels];
    while (updated.length <= index) updated.push('');
    updated[index] = text;
    onUpdate({ labels: updated });
  };

  return (
    <PropertySection title="Logo-Showcase">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <SettingsSlider label="Anzeigedauer" value={(props.displayDuration as number) || 2} min={0.5} max={10} step={0.5} unit="s" onChange={(v) => onUpdate({ displayDuration: v })} />
        <SettingsSlider label="Übergang" value={(props.transitionDuration as number) || 0.6} min={0.2} max={2} step={0.1} unit="s" onChange={(v) => onUpdate({ transitionDuration: v })} />
        <SettingsSlider label="Logo-Größe" value={(props.logoScale as number) || 0.65} min={0.2} max={1.5} step={0.05} onChange={(v) => onUpdate({ logoScale: v })} />
      </div>

      {/* Transition mode */}
      <div style={{ marginTop: 8 }}>
        <label style={{ fontSize: 11, color: MUTED_TEXT, fontWeight: 600 }}>Überblendung</label>
        <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
          {(['crossfade', 'flip', 'zoomThrough'] as const).map((mode) => {
            const modeLabels: Record<string, string> = { crossfade: 'Blend', flip: 'Flip', zoomThrough: 'Zoom' };
            return (
              <button key={mode} onClick={() => onUpdate({ transitionMode: mode })}
                style={{
                  flex: 1, padding: '5px 4px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${transitionMode === mode ? AE_ACCENT : PANEL_BORDER}`,
                  borderRadius: 5,
                  backgroundColor: transitionMode === mode ? 'var(--ae-accent-overlay)' : FIELD_BG,
                  color: transitionMode === mode ? AE_ACCENT : 'var(--ae-text-primary)',
                }}>
                {modeLabels[mode]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Labels toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
        <input type="checkbox" checked={showLabels} onChange={(e) => onUpdate({ showLabels: e.target.checked })} style={{ cursor: 'pointer' }} />
        <label style={{ fontSize: 11, color: MUTED_TEXT }}>Beschriftungen anzeigen</label>
        {showLabels && (
          <input type="color" value={(props.labelColor as string) || '#ffffff'}
            onChange={(e) => onUpdate({ labelColor: e.target.value })}
            style={{ width: 22, height: 22, border: `1px solid ${FIELD_BORDER}`, borderRadius: 4, backgroundColor: FIELD_BG, cursor: 'pointer', padding: 1, marginLeft: 'auto' }} />
        )}
      </div>

      <LogoListEditor logos={logos} onChange={(l) => onUpdate({ logos: l })} />

      {/* Labels editor (shown if labels enabled and logos exist) */}
      {showLabels && logos.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <label style={{ fontSize: 11, color: MUTED_TEXT, fontWeight: 600 }}>Beschriftungen</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
            {logos.map((src, i) => {
              const asset = availableLogos.find(a => a.src === src);
              return (
                <div key={`label-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <img src={src} alt="" style={{ width: 20, height: 20, objectFit: 'contain', flexShrink: 0 }} />
                  <input
                    type="text"
                    value={labels[i] || ''}
                    placeholder={asset?.name || ''}
                    onChange={(e) => updateLabel(i, e.target.value)}
                    style={{
                      flex: 1, padding: '3px 6px', fontSize: 11,
                      backgroundColor: FIELD_BG, border: `1px solid ${PANEL_BORDER}`,
                      borderRadius: 4, color: 'var(--ae-text-primary)',
                      outline: 'none',
                    }}
                    onFocus={(e) => { e.target.style.borderColor = AE_ACCENT; }}
                    onBlur={(e) => { e.target.style.borderColor = PANEL_BORDER; }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </PropertySection>
  );
};
