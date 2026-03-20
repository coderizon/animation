import { useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { animationPresets, presetCategories } from '../../animations/presets';
import { AnimationPresetName, EasingName } from '../../types/animation';
import { AnimationConfig, getAnimations } from '../../types/project';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

interface AnimationPickerProps {
  elementId: string;
}

export const AnimationPicker: React.FC<AnimationPickerProps> = ({ elementId }) => {
  const element = useProjectStore((state) =>
    state.project.elements.find((el) => el.id === elementId)
  );
  const addAnimation = useProjectStore((state) => state.addAnimation);
  const removeAnimation = useProjectStore((state) => state.removeAnimation);
  const updateAnimationAtIndex = useProjectStore((state) => state.updateAnimationAtIndex);
  const triggerPreview = useProjectStore((state) => state.triggerPreview);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  if (!element) return null;

  const animations = getAnimations(element);

  const handleAddAnimation = () => {
    const lastAnim = animations[animations.length - 1];
    const newDelay = lastAnim ? (lastAnim.delay || 0) + (lastAnim.duration || 600) : 0;
    addAnimation(elementId, {
      preset: 'fadeIn',
      delay: newDelay,
      duration: 600,
      easing: 'easeOut',
    });
    setEditingIndex(animations.length);
  };

  const handleSelectPreset = (index: number, presetName: AnimationPresetName) => {
    const preset = animationPresets[presetName];
    const current = animations[index];
    const samePreset = current?.preset === presetName;
    updateAnimationAtIndex(elementId, index, {
      preset: presetName,
      delay: current?.delay ?? 0,
      duration: samePreset ? current.duration : preset.defaultDuration,
      easing: current?.easing ?? 'easeOut',
    });
    setTimeout(() => triggerPreview(elementId), 50);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Animation List */}
      {animations.map((anim, index) => (
        <AnimationSlot
          key={index}
          index={index}
          animation={anim}
          isEditing={editingIndex === index}
          onToggleEdit={() => setEditingIndex(editingIndex === index ? null : index)}
          onSelectPreset={(preset) => handleSelectPreset(index, preset)}
          onUpdate={(updated) => updateAnimationAtIndex(elementId, index, updated)}
          onRemove={() => {
            removeAnimation(elementId, index);
            if (editingIndex === index) setEditingIndex(null);
            else if (editingIndex !== null && editingIndex > index) setEditingIndex(editingIndex - 1);
          }}
          onPreview={() => triggerPreview(elementId)}
          searchQuery={editingIndex === index ? searchQuery : ''}
          onSearchChange={setSearchQuery}
        />
      ))}

      {/* Add animation button */}
      <button
        onClick={handleAddAnimation}
        style={{
          width: '100%',
          padding: '10px 14px',
          backgroundColor: 'var(--ae-bg-input)',
          color: 'var(--ae-accent)',
          border: '1px dashed var(--ae-accent)',
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--ae-accent-overlay)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--ae-bg-input)';
        }}
      >
        + Animation hinzufügen
      </button>

    </div>
  );
};

// --- AnimationSlot sub-component ---

interface AnimationSlotProps {
  index: number;
  animation: AnimationConfig;
  isEditing: boolean;
  onToggleEdit: () => void;
  onSelectPreset: (preset: AnimationPresetName) => void;
  onUpdate: (updated: AnimationConfig) => void;
  onRemove: () => void;
  onPreview: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

const AnimationSlot: React.FC<AnimationSlotProps> = ({
  index,
  animation,
  isEditing,
  onToggleEdit,
  onSelectPreset,
  onUpdate,
  onRemove,
  onPreview,
  searchQuery,
  onSearchChange,
}) => {
  const preset = animationPresets[animation.preset];

  return (
    <div style={{
      border: isEditing ? '1px solid var(--ae-accent)' : '1px solid var(--ae-border)',
      borderRadius: 6,
      overflow: 'hidden',
    }}>
      {/* Collapsed header */}
      <div
        onClick={onToggleEdit}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 10px',
          backgroundColor: isEditing ? 'var(--ae-accent-overlay)' : 'var(--ae-bg-input)',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <span style={{ fontSize: 10, color: 'var(--ae-text-muted)', fontWeight: 700, minWidth: 16 }}>
          {index + 1}.
        </span>
        <span style={{ fontSize: 14 }}>{preset?.icon ? <FontAwesomeIcon icon={preset.icon} /> : '?'}</span>
        <span style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--ae-text-primary)',
          flex: 1,
        }}>
          {preset?.displayName || animation.preset}
        </span>
        <span style={{ fontSize: 10, color: 'var(--ae-text-muted)', fontFamily: 'monospace' }}>
          {animation.delay}ms +{animation.duration}ms
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
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

      {/* Expanded editing */}
      {isEditing && (
        <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 10, backgroundColor: 'var(--ae-bg-panel-muted)' }}>
          {/* Preset Grid */}
          <PresetGrid
            selectedPreset={animation.preset}
            onSelect={onSelectPreset}
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
          />

          {/* Duration */}
          <div>
            <label style={labelStyle}>Dauer</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="number"
                value={animation.duration}
                onChange={(e) => onUpdate({ ...animation, duration: Math.max(100, Number(e.target.value)) })}
                min={100}
                max={5000}
                step={100}
                style={inputStyle}
              />
              <span style={unitStyle}>ms</span>
            </div>
            <input
              type="range"
              min="100"
              max="5000"
              step="100"
              value={animation.duration}
              onChange={(e) => onUpdate({ ...animation, duration: Number(e.target.value) })}
              style={{ width: '100%', marginTop: 4, accentColor: 'var(--ae-accent)' }}
            />
          </div>

          {/* Delay */}
          <div>
            <label style={labelStyle}>Verzögerung</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="number"
                value={animation.delay}
                onChange={(e) => onUpdate({ ...animation, delay: Math.max(0, Number(e.target.value)) })}
                min={0}
                max={10000}
                step={100}
                style={inputStyle}
              />
              <span style={unitStyle}>ms</span>
            </div>
            <input
              type="range"
              min="0"
              max="10000"
              step="100"
              value={animation.delay}
              onChange={(e) => onUpdate({ ...animation, delay: Number(e.target.value) })}
              style={{ width: '100%', marginTop: 4, accentColor: 'var(--ae-accent)' }}
            />
          </div>

          {/* Easing */}
          <div>
            <label style={labelStyle}>Easing</label>
            <select
              value={animation.easing}
              onChange={(e) => onUpdate({ ...animation, easing: e.target.value as EasingName })}
              style={{
                ...inputStyle,
                cursor: 'pointer',
              }}
            >
              <option value="linear">Linear</option>
              <option value="easeIn">Ease In</option>
              <option value="easeOut">Ease Out</option>
              <option value="easeInOut">Ease In Out</option>
              <option value="spring">Spring</option>
              <option value="bounce">Bounce</option>
            </select>
          </div>

          {/* Preview */}
          <button
            onClick={onPreview}
            style={{
              width: '100%',
              padding: '8px 12px',
              backgroundColor: 'var(--ae-accent)',
              color: 'var(--ae-gray-900)',
              border: 'none',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Vorschau
          </button>
        </div>
      )}
    </div>
  );
};

