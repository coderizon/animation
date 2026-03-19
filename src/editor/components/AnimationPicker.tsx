import { useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { animationPresets, presetCategories } from '../../animations/presets';
import { AnimationPresetName, EasingName } from '../../types/animation';

interface AnimationPickerProps {
  elementId: string;
}

export const AnimationPicker: React.FC<AnimationPickerProps> = ({ elementId }) => {
  const element = useProjectStore((state) =>
    state.project.elements.find((el) => el.id === elementId)
  );
  const updateElement = useProjectStore((state) => state.updateElement);
  const triggerPreview = useProjectStore((state) => state.triggerPreview);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  if (!element) return null;

  const currentAnimation = element.animation;

  const handleSelectPreset = (presetName: AnimationPresetName) => {
    const preset = animationPresets[presetName];
    const isNewAnimation = !currentAnimation || currentAnimation.preset === 'none';
    updateElement(element.id, {
      animation: {
        preset: presetName,
        delay: isNewAnimation ? 0 : currentAnimation.delay,
        duration: isNewAnimation ? preset.defaultDuration : currentAnimation.duration,
        easing: isNewAnimation ? 'easeOut' : currentAnimation.easing,
      },
    });
    // Auto-preview on selection
    setTimeout(() => triggerPreview(element.id), 50);
  };

  const handleRemoveAnimation = () => {
    updateElement(element.id, {
      animation: undefined,
    });
  };

  const handleDurationChange = (duration: number) => {
    if (!currentAnimation) return;
    updateElement(element.id, {
      animation: {
        ...currentAnimation,
        duration: Math.max(100, duration),
      },
    });
  };

  const handleDelayChange = (delay: number) => {
    if (!currentAnimation) return;
    updateElement(element.id, {
      animation: {
        ...currentAnimation,
        delay: Math.max(0, delay),
      },
    });
  };

  const handleEasingChange = (easing: EasingName) => {
    if (!currentAnimation) return;
    updateElement(element.id, {
      animation: {
        ...currentAnimation,
        easing,
      },
    });
  };

  const toggleCategory = (categoryName: string) => {
    setExpandedCategory(prev => prev === categoryName ? null : categoryName);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      {/* Animation Presets by Category */}
      <div>
        <h4 style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--ae-text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: 8,
        }}>
          Animation Preset
        </h4>

        {/* Current selection indicator */}
        {currentAnimation && currentAnimation.preset !== 'none' && (
          <div style={{
            padding: '6px 10px',
            backgroundColor: 'var(--ae-accent-overlay)',
            borderRadius: 6,
            marginBottom: 8,
            fontSize: 12,
            color: 'var(--ae-accent-strong)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <span>{animationPresets[currentAnimation.preset]?.icon}</span>
            <span style={{ fontWeight: 600 }}>
              {animationPresets[currentAnimation.preset]?.displayName}
            </span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {presetCategories.map((category) => {
            const isExpanded = expandedCategory === category.name;
            const hasCurrent = category.presets.includes(currentAnimation?.preset as AnimationPresetName);

            return (
              <div key={category.name}>
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category.name)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: hasCurrent ? 'var(--ae-accent-overlay)' : 'var(--ae-bg-input)',
                    border: '1px solid',
                    borderColor: hasCurrent ? 'var(--ae-accent)' : 'var(--ae-border)',
                    borderRadius: isExpanded ? '6px 6px 0 0' : 6,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 12,
                    fontWeight: 600,
                    color: hasCurrent ? 'var(--ae-accent-strong)' : 'var(--ae-text-primary)',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (!hasCurrent) {
                      e.currentTarget.style.backgroundColor = 'var(--ae-bg-panel-raised)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!hasCurrent) {
                      e.currentTarget.style.backgroundColor = 'var(--ae-bg-input)';
                    }
                  }}
                >
                  <span>{category.name}</span>
                  <span style={{
                    fontSize: 10,
                    color: 'var(--ae-text-muted)',
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.15s',
                  }}>
                    ▼
                  </span>
                </button>

                {/* Category Presets */}
                {isExpanded && (
                  <div style={{
                    border: '1px solid var(--ae-border)',
                    borderTop: 'none',
                    borderRadius: '0 0 6px 6px',
                    padding: 6,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 4,
                  }}>
                    {category.presets.map((presetName) => {
                      const preset = animationPresets[presetName];
                      if (!preset) return null;
                      const isSelected = currentAnimation?.preset === presetName;

                      return (
                        <button
                          key={presetName}
                          onClick={() => handleSelectPreset(presetName)}
                          style={{
                            padding: '8px 6px',
                            backgroundColor: isSelected ? 'var(--ae-accent)' : 'var(--ae-bg-input)',
                            border: isSelected ? '1.5px solid var(--ae-accent)' : '1.5px solid var(--ae-border)',
                            borderRadius: 6,
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 3,
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.backgroundColor = 'var(--ae-bg-panel-raised)';
                              e.currentTarget.style.borderColor = 'var(--ae-border-strong)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.backgroundColor = 'var(--ae-bg-input)';
                              e.currentTarget.style.borderColor = 'var(--ae-border)';
                            }
                          }}
                          title={preset.description}
                        >
                          <span style={{ fontSize: 18 }}>{preset.icon}</span>
                          <span style={{
                            fontSize: 10,
                            fontWeight: 500,
                            color: isSelected ? 'var(--ae-gray-900)' : 'var(--ae-text-primary)',
                            textAlign: 'center',
                            lineHeight: 1.2,
                          }}>
                            {preset.displayName}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Animation Controls (only show if animation is selected) */}
      {currentAnimation && (
        <>
          {/* Duration Control */}
          <div>
            <label style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--ae-text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: 8,
              display: 'block',
            }}>
              Dauer
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <input
                type="number"
                value={currentAnimation.duration}
                onChange={(e) => handleDurationChange(Number(e.target.value))}
                min={100}
                max={5000}
                step={100}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  backgroundColor: 'var(--ae-bg-input)',
                  border: '1px solid var(--ae-border)',
                  borderRadius: 6,
                  color: 'var(--ae-text-primary)',
                  fontSize: 13,
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--ae-accent)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--ae-border)';
                }}
              />
              <span style={{
                fontSize: 12,
                color: 'var(--ae-text-muted)',
                minWidth: 25,
              }}>
                ms
              </span>
            </div>
            <input
              type="range"
              min="100"
              max="5000"
              step="100"
              value={currentAnimation.duration}
              onChange={(e) => handleDurationChange(Number(e.target.value))}
              style={{
                width: '100%',
                marginTop: 8,
                accentColor: 'var(--ae-accent)',
              }}
            />
          </div>

          {/* Delay Control */}
          <div>
            <label style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--ae-text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: 8,
              display: 'block',
            }}>
              Verzögerung
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <input
                type="number"
                value={currentAnimation.delay}
                onChange={(e) => handleDelayChange(Number(e.target.value))}
                min={0}
                max={10000}
                step={100}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  backgroundColor: 'var(--ae-bg-input)',
                  border: '1px solid var(--ae-border)',
                  borderRadius: 6,
                  color: 'var(--ae-text-primary)',
                  fontSize: 13,
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--ae-accent)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--ae-border)';
                }}
              />
              <span style={{
                fontSize: 12,
                color: 'var(--ae-text-muted)',
                minWidth: 25,
              }}>
                ms
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="10000"
              step="100"
              value={currentAnimation.delay}
              onChange={(e) => handleDelayChange(Number(e.target.value))}
              style={{
                width: '100%',
                marginTop: 8,
                accentColor: 'var(--ae-accent)',
              }}
            />
          </div>

          {/* Easing Control */}
          <div>
            <label style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--ae-text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: 8,
              display: 'block',
            }}>
              Easing
            </label>
            <select
              value={currentAnimation.easing}
              onChange={(e) => handleEasingChange(e.target.value as EasingName)}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: 'var(--ae-bg-input)',
                border: '1px solid var(--ae-border)',
                borderRadius: 6,
                color: 'var(--ae-text-primary)',
                fontSize: 13,
                outline: 'none',
                cursor: 'pointer',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--ae-accent)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--ae-border)';
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

          {/* Preview Button */}
          <button
            onClick={() => triggerPreview(element.id)}
            style={{
              width: '100%',
              padding: '12px 16px',
              backgroundColor: 'var(--ae-accent)',
              color: 'var(--ae-gray-900)',
              border: 'none',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--ae-accent-strong)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--ae-accent)';
            }}
          >
            Vorschau
          </button>

          {/* Remove Animation Button */}
          <button
            onClick={handleRemoveAnimation}
            style={{
              width: '100%',
              padding: '10px 16px',
              backgroundColor: 'transparent',
              color: 'var(--ae-danger)',
              border: '1px solid var(--ae-danger)',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--ae-danger-muted)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Animation entfernen
          </button>
        </>
      )}

      {/* Tip */}
      <div style={{
        padding: 10,
        backgroundColor: 'var(--ae-bg-input)',
        borderRadius: 6,
        fontSize: 11,
        color: 'var(--ae-text-muted)',
        lineHeight: 1.4,
      }}>
        <strong>Tipp:</strong> Wähle eine Kategorie und dann eine Animation aus
      </div>
    </div>
  );
};
