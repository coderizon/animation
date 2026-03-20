import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useProjectStore } from '../../store/useProjectStore';
import { AnimationConfig, AnimationPresetName, Effect, EffectType, EFFECT_DEFINITIONS, getAnimations } from '../../types/project';
import { animationPresets, presetCategories } from '../../animations/presets';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const menuItemStyle: React.CSSProperties = {
  padding: '8px 16px',
  color: 'var(--ae-text-primary)',
  fontSize: 13,
  cursor: 'pointer',
  userSelect: 'none',
};

const hoverIn = (e: React.MouseEvent) => {
  (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--ae-bg-panel-raised)';
};
const hoverOut = (e: React.MouseEvent) => {
  (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent';
};

export const ContextMenu: React.FC = () => {
  const contextMenu = useProjectStore((s) => s.contextMenu);
  const setContextMenu = useProjectStore((s) => s.setContextMenu);
  const setCroppingElement = useProjectStore((s) => s.setCroppingElement);
  const updateElement = useProjectStore((s) => s.updateElement);
  const addKeyframe = useProjectStore((s) => s.addKeyframe);
  const addAnimation = useProjectStore((s) => s.addAnimation);
  const addEffect = useProjectStore((s) => s.addEffect);
  const lastDragStartPosition = useProjectStore((s) => s.lastDragStartPosition);
  const setLastDragStartPosition = useProjectStore((s) => s.setLastDragStartPosition);
  const project = useProjectStore((s) => s.project);
  const selectedElementIds = useProjectStore((s) => s.selectedElementIds);
  const menuRef = useRef<HTMLDivElement>(null);
  const [animSubmenu, setAnimSubmenu] = useState(false);
  const [effectSubmenu, setEffectSubmenu] = useState(false);

  useEffect(() => {
    if (!contextMenu) {
      setAnimSubmenu(false);
      setEffectSubmenu(false);
      return;
    }
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [contextMenu, setContextMenu]);

  if (!contextMenu) return null;

  const element = project.elements.find((el) => el.id === contextMenu.elementId);
  if (!element) return null;

  const isMultiSelect = selectedElementIds.length > 1;
  const targetIds = isMultiSelect ? selectedElementIds : [contextMenu.elementId];

  const applyAnimation = (presetName: AnimationPresetName) => {
    const preset = animationPresets[presetName];
    const config: AnimationConfig = {
      preset: presetName,
      delay: 0,
      duration: preset.defaultDuration,
      easing: 'easeOut',
    };
    for (const id of targetIds) {
      addAnimation(id, config);
    }
    setContextMenu(null);
  };

  const hasClip = element.clip &&
    (element.clip.top > 0 || element.clip.right > 0 || element.clip.bottom > 0 || element.clip.left > 0);

  const hasDragMovement = lastDragStartPosition
    && lastDragStartPosition.elementId === contextMenu.elementId
    && (lastDragStartPosition.x !== element.position.x || lastDragStartPosition.y !== element.position.y);

  const applyEffect = (type: EffectType) => {
    const effect: Effect = { type, intensity: 1.0, speed: 1.0, enabled: true };
    for (const id of targetIds) {
      addEffect(id, effect);
    }
    setContextMenu(null);
  };

  // --- Effect submenu view ---
  if (effectSubmenu) {
    const allTypes: EffectType[] = [
      'float', 'pulse', 'wobble', 'spin', 'bounce', 'shake', 'heartbeat',
      'glow', 'neonFlicker', 'shine', 'rainbow', 'blink',
      'tilt3d', 'glitch',
      'ripple', 'heatShimmer', 'emboss', 'pixelate', 'chromaSplit', 'morphBlur',
      'hologram', 'electrified',
    ];
    return ReactDOM.createPortal(
      <div
        ref={menuRef}
        style={{
          position: 'fixed',
          top: contextMenu.y,
          left: contextMenu.x,
          backgroundColor: 'var(--ae-bg-panel)',
          border: '1px solid var(--ae-border)',
          borderRadius: 6,
          padding: '4px 0',
          minWidth: 220,
          zIndex: 100000,
          boxShadow: 'var(--ae-shadow-floating)',
        }}
      >
        <div
          onClick={() => setEffectSubmenu(false)}
          onMouseEnter={hoverIn}
          onMouseLeave={hoverOut}
          style={{
            ...menuItemStyle,
            color: 'var(--ae-text-muted)',
            fontSize: 12,
            borderBottom: '1px solid var(--ae-border)',
            marginBottom: 4,
          }}
        >
          ← Zurück
        </div>
        <div style={{
          padding: '4px 16px 8px',
          fontSize: 11,
          color: 'var(--ae-text-muted)',
          fontWeight: 600,
        }}>
          Effekt auf {targetIds.length} Element{targetIds.length > 1 ? 'e' : ''} anwenden
        </div>
        {allTypes.map((type) => {
          const def = EFFECT_DEFINITIONS[type];
          return (
            <div
              key={type}
              onClick={() => applyEffect(type)}
              onMouseEnter={hoverIn}
              onMouseLeave={hoverOut}
              style={{ ...menuItemStyle }}
            >
              <FontAwesomeIcon icon={def.icon} style={{ width: 14, marginRight: 6 }} />{def.displayName}
              <span style={{ fontSize: 11, color: 'var(--ae-text-muted)', marginLeft: 8 }}>
                {def.description}
              </span>
            </div>
          );
        })}
      </div>,
      document.body
    );
  }

  // --- Animation submenu view ---
  if (animSubmenu) {
    return ReactDOM.createPortal(
      <div
        ref={menuRef}
        style={{
          position: 'fixed',
          top: contextMenu.y,
          left: contextMenu.x,
          backgroundColor: 'var(--ae-bg-panel)',
          border: '1px solid var(--ae-border)',
          borderRadius: 6,
          padding: '4px 0',
          minWidth: 240,
          maxHeight: '70vh',
          overflowY: 'auto',
          zIndex: 100000,
          boxShadow: 'var(--ae-shadow-floating)',
        }}
      >
        {/* Back button */}
        <div
          onClick={() => setAnimSubmenu(false)}
          onMouseEnter={hoverIn}
          onMouseLeave={hoverOut}
          style={{
            ...menuItemStyle,
            color: 'var(--ae-text-muted)',
            fontSize: 12,
            borderBottom: '1px solid var(--ae-border)',
            marginBottom: 4,
          }}
        >
          ← Zurück
        </div>

        {/* Header */}
        <div style={{
          padding: '4px 16px 8px',
          fontSize: 11,
          color: 'var(--ae-text-muted)',
          fontWeight: 600,
        }}>
          Animation auf {targetIds.length} Element{targetIds.length > 1 ? 'e' : ''} anwenden
        </div>

        {/* "None" option to clear */}
        <div
          onClick={() => {
            const config: AnimationConfig = {
              preset: 'none',
              delay: 0,
              duration: 600,
              easing: 'easeOut',
            };
            for (const id of targetIds) {
              addAnimation(id, config);
            }
            setContextMenu(null);
          }}
          onMouseEnter={hoverIn}
          onMouseLeave={hoverOut}
          style={{
            ...menuItemStyle,
            color: 'var(--ae-text-muted)',
            fontStyle: 'italic',
          }}
        >
          Keine Animation
        </div>

        <div style={{ height: 1, backgroundColor: 'var(--ae-border)', margin: '4px 0' }} />

        {/* Categories with presets */}
        {presetCategories.filter(cat => cat.presets.some(p => p !== 'none')).map((category) => (
          <React.Fragment key={category.name}>
            <div style={{
              padding: '6px 16px 2px',
              fontSize: 11,
              color: 'var(--ae-accent)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.3px',
            }}>
              {category.name}
            </div>
            {category.presets.filter(p => p !== 'none').map((presetName) => {
              const preset = animationPresets[presetName];
              return (
                <div
                  key={presetName}
                  onClick={() => applyAnimation(presetName)}
                  onMouseEnter={hoverIn}
                  onMouseLeave={hoverOut}
                  style={{
                    ...menuItemStyle,
                    padding: '6px 16px 6px 28px',
                  }}
                >
                  {preset.displayName}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>,
      document.body
    );
  }

  // --- Main context menu ---
  const menuItems: { label: string; onClick: () => void; visible: boolean; color?: string }[] = [];

  // Animation option (always visible - works for single and multi-select)
  menuItems.push({
    label: isMultiSelect
      ? `Animation zuweisen (${selectedElementIds.length} Elemente) →`
      : 'Animation zuweisen →',
    onClick: () => setAnimSubmenu(true),
    visible: true,
  });

  // Effect option (always visible)
  menuItems.push({
    label: isMultiSelect
      ? `Effekt zuweisen (${selectedElementIds.length} Elemente) →`
      : 'Effekt zuweisen →',
    onClick: () => setEffectSubmenu(true),
    visible: true,
  });

  // Single-element options
  if (!isMultiSelect) {
    menuItems.push({
      label: 'Bewegung hierher',
      onClick: () => {
        if (!lastDragStartPosition) return;
        const existingKfs = element.keyframes || [];

        if (existingKfs.length > 0) {
          const lastKf = existingKfs[existingKfs.length - 1];
          addKeyframe(contextMenu.elementId, {
            time: lastKf.time + 1000,
            x: element.position.x,
            y: element.position.y,
          });
        } else {
          const anims = getAnimations(element);
          const animEnd = anims.reduce((max, a) => Math.max(max, (a.delay || 0) + (a.duration || 600)), 0);
          const startTime = Math.max(animEnd, 0);

          addKeyframe(contextMenu.elementId, {
            time: startTime,
            x: lastDragStartPosition.x,
            y: lastDragStartPosition.y,
          });
          addKeyframe(contextMenu.elementId, {
            time: startTime + 1000,
            x: element.position.x,
            y: element.position.y,
          });
        }

        setLastDragStartPosition(null);
        setContextMenu(null);
      },
      visible: !!hasDragMovement,
    });

    menuItems.push({
      label: 'Zuschneiden',
      onClick: () => {
        setCroppingElement(contextMenu.elementId);
        setContextMenu(null);
      },
      visible: true,
    });

    menuItems.push({
      label: 'Zuschnitt zurücksetzen',
      onClick: () => {
        updateElement(contextMenu.elementId, { clip: undefined });
        setCroppingElement(null);
        setContextMenu(null);
      },
      visible: !!hasClip,
    });
  }

  const visibleItems = menuItems.filter((item) => item.visible);

  return ReactDOM.createPortal(
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: contextMenu.y,
        left: contextMenu.x,
        backgroundColor: 'var(--ae-bg-panel)',
        border: '1px solid var(--ae-border)',
        borderRadius: 6,
        padding: '4px 0',
        minWidth: 220,
        zIndex: 100000,
        boxShadow: 'var(--ae-shadow-floating)',
      }}
    >
      {visibleItems.map((item, i) => (
        <div
          key={i}
          onClick={item.onClick}
          style={{
            ...menuItemStyle,
            color: item.color || 'var(--ae-text-primary)',
          }}
          onMouseEnter={hoverIn}
          onMouseLeave={hoverOut}
        >
          {item.label}
        </div>
      ))}
    </div>,
    document.body
  );
};
