import { Suspense, lazy, useState, useEffect, useRef } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { AssetLibrary } from './components/AssetLibrary';
import { Canvas } from './Canvas';
import { ResizablePanel } from './components/ResizablePanel';
import { PropertiesPanel } from './PropertiesPanel';
import { KeyboardShortcutsOverlay } from './components/KeyboardShortcutsOverlay';
import { Timeline } from './components/Timeline';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import {
  createImageInsert,
  createShapeInsert,
  createTextInsert,
  createWidgetInsert,
  quickShapeIds,
} from './insertPresets';
import { ShapeGalleryPopover } from './components/ShapeGalleryPopover';
import { ShapeInsertDef } from './insertPresets';
import { getAllWidgets } from '../widgets/registry';

const LazyTemplateSelector = lazy(() =>
  import('./components/TemplateSelector').then((module) => ({
    default: module.TemplateSelector,
  })),
);

interface EditorLayoutProps {
  onOpenPlayer: () => void;
}

export const EditorLayout: React.FC<EditorLayoutProps> = ({ onOpenPlayer }) => {
  const project = useProjectStore((state) => state.project);
  const addElement = useProjectStore((state) => state.addElement);
  const exportProject = useProjectStore((state) => state.exportProject);
  const importProject = useProjectStore((state) => state.importProject);
  const resetProject = useProjectStore((state) => state.resetProject);
  const playAllAnimations = useProjectStore((state) => state.playAllAnimations);
  const pauseAllAnimations = useProjectStore((state) => state.pauseAllAnimations);
  const stopAllAnimations = useProjectStore((state) => state.stopAllAnimations);
  const playbackState = useProjectStore((state) => state.playbackState);
  const undo = useProjectStore((state) => state.undo);
  const redo = useProjectStore((state) => state.redo);
  const canUndo = useProjectStore((state) => state.canUndo());
  const canRedo = useProjectStore((state) => state.canRedo());
  const selectedElementIds = useProjectStore((state) => state.selectedElementIds);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [timelineHeight, setTimelineHeight] = useState(200);
  const [isResizingTimeline, setIsResizingTimeline] = useState(false);
  const [activeRibbonTab, setActiveRibbonTab] = useState<'start' | 'insert' | 'animation' | 'view'>('insert');
  const [libraryView, setLibraryView] = useState<'logos' | 'widgets'>('logos');
  const [showShapeGallery, setShowShapeGallery] = useState(false);
  const [recentShapeIds, setRecentShapeIds] = useState<string[]>(quickShapeIds);
  const timelineRef = useRef<HTMLDivElement>(null);
  const shapeGalleryButtonRef = useRef<HTMLButtonElement>(null);
  const quickWidgets = getAllWidgets().slice(0, 3);

  useEffect(() => {
    if (!isResizingTimeline) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return;
      const containerBottom = timelineRef.current.getBoundingClientRect().bottom;
      const newHeight = containerBottom - e.clientY;
      setTimelineHeight(Math.max(60, Math.min(500, newHeight)));
    };

    const handleMouseUp = () => setIsResizingTimeline(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingTimeline]);

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

  const handleRibbonTabChange = (tab: 'start' | 'insert' | 'animation' | 'view') => {
    setActiveRibbonTab(tab);
    setShowShapeGallery(false);
  };

  const rememberShape = (shapeId: string) => {
    setRecentShapeIds((current) => [shapeId, ...current.filter((id) => id !== shapeId)].slice(0, 6));
  };

  const handleInsertText = () => {
    addElement(createTextInsert(project));
  };

  const handleInsertImage = () => {
    addElement(createImageInsert(project));
  };

  const handleInsertShape = (shape: ShapeInsertDef) => {
    addElement(createShapeInsert(project, shape));
    rememberShape(shape.id);
    setShowShapeGallery(false);
  };

  const handleInsertWidget = (widgetName: string) => {
    const widget = getAllWidgets().find((entry) => entry.name === widgetName);
    if (!widget) return;
    addElement(createWidgetInsert(project, widget));
    setLibraryView('widgets');
  };

  const renderRibbonContent = () => {
    if (activeRibbonTab === 'start') {
      return (
        <>
          <RibbonGroup title="Projekt">
            <RibbonButton icon="＋" label="Neu" onClick={handleNewProject} />
            <RibbonButton icon="▦" label="Templates" onClick={() => setShowTemplateSelector(true)} />
            <RibbonButton icon="⇪" label="Import" onClick={handleImport} />
            <RibbonButton icon="⇩" label="Export" tone="blue" onClick={handleExport} />
          </RibbonGroup>

          <RibbonGroup title="Verlauf">
            <RibbonButton icon="↩" label="Undo" disabled={!canUndo} onClick={undo} />
            <RibbonButton icon="↪" label="Redo" disabled={!canRedo} onClick={redo} />
          </RibbonGroup>

          <RibbonGroup title="Bibliothek">
            <RibbonButton icon="◧" label="Logos" active={libraryView === 'logos'} onClick={() => setLibraryView('logos')} />
            <RibbonButton icon="◫" label="Widgets" active={libraryView === 'widgets'} onClick={() => setLibraryView('widgets')} />
          </RibbonGroup>
        </>
      );
    }

    if (activeRibbonTab === 'insert') {
      return (
        <>
          <RibbonGroup title="Text & Bild">
            <RibbonButton icon="T" label="Text" onClick={handleInsertText} />
            <RibbonButton icon="▣" label="Bild" onClick={handleInsertImage} />
          </RibbonGroup>

          <RibbonGroup title="Formen">
            <RibbonButton
              buttonRef={shapeGalleryButtonRef}
              icon="⬡"
              label="Formen"
              caption="Galerie"
              active={showShapeGallery}
              onClick={() => setShowShapeGallery((current) => !current)}
            />
          </RibbonGroup>

          <RibbonGroup title="Widgets">
            {quickWidgets.map((widget) => (
              <RibbonButton
                key={widget.name}
                icon={widget.icon}
                label={
                  widget.name === 'networkVisualization'
                    ? 'Network'
                    : widget.name === 'serverAnimation'
                      ? 'Server'
                      : 'Neural'
                }
                onClick={() => handleInsertWidget(widget.name)}
              />
            ))}
          </RibbonGroup>

          <RibbonGroup title="Bibliothek">
            <RibbonButton icon="◧" label="Logos" active={libraryView === 'logos'} onClick={() => setLibraryView('logos')} />
            <RibbonButton icon="◫" label="Widgets" active={libraryView === 'widgets'} onClick={() => setLibraryView('widgets')} />
          </RibbonGroup>
        </>
      );
    }

    if (activeRibbonTab === 'animation') {
      return (
        <>
          <RibbonGroup title="Playback">
            <RibbonButton
              icon={playbackState === 'playing' ? '⏸' : '▶'}
              label={playbackState === 'playing' ? 'Pause' : playbackState === 'paused' ? 'Weiter' : 'Play'}
              tone={playbackState === 'playing' ? 'amber' : playbackState === 'paused' ? 'green' : 'default'}
              onClick={playbackState === 'playing' ? pauseAllAnimations : playAllAnimations}
            />
            <RibbonButton icon="■" label="Stop" tone="danger" disabled={playbackState === 'stopped'} onClick={stopAllAnimations} />
            <RibbonButton icon="▣" label="Vorschau" tone="dark" onClick={onOpenPlayer} />
          </RibbonGroup>

          <RibbonGroup title="Auswahl">
            <RibbonInfoCard
              headline={selectedElementIds.length > 0 ? `${selectedElementIds.length} Elemente aktiv` : 'Keine Auswahl'}
              text="Animationen steuerst du weiter im rechten Eigenschaftenbereich und in der Timeline."
            />
          </RibbonGroup>
        </>
      );
    }

    return (
      <>
        <RibbonGroup title="Arbeitsbereich">
          <RibbonButton icon="?" label="Shortcuts" onClick={() => setShowKeyboardShortcuts(true)} />
          <RibbonButton icon="▦" label="Templates" onClick={() => setShowTemplateSelector(true)} />
          <RibbonButton icon="▣" label="Vorschau" tone="dark" onClick={onOpenPlayer} />
        </RibbonGroup>

        <RibbonGroup title="Bibliothek">
          <RibbonButton icon="◧" label="Logos" active={libraryView === 'logos'} onClick={() => setLibraryView('logos')} />
          <RibbonButton icon="◫" label="Widgets" active={libraryView === 'widgets'} onClick={() => setLibraryView('widgets')} />
        </RibbonGroup>

        <RibbonGroup title="Projekt">
          <RibbonInfoCard
            headline={project.name}
            text={`${project.elements.length} Elemente auf dem Canvas. Ribbon reduziert die Dauerwerkzeuge auf die aktuelle Aufgabe.`}
          />
        </RibbonGroup>
      </>
    );
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#f0f1f5',
    }}>
      {/* Ribbon */}
      <div style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #d0d5dd',
        boxShadow: '0 6px 20px rgba(16, 24, 40, 0.06)',
      }}>
        <div style={{
          height: 40,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '0 14px',
          borderBottom: '1px solid #eaecf0',
        }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#101828', letterSpacing: '-0.03em' }}>
            Animation Builder
          </div>

          <div style={{ display: 'flex', gap: 4 }}>
            <RibbonTab label="Start" active={activeRibbonTab === 'start'} onClick={() => handleRibbonTabChange('start')} />
            <RibbonTab label="Einfügen" active={activeRibbonTab === 'insert'} onClick={() => handleRibbonTabChange('insert')} />
            <RibbonTab label="Animation" active={activeRibbonTab === 'animation'} onClick={() => handleRibbonTabChange('animation')} />
            <RibbonTab label="Ansicht" active={activeRibbonTab === 'view'} onClick={() => handleRibbonTabChange('view')} />
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 12, color: '#667085' }}>
              {project.name}
            </div>
            <button
              onClick={onOpenPlayer}
              style={{
                padding: '6px 12px',
                backgroundColor: '#111827',
                color: '#fff',
                border: '1px solid #111827',
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Vorschau
            </button>
          </div>
        </div>

        <div style={{
          padding: '8px 14px 6px',
          display: 'flex',
          gap: 8,
          alignItems: 'stretch',
          overflowX: 'auto',
          background: 'linear-gradient(180deg, #fcfcfd 0%, #f8fafc 100%)',
        }}>
          {renderRibbonContent()}
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
      }}>
        {/* Sidebar (Left) - Resizable */}
        <ResizablePanel defaultWidth={225} minWidth={150} maxWidth={700} position="left">
          <h2 style={{ fontSize: 16, marginBottom: 15, color: '#1a1a2e' }}>
            Library
          </h2>
          <AssetLibrary activeView={libraryView} onChangeView={setLibraryView} />
        </ResizablePanel>

        {/* Canvas Area (Center) */}
        <Canvas />

        {/* Properties Panel (Right) - Resizable */}
        <ResizablePanel defaultWidth={280} minWidth={150} maxWidth={600} position="right">
          <h2 style={{ fontSize: 16, marginBottom: 15, color: '#1a1a2e' }}>
            Properties
          </h2>
          <PropertiesPanel />
        </ResizablePanel>
      </div>

      {/* Timeline */}
      <div ref={timelineRef} style={{ position: 'relative', height: timelineHeight, flexShrink: 0 }}>
        {/* Resize Handle */}
        <div
          onMouseDown={(e) => { e.preventDefault(); setIsResizingTimeline(true); }}
          style={{
            position: 'absolute',
            top: -4,
            left: 0,
            right: 0,
            height: 8,
            cursor: 'ns-resize',
            zIndex: 10,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(33, 150, 243, 0.3)'; }}
          onMouseLeave={(e) => { if (!isResizingTimeline) e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          <div style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 40,
            height: 2,
            backgroundColor: isResizingTimeline ? '#2196F3' : '#b0b0c0',
            borderRadius: 2,
            opacity: isResizingTimeline ? 1 : 0.5,
          }} />
        </div>
        <Timeline />
      </div>

      {/* Status Bar */}
      <div style={{
        height: 30,
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e0e0e8',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        fontSize: 12,
        color: '#999',
      }}>
        Elements: {project.elements.length} | Ready
      </div>

      {/* Template Selector Modal */}
      {showTemplateSelector && (
        <Suspense fallback={null}>
          <LazyTemplateSelector
            isOpen={showTemplateSelector}
            onClose={() => setShowTemplateSelector(false)}
          />
        </Suspense>
      )}

      <ShapeGalleryPopover
        anchorRef={shapeGalleryButtonRef}
        isOpen={showShapeGallery}
        onClose={() => setShowShapeGallery(false)}
        onSelectShape={handleInsertShape}
        recentShapeIds={recentShapeIds}
      />

      {/* Keyboard Shortcuts Overlay */}
      <KeyboardShortcutsOverlay
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
      />
    </div>
  );
};

