import { useProjectStore } from '../store/useProjectStore';
import { ImageContent, ShapeContent, TextContent, WidgetContent, Keyframe } from '../types/project';
import { AnimationPicker } from './components/AnimationPicker';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCamera } from '@fortawesome/free-solid-svg-icons';
import { PropertySection, PropertyInput, ColorInput, LabeledTextInput, AE_ACCENT, PANEL_BORDER, FIELD_BORDER, FIELD_BG, PANEL_BG, MUTED_TEXT } from './components/PropertyControls';
import { EffectSlot, EffectAddButton, CameraKeyframeRow } from './components/EffectControls';
import { LogoCarouselSettings, LogoOrbitSettings, LogoGridRevealSettings, LogoMorphChainSettings } from './components/WidgetSettings';

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

  // Multi-select
  if (selectedElementIds.length > 1) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ padding: '10px 14px', backgroundColor: PANEL_BG, border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, fontSize: 14, fontWeight: 600, textAlign: 'center', color: 'var(--ae-text-primary)' }}>
          {selectedElementIds.length} Elemente ausgewählt
        </div>
        <button
          onClick={() => { if (confirm(`${selectedElementIds.length} Elemente wirklich löschen?`)) selectedElementIds.forEach((id) => deleteElement(id)); }}
          style={{ width: '100%', padding: '10px 16px', backgroundColor: 'var(--ae-danger)', color: 'var(--ae-gray-900)', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          Alle löschen
        </button>
      </div>
    );
  }

  if (!selectedElement) {
    const cameraKfs = project.cameraKeyframes || [];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: MUTED_TEXT, textAlign: 'center', padding: 16, backgroundColor: PANEL_BG, border: `1px solid ${PANEL_BORDER}`, borderRadius: 12 }} />
        <PropertySection title="Kamera-Keyframes">
          <button
            onClick={() => {
              addCameraKeyframe({ time: Math.round(currentTime / 50) * 50, x: project.canvas.width / 2, y: project.canvas.height / 2, zoom: 1.0 });
            }}
            style={{ width: '100%', padding: '7px 10px', backgroundColor: '#00bcd4', color: '#000', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            <FontAwesomeIcon icon={faCamera} style={{ marginRight: 6 }} />Kamera-KF bei {Math.round(currentTime)}ms
          </button>
          {cameraKfs.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {cameraKfs.map((kf) => (
                <CameraKeyframeRow key={kf.time} kf={kf} canvasWidth={project.canvas.width} canvasHeight={project.canvas.height}
                  onUpdate={(updates) => addCameraKeyframe({ ...kf, ...updates })} onRemove={() => removeCameraKeyframe(kf.time)} />
              ))}
            </div>
          )}
        </PropertySection>
      </div>
    );
  }

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
      kf.fill = overrides.fill ?? c.fill; kf.stroke = overrides.stroke ?? c.stroke;
      kf.strokeWidth = overrides.strokeWidth ?? c.strokeWidth; kf.borderRadius = overrides.borderRadius ?? c.borderRadius;
    } else if (selectedElement.type === 'text') {
      const c = selectedElement.content as TextContent;
      kf.color = overrides.color ?? c.color; kf.fontSize = overrides.fontSize ?? c.fontSize;
    }
    addKeyframe(selectedElement.id, kf);
  };

  const handlePositionChange = (axis: 'x' | 'y', value: number) => {
    const update = hasKeyframes ? updateElementSilent : updateElement;
    update(selectedElement.id, { position: { ...selectedElement.position, [axis]: value } });
    maybeAutoKeyframe({ [axis]: value });
  };

  const handleSizeChange = (dimension: 'width' | 'height', value: number) => {
    const clamped = Math.max(10, value);
    const update = hasKeyframes ? updateElementSilent : updateElement;
    update(selectedElement.id, { size: { ...selectedElement.size, [dimension]: clamped } });
    maybeAutoKeyframe({ [dimension]: clamped });
  };

  const handleRotationChange = (value: number) => {
    const update = hasKeyframes ? updateElementSilent : updateElement;
    update(selectedElement.id, { rotation: value });
    maybeAutoKeyframe({ rotation: value });
  };

  const handleDelete = () => { if (confirm('Element wirklich löschen?')) deleteElement(selectedElement.id); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Animation */}
      <PropertySection title="Animation">
        <AnimationPicker elementId={selectedElement.id} />
      </PropertySection>

      {/* Effects */}
      <PropertySection title="Effekte">
        {(selectedElement.effects || []).map((effect, index) => (
          <EffectSlot key={`${effect.type}-${index}`} effect={effect}
            onUpdate={(updated) => updateEffect(selectedElement.id, index, updated)}
            onRemove={() => removeEffect(selectedElement.id, index)} />
        ))}
        <EffectAddButton existingTypes={(selectedElement.effects || []).map(e => e.type)}
          onAdd={(type) => addEffect(selectedElement.id, { type, intensity: 1.0, speed: 1.0, enabled: true })} />
      </PropertySection>

      {/* Keyframes */}
      <PropertySection title="Keyframes">
        <button
          onClick={() => {
            const kf: Keyframe = { time: Math.round(currentTime / 50) * 50, x: selectedElement.position.x, y: selectedElement.position.y, width: selectedElement.size.width, height: selectedElement.size.height, rotation: selectedElement.rotation };
            if (selectedElement.type === 'shape') { const c = selectedElement.content as ShapeContent; kf.fill = c.fill; kf.stroke = c.stroke; kf.strokeWidth = c.strokeWidth; kf.borderRadius = c.borderRadius; }
            else if (selectedElement.type === 'text') { const c = selectedElement.content as TextContent; kf.color = c.color; kf.fontSize = c.fontSize; }
            addKeyframe(selectedElement.id, kf);
          }}
          style={{ width: '100%', padding: '7px 10px', backgroundColor: 'var(--ae-notice)', color: 'var(--ae-gray-900)', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          ◆ Keyframe bei {Math.round(currentTime)}ms
        </button>
        {selectedElement.keyframes && selectedElement.keyframes.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {selectedElement.keyframes.map((kf) => (
              <div key={kf.time} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px', backgroundColor: PANEL_BG, border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, fontSize: 11 }}>
                <span style={{ color: 'var(--ae-notice-strong)', fontWeight: 700 }}>◆</span>
                <span style={{ color: 'var(--ae-text-primary)', fontFamily: 'monospace', minWidth: 55 }}>
                  {kf.time >= 1000 ? `${(kf.time / 1000).toFixed(1)}s` : `${kf.time}ms`}
                </span>
                <span style={{ color: MUTED_TEXT, fontSize: 10 }}>
                  ({Math.round(kf.x)}, {Math.round(kf.y)}){kf.width !== undefined && ` ${Math.round(kf.width)}×${Math.round(kf.height ?? 0)}`}{kf.fill !== undefined && ` ${kf.fill}`}
                </span>
                <button onClick={() => removeKeyframe(selectedElement.id, kf.time)}
                  style={{ marginLeft: 'auto', border: 'none', backgroundColor: 'transparent', color: 'var(--ae-danger)', cursor: 'pointer', fontSize: 14, padding: '0 4px', lineHeight: 1 }}>×</button>
              </div>
            ))}
          </div>
        )}
      </PropertySection>

      {/* Widget Properties */}
      {selectedElement.type === 'widget' && (() => {
        const content = selectedElement.content as WidgetContent;
        const handleWidgetUpdate = (updates: Partial<WidgetContent>) => updateElement(selectedElement.id, { content: { ...content, ...updates } });
        const handlePropsUpdate = (propUpdates: Record<string, unknown>) => handleWidgetUpdate({ props: { ...content.props, ...propUpdates } });
        return (
          <>
            <PropertySection title="Widget">
              <div style={{ padding: '5px 8px', backgroundColor: PANEL_BG, border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, fontSize: 13, color: 'var(--ae-text-primary)', fontWeight: 500 }}>{content.widgetName}</div>
              <PropertyInput label="FPS" value={content.fps} onChange={(val) => handleWidgetUpdate({ fps: Math.max(1, Math.min(60, val)) })} min={1} max={60} />
              <PropertyInput label="Frames" value={content.durationInFrames} onChange={(val) => handleWidgetUpdate({ durationInFrames: Math.max(1, val) })} min={1} />
            </PropertySection>
            {content.widgetName === 'logoCarousel' && <LogoCarouselSettings props={content.props || {}} onUpdate={handlePropsUpdate} />}
            {content.widgetName === 'logoOrbit' && <LogoOrbitSettings props={content.props || {}} onUpdate={handlePropsUpdate} />}
            {content.widgetName === 'logoGridReveal' && <LogoGridRevealSettings props={content.props || {}} onUpdate={handlePropsUpdate} />}
            {content.widgetName === 'logoMorphChain' && <LogoMorphChainSettings props={content.props || {}} onUpdate={handlePropsUpdate} />}
          </>
        );
      })()}

      {/* Size */}
      <PropertySection title="Größe">
        <PropertyInput label="Breite" value={Math.round(selectedElement.size.width)} onChange={(val) => handleSizeChange('width', val)} unit="px" min={10} />
        <PropertyInput label="Höhe" value={Math.round(selectedElement.size.height)} onChange={(val) => handleSizeChange('height', val)} unit="px" min={10} />
      </PropertySection>

      {/* Position */}
      <PropertySection title="Position">
        <PropertyInput label="X" value={Math.round(selectedElement.position.x)} onChange={(val) => handlePositionChange('x', val)} unit="px" />
        <PropertyInput label="Y" value={Math.round(selectedElement.position.y)} onChange={(val) => handlePositionChange('y', val)} unit="px" />
      </PropertySection>

      {/* Rotation */}
      <PropertySection title="Rotation">
        <PropertyInput label="Winkel" value={selectedElement.rotation} onChange={handleRotationChange} unit="°" min={-180} max={180} />
        <input type="range" min="-180" max="180" value={selectedElement.rotation} onChange={(e) => handleRotationChange(Number(e.target.value))} style={{ width: '100%', marginTop: 4, accentColor: AE_ACCENT }} />
      </PropertySection>

      {/* Z-Index */}
      <PropertySection title="Ebene">
        <PropertyInput label="Z-Index" value={selectedElement.zIndex} onChange={(val) => updateElement(selectedElement.id, { zIndex: val })} min={0} />
      </PropertySection>

      {/* Shape */}
      {selectedElement.type === 'shape' && (() => {
        const content = selectedElement.content as ShapeContent;
        const handleShapeUpdate = (updates: Partial<ShapeContent>) => {
          (hasKeyframes ? updateElementSilent : updateElement)(selectedElement.id, { content: { ...content, ...updates } });
          maybeAutoKeyframe(updates as any);
        };
        return (
          <PropertySection title="Farbe">
            <ColorInput label="Füllung" value={content.fill} onChange={(val) => handleShapeUpdate({ fill: val })} allowNone />
            <ColorInput label="Kontur" value={content.stroke || 'transparent'} onChange={(val) => handleShapeUpdate({ stroke: val === 'transparent' ? undefined : val })} allowNone />
            {content.stroke && <PropertyInput label="Stärke" value={content.strokeWidth || 1} onChange={(val) => handleShapeUpdate({ strokeWidth: Math.max(1, val) })} unit="px" min={1} max={50} />}
            {content.shape === 'rectangle' && <PropertyInput label="Eckenradius" value={content.borderRadius || 0} onChange={(val) => handleShapeUpdate({ borderRadius: Math.max(0, val) })} unit="px" min={0} max={Math.min(selectedElement.size.width, selectedElement.size.height) / 2} />}
          </PropertySection>
        );
      })()}

      {/* Text */}
      {selectedElement.type === 'text' && (() => {
        const content = selectedElement.content as TextContent;
        const handleTextUpdate = (updates: Partial<TextContent>) => {
          (hasKeyframes ? updateElementSilent : updateElement)(selectedElement.id, { content: { ...content, ...updates } });
          maybeAutoKeyframe(updates as any);
        };
        return (
          <PropertySection title="Text">
            <input type="text" value={content.text} onChange={(e) => handleTextUpdate({ text: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', backgroundColor: FIELD_BG, border: `1px solid ${FIELD_BORDER}`, borderRadius: 8, color: 'var(--ae-text-primary)', fontSize: 13, outline: 'none' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = AE_ACCENT; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = FIELD_BORDER; }} />
            <ColorInput label="Farbe" value={content.color} onChange={(val) => handleTextUpdate({ color: val })} />
            <PropertyInput label="Größe" value={content.fontSize} onChange={(val) => handleTextUpdate({ fontSize: Math.max(8, val) })} unit="px" min={8} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: MUTED_TEXT, cursor: 'pointer' }}>
              <input type="checkbox" checked={content.typewriter ?? false} onChange={(e) => handleTextUpdate({ typewriter: e.target.checked })} />
              Typewriter
            </label>
          </PropertySection>
        );
      })()}

      {/* Image */}
      {selectedElement.type === 'image' && (() => {
        const content = selectedElement.content as ImageContent;
        const handleImageUpdate = (updates: Partial<ImageContent>) => updateElement(selectedElement.id, { content: { ...content, ...updates } });
        return (
          <PropertySection title="Bild">
            <div style={{ width: '100%', aspectRatio: '16 / 9', backgroundColor: 'var(--ae-bg-panel-muted)', border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
              <img src={content.src} alt={content.alt} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
            <LabeledTextInput label="Quelle" value={content.src} onChange={(val) => handleImageUpdate({ src: val })} placeholder="/assets/your-image.png" />
            <LabeledTextInput label="Alt" value={content.alt} onChange={(val) => handleImageUpdate({ alt: val })} placeholder="Image description" />
          </PropertySection>
        );
      })()}

      {/* Delete */}
      <div style={{ borderTop: `1px solid ${PANEL_BORDER}`, paddingTop: 12, marginTop: 'auto' }}>
        <button onClick={handleDelete}
          style={{ width: '100%', padding: '10px 16px', backgroundColor: 'var(--ae-danger)', color: 'var(--ae-gray-900)', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'background-color 0.2s' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--ae-danger-muted)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--ae-danger)'; }}>
          Element löschen
        </button>
      </div>
    </div>
  );
};