// --- PresetGrid sub-component (flat, searchable) ---

interface PresetGridProps {
  selectedPreset: AnimationPresetName;
  onSelect: (preset: AnimationPresetName) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

const PresetGrid: React.FC<PresetGridProps> = ({
  selectedPreset,
  onSelect,
  searchQuery,
  onSearchChange,
}) => {
  return (
    <div>
      {/* Search */}
      <input
        type="text"
        placeholder="Animation suchen..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        style={{
          width: '100%',
          padding: '7px 10px',
          backgroundColor: 'var(--ae-bg-input)',
          border: '1px solid var(--ae-border)',
          borderRadius: 6,
          color: 'var(--ae-text-primary)',
          fontSize: 12,
          outline: 'none',
          marginBottom: 8,
          boxSizing: 'border-box',
        }}
      />

      {/* Scrollable flat list */}
      <div style={{
        maxHeight: 320,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}>
        {presetCategories.map((category) => {
          const filtered = category.presets.filter((name) => {
            if (name === 'none') return !searchQuery.trim(); // hide 'none' during search
            if (!searchQuery.trim()) return true;
            const p = animationPresets[name];
            if (!p) return false;
            const q = searchQuery.toLowerCase();
            return (
              p.displayName.toLowerCase().includes(q) ||
              p.name.toLowerCase().includes(q) ||
              p.description.toLowerCase().includes(q)
            );
          });

          if (filtered.length === 0) return null;

          return (
            <div key={category.name}>
              <div style={{
                fontSize: 9,
                fontWeight: 700,
                color: 'var(--ae-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                padding: '2px 0',
                marginBottom: 2,
              }}>
                {category.name}
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 3,
              }}>
                {filtered.map((presetName) => {
                  const p = animationPresets[presetName];
                  if (!p) return null;
                  const isSelected = selectedPreset === presetName;

                  return (
                    <button
                      key={presetName}
                      onClick={() => onSelect(presetName)}
                      style={{
                        padding: '8px 4px',
                        backgroundColor: isSelected ? 'var(--ae-accent)' : 'var(--ae-bg-input)',
                        border: isSelected ? '2px solid var(--ae-accent-strong)' : '1px solid var(--ae-border)',
                        borderRadius: 5,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 2,
                        transition: 'all 0.1s',
                        minHeight: 48,
                      }}
                      title={p.description}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = 'var(--ae-bg-panel-raised)';
                          e.currentTarget.style.borderColor = 'var(--ae-accent)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = 'var(--ae-bg-input)';
                          e.currentTarget.style.borderColor = 'var(--ae-border)';
                        }
                      }}
                    >
                      <span style={{ fontSize: 14 }}><FontAwesomeIcon icon={p.icon} /></span>
                      <span style={{
                        fontSize: 9,
                        fontWeight: 600,
                        color: isSelected ? 'var(--ae-gray-900)' : 'var(--ae-text-primary)',
                        textAlign: 'center',
                        lineHeight: 1.2,
                      }}>
                        {p.displayName}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- Shared styles ---

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--ae-text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: 4,
  display: 'block',
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: '6px 10px',
  backgroundColor: 'var(--ae-bg-input)',
  border: '1px solid var(--ae-border)',
  borderRadius: 6,
  color: 'var(--ae-text-primary)',
  fontSize: 12,
  outline: 'none',
};

const unitStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--ae-text-muted)',
  minWidth: 20,
};
