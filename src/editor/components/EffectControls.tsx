import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Effect, EffectType, EFFECT_DEFINITIONS, CameraKeyframe } from '../../types/project';
import { AE_ACCENT, PANEL_BORDER, FIELD_BORDER, FIELD_BG, PANEL_BG, MUTED_TEXT } from './PropertyControls';

// Effect Slot
interface EffectSlotProps {
  effect: Effect;
  onUpdate: (effect: Effect) => void;
  onRemove: () => void;
}

export const EffectSlot = React.memo<EffectSlotProps>(({ effect, onUpdate, onRemove }) => {
  const def = EFFECT_DEFINITIONS[effect.type];
  return (
    <div style={{
      border: `1px solid ${effect.enabled ? 'var(--ae-accent)' : 'var(--ae-border)'}`,
      borderRadius: 6, padding: 8, display: 'flex', flexDirection: 'column', gap: 6, opacity: effect.enabled ? 1 : 0.5,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 13 }}><FontAwesomeIcon icon={def.icon} /></span>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ae-text-primary)', flex: 1 }}>{def.displayName}</span>
        <input type="checkbox" checked={effect.enabled} onChange={(e) => onUpdate({ ...effect, enabled: e.target.checked })} style={{ cursor: 'pointer' }} />
        <button onClick={onRemove} style={{ border: 'none', backgroundColor: 'transparent', color: 'var(--ae-danger)', cursor: 'pointer', fontSize: 14, padding: '0 2px', lineHeight: 1 }}>x</button>
      </div>
      <div>
        <label style={{ fontSize: 11, color: MUTED_TEXT }}>Intensität: {effect.intensity.toFixed(1)}</label>
        <input type="range" min="0.1" max="2.0" step="0.1" value={effect.intensity} onChange={(e) => onUpdate({ ...effect, intensity: Number(e.target.value) })} style={{ width: '100%', accentColor: AE_ACCENT }} />
      </div>
      <div>
        <label style={{ fontSize: 11, color: MUTED_TEXT }}>Geschwindigkeit: {effect.speed.toFixed(1)}x</label>
        <input type="range" min="0.5" max="3.0" step="0.1" value={effect.speed} onChange={(e) => onUpdate({ ...effect, speed: Number(e.target.value) })} style={{ width: '100%', accentColor: AE_ACCENT }} />
      </div>
      {(effect.type === 'glow' || effect.type === 'neonFlicker' || effect.type === 'hologram' || effect.type === 'electrified') && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 11, color: MUTED_TEXT }}>Farbe</label>
          <input
            type="color"
            value={effect.color || (effect.type === 'neonFlicker' ? '#ff00ff' : effect.type === 'hologram' ? '#00ffff' : effect.type === 'electrified' ? '#4dc9f6' : '#5681ff')}
            onChange={(e) => onUpdate({ ...effect, color: e.target.value })}
            style={{ width: 28, height: 28, border: `1px solid ${FIELD_BORDER}`, borderRadius: 6, backgroundColor: FIELD_BG, cursor: 'pointer', padding: 2 }}
          />
          <span style={{ fontSize: 11, color: MUTED_TEXT, fontFamily: 'monospace' }}>
            {effect.color || (effect.type === 'neonFlicker' ? '#ff00ff' : effect.type === 'hologram' ? '#00ffff' : effect.type === 'electrified' ? '#4dc9f6' : '#5681ff')}
          </span>
        </div>
      )}
    </div>
  );
});

EffectSlot.displayName = 'EffectSlot';

// Effect Add Button
interface EffectAddButtonProps {
  existingTypes: EffectType[];
  onAdd: (type: EffectType) => void;
}

export const EffectAddButton = React.memo<EffectAddButtonProps>(({ existingTypes, onAdd }) => {
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
      <button onClick={() => setShowPicker(!showPicker)}
        style={{ width: '100%', padding: '7px 10px', backgroundColor: FIELD_BG, color: 'var(--ae-accent)', border: '1px dashed var(--ae-accent)', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
        + Effekt hinzufügen
      </button>
      {showPicker && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, marginTop: 6 }}>
          {available.map(type => {
            const def = EFFECT_DEFINITIONS[type];
            return (
              <button key={type} onClick={() => { onAdd(type); setShowPicker(false); }}
                style={{ padding: '8px 4px', backgroundColor: FIELD_BG, border: `1px solid ${PANEL_BORDER}`, borderRadius: 5, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minHeight: 48 }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--ae-accent)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = PANEL_BORDER; }}>
                <span style={{ fontSize: 14 }}><FontAwesomeIcon icon={def.icon} /></span>
                <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--ae-text-primary)' }}>{def.displayName}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});

EffectAddButton.displayName = 'EffectAddButton';

// Camera Keyframe Row
interface CameraKeyframeRowProps {
  kf: CameraKeyframe;
  canvasWidth: number;
  canvasHeight: number;
  onUpdate: (updates: Partial<CameraKeyframe>) => void;
  onRemove: () => void;
}

export const CameraKeyframeRow = React.memo<CameraKeyframeRowProps>(({ kf, canvasWidth, canvasHeight, onUpdate, onRemove }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '6px 8px', backgroundColor: PANEL_BG, border: `1px solid ${PANEL_BORDER}`, borderRadius: 8 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ color: '#00bcd4', fontWeight: 700, fontSize: 12 }}>◆</span>
      <span style={{ color: 'var(--ae-text-primary)', fontFamily: 'monospace', fontSize: 11, flex: 1 }}>
        {kf.time >= 1000 ? `${(kf.time / 1000).toFixed(1)}s` : `${kf.time}ms`}
      </span>
      <button onClick={onRemove} style={{ border: 'none', backgroundColor: 'transparent', color: 'var(--ae-danger)', cursor: 'pointer', fontSize: 14, padding: '0 4px', lineHeight: 1 }}>×</button>
    </div>
    {(['x', 'y'] as const).map((axis) => (
      <div key={axis} style={{ display: 'grid', gridTemplateColumns: '30px 1fr 30px', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 11, color: MUTED_TEXT }}>{axis.toUpperCase()}</span>
        <input type="number" value={Math.round(kf[axis])} onChange={(e) => onUpdate({ [axis]: Number(e.target.value) })} min={0} max={axis === 'x' ? canvasWidth : canvasHeight}
          style={{ width: '100%', padding: '4px 6px', boxSizing: 'border-box', backgroundColor: FIELD_BG, border: `1px solid ${FIELD_BORDER}`, borderRadius: 4, color: 'var(--ae-text-primary)', fontSize: 11, outline: 'none' }} />
        <span style={{ fontSize: 10, color: MUTED_TEXT }}>px</span>
      </div>
    ))}
    {(['zoomX', 'zoomY'] as const).map((axis) => (
      <div key={axis} style={{ display: 'grid', gridTemplateColumns: '30px 1fr 30px', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 11, color: MUTED_TEXT }}>{axis === 'zoomX' ? 'Z-X' : 'Z-Y'}</span>
        <input type="number" value={kf[axis]} onChange={(e) => onUpdate({ [axis]: Math.max(0.1, Number(e.target.value)) })} min={0.1} max={10} step={0.1}
          style={{ width: '100%', padding: '4px 6px', boxSizing: 'border-box', backgroundColor: FIELD_BG, border: `1px solid ${FIELD_BORDER}`, borderRadius: 4, color: 'var(--ae-text-primary)', fontSize: 11, outline: 'none' }} />
        <span style={{ fontSize: 10, color: MUTED_TEXT }}>×</span>
      </div>
    ))}
  </div>
));

CameraKeyframeRow.displayName = 'CameraKeyframeRow';
