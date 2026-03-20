interface KeyboardShortcutsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Shortcut {
  keys: string;
  description: string;
  category: string;
}

const shortcuts: Shortcut[] = [
  // Edit
  { keys: 'Ctrl/Cmd + Z', description: 'Undo', category: 'Edit' },
  { keys: 'Ctrl/Cmd + Shift + Z', description: 'Redo', category: 'Edit' },
  { keys: 'Delete / Backspace', description: 'Delete selected element', category: 'Edit' },

  // Playback
  { keys: 'Space', description: 'Play / Pause umschalten', category: 'Playback' },

  // Navigation
  { keys: 'Esc', description: 'Deselect element', category: 'Navigation' },
  { keys: 'Ctrl/Cmd + A', description: 'Alle Elemente auswählen', category: 'Navigation' },
  { keys: 'Arrow Keys', description: 'Move element by 1px', category: 'Navigation' },
  { keys: 'Shift + Arrow Keys', description: 'Move element by 10px', category: 'Navigation' },

  // Layers
  { keys: 'Ctrl + ]', description: 'Eine Ebene nach vorne', category: 'Layers' },
  { keys: 'Ctrl + [', description: 'Eine Ebene nach hinten', category: 'Layers' },
  { keys: 'Ctrl + Shift + ]', description: 'Ganz nach vorne', category: 'Layers' },
  { keys: 'Ctrl + Shift + [', description: 'Ganz nach hinten', category: 'Layers' },

  // View
  { keys: 'Ctrl/Cmd + +', description: 'Zoom in', category: 'View' },
  { keys: 'Ctrl/Cmd + -', description: 'Zoom out', category: 'View' },
  { keys: 'Ctrl/Cmd + 0', description: 'Fit to screen', category: 'View' },

  // File
  { keys: 'Ctrl/Cmd + S', description: 'Export project', category: 'File' },
  { keys: 'Ctrl/Cmd + O', description: 'Import project', category: 'File' },
  { keys: 'Ctrl/Cmd + N', description: 'New project', category: 'File' },

  // Help
  { keys: '?', description: 'Show this overlay', category: 'Help' },
];

export const KeyboardShortcutsOverlay: React.FC<KeyboardShortcutsOverlayProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const categories = Array.from(new Set(shortcuts.map(s => s.category)));

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'var(--ae-bg-overlay)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--ae-bg-panel)',
          borderRadius: 12,
          padding: 40,
          maxWidth: 700,
          width: '90%',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: 'var(--ae-shadow-floating)',
          border: '1px solid var(--ae-border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 30,
        }}>
          <h2 style={{
            fontSize: 28,
            fontWeight: 700,
            color: 'var(--ae-text-primary)',
            margin: 0,
          }}>
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              backgroundColor: 'transparent',
              color: 'var(--ae-text-muted)',
              border: 'none',
              borderRadius: 6,
              fontSize: 20,
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--ae-bg-panel-raised)';
              e.currentTarget.style.color = 'var(--ae-text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--ae-text-muted)';
            }}
          >
            ✕
          </button>
        </div>

        {/* Shortcuts by Category */}
        {categories.map((category, idx) => (
          <div key={category} style={{ marginBottom: idx < categories.length - 1 ? 30 : 0 }}>
            <h3 style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--ae-text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: 15,
            }}>
              {category}
            </h3>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}>
              {shortcuts
                .filter(s => s.category === category)
                .map((shortcut, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      backgroundColor: 'var(--ae-bg-input)',
                      borderRadius: 8,
                      border: '1px solid var(--ae-border)',
                    }}
                  >
                    <span style={{
                      fontSize: 14,
                      color: 'var(--ae-text-primary)',
                    }}>
                      {shortcut.description}
                    </span>
                    <kbd style={{
                      padding: '4px 12px',
                      backgroundColor: 'var(--ae-bg-panel-raised)',
                      border: '1px solid var(--ae-border)',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--ae-text-primary)',
                      fontFamily: 'monospace',
                      whiteSpace: 'nowrap',
                    }}>
                      {shortcut.keys}
                    </kbd>
                  </div>
                ))}
            </div>
          </div>
        ))}

        {/* Footer */}
        <div style={{
          marginTop: 30,
          paddingTop: 20,
          borderTop: '1px solid var(--ae-border)',
          fontSize: 12,
          color: 'var(--ae-text-muted)',
          textAlign: 'center',
        }}>
          Press <kbd style={{
            padding: '2px 8px',
            backgroundColor: 'var(--ae-bg-panel-raised)',
            border: '1px solid var(--ae-border)',
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--ae-text-secondary)',
            fontFamily: 'monospace',
          }}>?</kbd> or <kbd style={{
            padding: '2px 8px',
            backgroundColor: 'var(--ae-bg-panel-raised)',
            border: '1px solid var(--ae-border)',
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--ae-text-secondary)',
            fontFamily: 'monospace',
          }}>Esc</kbd> to close this overlay
        </div>
      </div>
    </div>
  );
};
