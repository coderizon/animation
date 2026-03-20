import React from 'react';

// Shared style constants
export const AE_ACCENT = 'var(--ae-accent)';
export const PANEL_BORDER = 'var(--ae-border)';
export const FIELD_BORDER = 'var(--ae-border)';
export const FIELD_BG = 'var(--ae-bg-input)';
export const PANEL_BG = 'var(--ae-bg-panel-raised)';
export const MUTED_TEXT = 'var(--ae-text-secondary)';

// Property Section
interface PropertySectionProps {
  title: string;
  children: React.ReactNode;
}

export const PropertySection: React.FC<PropertySectionProps> = ({ title, children }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    backgroundColor: PANEL_BG,
    border: `1px solid ${PANEL_BORDER}`,
    borderRadius: 8,
    padding: 10,
  }}>
    <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--ae-text-primary)', letterSpacing: '0.02em', marginBottom: 0 }}>
      {title}
    </h3>
    {children}
  </div>
);

// Property Input
interface PropertyInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  min?: number;
  max?: number;
}

export const PropertyInput: React.FC<PropertyInputProps> = ({ label, value, onChange, unit = '', min, max }) => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: unit ? '56px minmax(0, 1fr) auto' : '56px minmax(0, 1fr)',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  }}>
    <label style={{ fontSize: 13, color: MUTED_TEXT }}>{label}</label>
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
      onFocus={(e) => { e.currentTarget.style.borderColor = AE_ACCENT; }}
      onBlur={(e) => { e.currentTarget.style.borderColor = FIELD_BORDER; }}
    />
    {unit && <span style={{ fontSize: 12, color: MUTED_TEXT, minWidth: 16, textAlign: 'right' }}>{unit}</span>}
  </div>
);

// Color Input
interface ColorInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  allowNone?: boolean;
}

export const ColorInput: React.FC<ColorInputProps> = ({ label, value, onChange, allowNone }) => {
  const isNone = !value || value === 'transparent' || value === 'none';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6 }}>
      <label style={{ fontSize: 13, color: MUTED_TEXT }}>{label}</label>
      <div style={{ display: 'grid', gridTemplateColumns: '28px minmax(0, 1fr) auto', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <input
          type="color"
          value={isNone ? '#ffffff' : value}
          onChange={(e) => onChange(e.target.value)}
          disabled={isNone}
          style={{
            width: 28, height: 28, border: `1px solid ${FIELD_BORDER}`, borderRadius: 6,
            backgroundColor: FIELD_BG, cursor: isNone ? 'not-allowed' : 'pointer', padding: 2, opacity: isNone ? 0.4 : 1,
          }}
        />
        <span style={{ fontSize: 12, color: MUTED_TEXT, fontFamily: 'monospace', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {isNone ? 'Keine' : value}
        </span>
        {allowNone && (
          <button
            onClick={() => onChange(isNone ? '#ffffff' : 'transparent')}
            style={{
              padding: '3px 6px', backgroundColor: isNone ? AE_ACCENT : 'transparent',
              color: isNone ? 'var(--ae-gray-900)' : MUTED_TEXT,
              border: `1px solid ${FIELD_BORDER}`, borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {isNone ? 'AN' : 'AUS'}
          </button>
        )}
      </div>
    </div>
  );
};

// Labeled Text Input
interface LabeledTextInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const LabeledTextInput: React.FC<LabeledTextInputProps> = ({ label, value, onChange, placeholder }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <label style={{ fontSize: 13, color: MUTED_TEXT }}>{label}</label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', padding: '6px 10px', boxSizing: 'border-box',
        backgroundColor: FIELD_BG, border: `1px solid ${FIELD_BORDER}`, borderRadius: 8,
        color: 'var(--ae-text-primary)', fontSize: 13, outline: 'none',
      }}
      onFocus={(e) => { e.currentTarget.style.borderColor = AE_ACCENT; }}
      onBlur={(e) => { e.currentTarget.style.borderColor = FIELD_BORDER; }}
    />
  </div>
);

// Settings Slider
export const SettingsSlider: React.FC<{
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