interface RibbonTabProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

const RibbonTab: React.FC<RibbonTabProps> = ({ label, active, onClick }) => {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 10px',
        borderRadius: 8,
        border: 'none',
        backgroundColor: active ? '#eef2ff' : 'transparent',
        color: active ? '#1d4ed8' : '#475467',
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
};

interface RibbonGroupProps {
  title: string;
  children: React.ReactNode;
}

const RibbonGroup: React.FC<RibbonGroupProps> = ({ title, children }) => {
  return (
    <div style={{
      minWidth: 0,
      padding: '7px 8px 6px',
      borderRadius: 10,
      backgroundColor: '#ffffff',
      border: '1px solid #e4e7ec',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      justifyContent: 'space-between',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
        {children}
      </div>
      <div style={{
        fontSize: 9,
        color: '#667085',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontWeight: 700,
      }}>
        {title}
      </div>
    </div>
  );
};

interface RibbonButtonProps {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  caption?: string;
  disabled?: boolean;
  active?: boolean;
  tone?: 'default' | 'blue' | 'dark' | 'amber' | 'green' | 'danger';
  buttonRef?: React.Ref<HTMLButtonElement>;
}

const RibbonButton: React.FC<RibbonButtonProps> = ({
  label,
  onClick,
  icon,
  caption,
  disabled,
  active,
  tone = 'default',
  buttonRef,
}) => {
  const tones = {
    default: {
      backgroundColor: active ? '#eef2ff' : '#f8fafc',
      border: active ? '#c7d7fe' : '#e4e7ec',
      color: active ? '#1d4ed8' : '#344054',
    },
    blue: { backgroundColor: '#2563eb', border: '#2563eb', color: '#ffffff' },
    dark: { backgroundColor: '#111827', border: '#111827', color: '#ffffff' },
    amber: { backgroundColor: '#f59e0b', border: '#f59e0b', color: '#ffffff' },
    green: { backgroundColor: '#16a34a', border: '#16a34a', color: '#ffffff' },
    danger: { backgroundColor: '#dc2626', border: '#dc2626', color: '#ffffff' },
  } as const;

  const palette = tones[tone];

  return (
    <button
      ref={buttonRef}
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: 60,
        minHeight: 48,
        borderRadius: 9,
        border: `1px solid ${palette.border}`,
        backgroundColor: disabled ? '#f2f4f7' : palette.backgroundColor,
        color: disabled ? '#98a2b3' : palette.color,
        padding: '5px 7px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 4,
        cursor: disabled ? 'not-allowed' : 'pointer',
        textAlign: 'center',
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 16, lineHeight: 1 }}>{icon}</span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
        <span style={{ fontSize: 10, fontWeight: 700, lineHeight: 1.1 }}>{label}</span>
        {caption && <span style={{ fontSize: 9, opacity: 0.78, lineHeight: 1 }}>{caption}</span>}
      </span>
    </button>
  );
};

interface RibbonInfoCardProps {
  headline: string;
  text: string;
}

const RibbonInfoCard: React.FC<RibbonInfoCardProps> = ({ headline, text }) => {
  return (
    <div style={{
      width: 180,
      padding: '8px 10px',
      borderRadius: 10,
      backgroundColor: '#f8fafc',
      border: '1px solid #e4e7ec',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      justifyContent: 'space-between',
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#101828' }}>{headline}</div>
      <div style={{ fontSize: 10, color: '#667085', lineHeight: 1.35 }}>{text}</div>
    </div>
  );
};
