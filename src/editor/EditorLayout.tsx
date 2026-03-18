import { useState, useEffect } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { AssetLibrary } from './components/AssetLibrary';
import { Canvas } from './Canvas';
import { ResizablePanel } from './components/ResizablePanel';
import { PropertiesPanel } from './PropertiesPanel';
import { TemplateSelector } from './components/TemplateSelector';
import { KeyboardShortcutsOverlay } from './components/KeyboardShortcutsOverlay';
import { Timeline } from './components/Timeline';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

export const EditorLayout: React.FC = () => {
  const project = useProjectStore((state) => state.project);
  const exportProject = useProjectStore((state) => state.exportProject);
  const importProject = useProjectStore((state) => state.importProject);
  const resetProject = useProjectStore((state) => state.resetProject);
  const playAllAnimations = useProjectStore((state) => state.playAllAnimations);
  const stopAllAnimations = useProjectStore((state) => state.stopAllAnimations);
  const isPlayingAll = useProjectStore((state) => state.isPlayingAll);
  const undo = useProjectStore((state) => state.undo);
  const redo = useProjectStore((state) => state.redo);
  const canUndo = useProjectStore((state) => state.canUndo());
  const canRedo = useProjectStore((state) => state.canRedo());
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  // Listen for ? key to toggle keyboard shortcuts overlay
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Only trigger if not typing in an input
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setShowKeyboardShortcuts(prev => !prev);
        }
      }
      // ESC to close
      if (e.key === 'Escape' && showKeyboardShortcuts) {
        setShowKeyboardShortcuts(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showKeyboardShortcuts]);

  const handleExport = () => {
    try {
      const json = exportProject();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.replace(/\s+/g, '-').toLowerCase()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Fehler beim Exportieren');
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = event.target?.result as string;
          importProject(json);
        } catch (error) {
          console.error('Import failed:', error);
          alert('Fehler beim Importieren: Ungültige Projektdatei');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleNewProject = () => {
    if (project.elements.length > 0) {
      if (!confirm('Neues Projekt erstellen? Ungespeicherte Änderungen gehen verloren.')) {
        return;
      }
    }
    resetProject();
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#0f0f1e',
    }}>
      {/* Top Toolbar */}
      <div style={{
        height: 60,
        backgroundColor: '#1a1a2e',
        borderBottom: '1px solid #2a2a3e',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 20,
      }}>
        <h1 style={{
          fontSize: 20,
          fontWeight: 600,
          color: '#ffffff',
        }}>
          Animation Builder
        </h1>

        {/* Toolbar Buttons */}
        <div style={{
          display: 'flex',
          gap: 10,
          marginLeft: 'auto',
        }}>
          <button
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            style={{
              width: 36,
              height: 36,
              backgroundColor: 'transparent',
              color: canUndo ? '#ddd' : '#555',
              border: '1px solid #2a2a3e',
              borderRadius: 6,
              fontSize: 16,
              cursor: canUndo ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              if (canUndo) {
                e.currentTarget.style.backgroundColor = '#252538';
                e.currentTarget.style.borderColor = '#4a4a6e';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = '#2a2a3e';
            }}
          >
            ↩
          </button>

          <button
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
            style={{
              width: 36,
              height: 36,
              backgroundColor: 'transparent',
              color: canRedo ? '#ddd' : '#555',
              border: '1px solid #2a2a3e',
              borderRadius: 6,
              fontSize: 16,
              cursor: canRedo ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              if (canRedo) {
                e.currentTarget.style.backgroundColor = '#252538';
                e.currentTarget.style.borderColor = '#4a4a6e';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = '#2a2a3e';
            }}
          >
            ↪
          </button>

          <div style={{
            width: 1,
            height: 30,
            backgroundColor: '#2a2a3e',
          }} />

          <button
            onClick={handleNewProject}
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              color: '#ddd',
              border: '1px solid #2a2a3e',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#252538';
              e.currentTarget.style.borderColor = '#4a4a6e';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = '#2a2a3e';
            }}
          >
            Neu
          </button>

          <button
            onClick={() => setShowTemplateSelector(true)}
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              color: '#ddd',
              border: '1px solid #2a2a3e',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#252538';
              e.currentTarget.style.borderColor = '#4a4a6e';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = '#2a2a3e';
            }}
          >
            Templates
          </button>

          <button
            onClick={isPlayingAll ? stopAllAnimations : playAllAnimations}
            style={{
              padding: '8px 16px',
              backgroundColor: isPlayingAll ? '#4CAF50' : 'transparent',
              color: isPlayingAll ? '#fff' : '#ddd',
              border: isPlayingAll ? '1px solid #4CAF50' : '1px solid #2a2a3e',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            onMouseEnter={(e) => {
              if (!isPlayingAll) {
                e.currentTarget.style.backgroundColor = '#252538';
                e.currentTarget.style.borderColor = '#4a4a6e';
              }
            }}
            onMouseLeave={(e) => {
              if (!isPlayingAll) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = '#2a2a3e';
              }
            }}
          >
            {isPlayingAll ? 'Stop' : 'Play'}
          </button>

          <div style={{
            width: 1,
            height: 30,
            backgroundColor: '#2a2a3e',
          }} />

          <button
            onClick={handleImport}
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              color: '#ddd',
              border: '1px solid #2a2a3e',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#252538';
              e.currentTarget.style.borderColor = '#4a4a6e';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = '#2a2a3e';
            }}
          >
            Import
          </button>

          <button
            onClick={handleExport}
            style={{
              padding: '8px 16px',
              backgroundColor: '#2196F3',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#1976D2';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#2196F3';
            }}
          >
            Export
          </button>

          <div style={{
            width: 1,
            height: 30,
            backgroundColor: '#2a2a3e',
          }} />

          <button
            onClick={() => setShowKeyboardShortcuts(true)}
            style={{
              width: 36,
              height: 36,
              backgroundColor: 'transparent',
              color: '#ddd',
              border: '1px solid #2a2a3e',
              borderRadius: 6,
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#252538';
              e.currentTarget.style.borderColor = '#4a4a6e';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = '#2a2a3e';
            }}
            title="Keyboard Shortcuts (?)"
          >
            ?
          </button>
        </div>

        <div style={{
          fontSize: 14,
          color: '#888',
          marginLeft: 20,
        }}>
          {project.name}
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
      }}>
        {/* Sidebar (Left) - Resizable */}
        <ResizablePanel defaultWidth={450} minWidth={300} maxWidth={700} position="left">
          <h2 style={{ fontSize: 16, marginBottom: 15, color: '#fff' }}>
            Assets
          </h2>
          <AssetLibrary />
        </ResizablePanel>

        {/* Canvas Area (Center) */}
        <Canvas />

        {/* Properties Panel (Right) - Resizable */}
        <ResizablePanel defaultWidth={350} minWidth={280} maxWidth={600} position="right">
          <h2 style={{ fontSize: 16, marginBottom: 15, color: '#fff' }}>
            Properties
          </h2>
          <PropertiesPanel />
        </ResizablePanel>
      </div>

      {/* Timeline */}
      <Timeline />

      {/* Status Bar */}
      <div style={{
        height: 30,
        backgroundColor: '#1a1a2e',
        borderTop: '1px solid #2a2a3e',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        fontSize: 12,
        color: '#666',
      }}>
        Elements: {project.elements.length} | Ready
      </div>

      {/* Template Selector Modal */}
      <TemplateSelector
        isOpen={showTemplateSelector}
        onClose={() => setShowTemplateSelector(false)}
      />

      {/* Keyboard Shortcuts Overlay */}
      <KeyboardShortcutsOverlay
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
      />
    </div>
  );
};
