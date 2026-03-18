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

  // Navigation
  { keys: 'Esc', description: 'Deselect element', category: 'Navigation' },
  { keys: 'Arrow Keys', description: 'Move element by 1px', category: 'Navigation' },
  { keys: 'Shift + Arrow Keys', description: 'Move element by 10px', category: 'Navigation' },

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
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
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
          backgroundColor: '#1a1a2e',
          borderRadius: 12,
          padding: 40,
          maxWidth: 700,
          width: '90%',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
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
            color: '#fff',
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
              color: '#888',
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
              e.currentTarget.style.backgroundColor = '#252538';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#888';
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
              color: '#888',
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
                      backgroundColor: '#252538',
                      borderRadius: 8,
                      border: '1px solid #2a2a3e',
                    }}
                  >
                    <span style={{
                      fontSize: 14,
                      color: '#ddd',
                    }}>
                      {shortcut.description}
                    </span>
                    <kbd style={{
                      padding: '4px 12px',
                      backgroundColor: '#1a1a2e',
                      border: '1px solid #333',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#fff',
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
          borderTop: '1px solid #2a2a3e',
          fontSize: 12,
          color: '#666',
          textAlign: 'center',
        }}>
          Press <kbd style={{
            padding: '2px 8px',
            backgroundColor: '#252538',
            border: '1px solid #333',
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 600,
            color: '#888',
            fontFamily: 'monospace',
          }}>?</kbd> or <kbd style={{
            padding: '2px 8px',
            backgroundColor: '#252538',
            border: '1px solid #333',
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 600,
            color: '#888',
            fontFamily: 'monospace',
          }}>Esc</kbd> to close this overlay
        </div>
      </div>
    </div>
  );
};
