import React, { useState } from 'react';
import { PropertySection, SettingsSlider, AE_ACCENT, PANEL_BORDER, FIELD_BG, MUTED_TEXT } from './PropertyControls';

// Available logos (auto-discovered SVGs)
export const availableLogos = Object.entries(
  import.meta.glob('/public/assets/*.svg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
).map(([path, url]) => ({
  name: path.split('/').pop()!.replace('.svg', '').replace(/-color$/, '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
  src: url,
})).sort((a, b) => a.name.localeCompare(b.name));

export interface WidgetSettingsProps {
  props: Record<string, unknown>;
  onUpdate: (updates: Record<string, unknown>) => void;
}

// Reusable logo list editor
const LogoListEditor: React.FC<{
  logos: string[];
  onChange: (logos: string[]) => void;
  allowDuplicates?: boolean;
}> = ({ logos, onChange, allowDuplicates = true }) => {
  const [showPicker, setShowPicker] = useState(false);
  const addLogo = (src: string) => { onChange([...logos, src]); setShowPicker(false); };
  const removeLogo = (index: number) => onChange(logos.filter((_, i) => i !== index));
  const moveLogo = (from: number, to: number) => {
    if (to < 0 || to >= logos.length) return;
    const updated = [...logos];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    onChange(updated);
  };

  return (
    <div style={{ marginTop: 8 }}>
      <label style={{ fontSize: 11, color: MUTED_TEXT, fontWeight: 600 }}>Logos ({logos.length})</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
        {logos.map((src, i) => {
          const asset = availableLogos.find(a => a.src === src);
          return (
            <div key={`${src}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px', border: `1px solid ${PANEL_BORDER}`, borderRadius: 5, backgroundColor: FIELD_BG }}>
              <img src={src} alt="" style={{ width: 24, height: 24, objectFit: 'contain' }} />
              <span style={{ fontSize: 11, color: 'var(--ae-text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {asset?.name || src.split('/').pop()}
              </span>
              <button onClick={() => moveLogo(i, i - 1)} disabled={i === 0}
                style={{ border: 'none', background: 'none', color: i === 0 ? 'var(--ae-text-disabled)' : 'var(--ae-text-secondary)', cursor: i === 0 ? 'default' : 'pointer', fontSize: 12, padding: '0 2px' }}>▲</button>
              <button onClick={() => moveLogo(i, i + 1)} disabled={i === logos.length - 1}
                style={{ border: 'none', background: 'none', color: i === logos.length - 1 ? 'var(--ae-text-disabled)' : 'var(--ae-text-secondary)', cursor: i === logos.length - 1 ? 'default' : 'pointer', fontSize: 12, padding: '0 2px' }}>▼</button>
              <button onClick={() => removeLogo(i)}
                style={{ border: 'none', background: 'none', color: 'var(--ae-danger)', cursor: 'pointer', fontSize: 14, padding: '0 2px', lineHeight: 1 }}>x</button>
            </div>
          );
        })}
      </div>
      <button onClick={() => setShowPicker(!showPicker)}
        style={{ width: '100%', marginTop: 6, padding: '7px 10px', backgroundColor: FIELD_BG, color: AE_ACCENT, border: `1px dashed ${AE_ACCENT}`, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
        + Logo hinzufügen
      </button>
      {showPicker && (
        <div style={{ maxHeight: 200, overflowY: 'auto', marginTop: 4, border: `1px solid ${PANEL_BORDER}`, borderRadius: 6, backgroundColor: FIELD_BG }}>
          {availableLogos.filter(a => allowDuplicates || !logos.includes(a.src)).map((asset) => (
            <div key={asset.src} onClick={() => addLogo(asset.src)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', cursor: 'pointer', borderBottom: `1px solid ${PANEL_BORDER}` }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--ae-bg-panel-raised)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
              <img src={asset.src} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
              <span style={{ fontSize: 12, color: 'var(--ae-text-primary)' }}>{asset.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Logo Carousel Settings
export const LogoCarouselSettings: React.FC<WidgetSettingsProps> = ({ props, onUpdate }) => {
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

// Logo Orbit Settings
export const LogoOrbitSettings: React.FC<WidgetSettingsProps> = ({ props, onUpdate }) => {
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
      <div style={{ marginTop: 8 }}>
        <label style={{ fontSize: 11, color: MUTED_TEXT, fontWeight: 600 }}>Zentrales Logo</label>
        {centerLogo ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, padding: '4px 6px', border: `1px solid ${PANEL_BORDER}`, borderRadius: 5, backgroundColor: FIELD_BG }}>
            <img src={centerLogo} alt="" style={{ width: 24, height: 24, objectFit: 'contain' }} />
            <span style={{ fontSize: 11, color: 'var(--ae-text-primary)', flex: 1 }}>{availableLogos.find(a => a.src === centerLogo)?.name || 'Logo'}</span>
            <button onClick={() => onUpdate({ centerLogo: undefined })} style={{ border: 'none', background: 'none', color: 'var(--ae-danger)', cursor: 'pointer', fontSize: 14, padding: '0 2px', lineHeight: 1 }}>x</button>
          </div>
        ) : (
          <>
            <button onClick={() => setShowCenterPicker(!showCenterPicker)}
              style={{ width: '100%', marginTop: 4, padding: '5px 8px', backgroundColor: FIELD_BG, color: MUTED_TEXT, border: `1px dashed ${PANEL_BORDER}`, borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>
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

// Logo Grid Reveal Settings
export const LogoGridRevealSettings: React.FC<WidgetSettingsProps> = ({ props, onUpdate }) => {
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
      <div style={{ marginTop: 8 }}>
        <label style={{ fontSize: 11, color: MUTED_TEXT, fontWeight: 600 }}>Reihenfolge</label>
        <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
          {(['leftToRight', 'spiral', 'random'] as const).map((order) => {
            const labels: Record<string, string> = { leftToRight: 'L→R', spiral: 'Spirale', random: 'Zufall' };
            return (
              <button key={order} onClick={() => onUpdate({ revealOrder: order })}
                style={{
                  flex: 1, padding: '5px 4px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${revealOrder === order ? AE_ACCENT : PANEL_BORDER}`, borderRadius: 5,
                  backgroundColor: revealOrder === order ? 'var(--ae-accent-overlay)' : FIELD_BG,
                  color: revealOrder === order ? AE_ACCENT : 'var(--ae-text-primary)',
                }}>{labels[order]}</button>
            );
          })}
        </div>
      </div>
      <LogoListEditor logos={logos} onChange={(l) => onUpdate({ logos: l })} />
    </PropertySection>
  );
};

// Logo Morph Chain Settings
export const LogoMorphChainSettings: React.FC<WidgetSettingsProps> = ({ props, onUpdate }) => {
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
      <div style={{ marginTop: 8 }}>
        <label style={{ fontSize: 11, color: MUTED_TEXT, fontWeight: 600 }}>Überblendung</label>
        <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
          {(['crossfade', 'flip', 'zoomThrough'] as const).map((mode) => {
            const modeLabels: Record<string, string> = { crossfade: 'Blend', flip: 'Flip', zoomThrough: 'Zoom' };
            return (
              <button key={mode} onClick={() => onUpdate({ transitionMode: mode })}
                style={{
                  flex: 1, padding: '5px 4px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${transitionMode === mode ? AE_ACCENT : PANEL_BORDER}`, borderRadius: 5,
                  backgroundColor: transitionMode === mode ? 'var(--ae-accent-overlay)' : FIELD_BG,
                  color: transitionMode === mode ? AE_ACCENT : 'var(--ae-text-primary)',
                }}>{modeLabels[mode]}</button>
            );
          })}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
        <input type="checkbox" checked={showLabels} onChange={(e) => onUpdate({ showLabels: e.target.checked })} style={{ cursor: 'pointer' }} />
        <label style={{ fontSize: 11, color: MUTED_TEXT }}>Beschriftungen anzeigen</label>
        {showLabels && (
          <input type="color" value={(props.labelColor as string) || '#ffffff'} onChange={(e) => onUpdate({ labelColor: e.target.value })}
            style={{ width: 22, height: 22, border: `1px solid var(--ae-border)`, borderRadius: 4, backgroundColor: FIELD_BG, cursor: 'pointer', padding: 1, marginLeft: 'auto' }} />
        )}
      </div>
      <LogoListEditor logos={logos} onChange={(l) => onUpdate({ logos: l })} />
      {showLabels && logos.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <label style={{ fontSize: 11, color: MUTED_TEXT, fontWeight: 600 }}>Beschriftungen</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
            {logos.map((src, i) => {
              const asset = availableLogos.find(a => a.src === src);
              return (
                <div key={`label-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <img src={src} alt="" style={{ width: 20, height: 20, objectFit: 'contain', flexShrink: 0 }} />
                  <input type="text" value={labels[i] || ''} placeholder={asset?.name || ''}
                    onChange={(e) => updateLabel(i, e.target.value)}
                    style={{ flex: 1, padding: '3px 6px', fontSize: 11, backgroundColor: FIELD_BG, border: `1px solid ${PANEL_BORDER}`, borderRadius: 4, color: 'var(--ae-text-primary)', outline: 'none' }}
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
