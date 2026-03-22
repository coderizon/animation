import { Suspense, lazy, useState, useEffect, useRef } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { AssetLibrary } from './components/AssetLibrary';
import { Canvas } from './Canvas';
import { ResizablePanel } from './components/ResizablePanel';
import { PropertiesPanel } from './PropertiesPanel';
import { KeyboardShortcutsOverlay } from './components/KeyboardShortcutsOverlay';
import { Timeline } from './components/Timeline';
import { SceneBar } from './components/SceneBar';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { ErrorBoundary } from './components/ErrorBoundary';
const LazyScriptPanel = lazy(() =>
  import('./components/ScriptPanel').then((m) => ({ default: m.ScriptPanel })),
);
import {
  createImageInsert,
  createShapeInsert,
  createTextInsert,
  createWidgetInsert,
} from './insertPresets';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ShapeGalleryPopover } from './components/ShapeGalleryPopover';
import { ShapeInsertDef } from './insertPresets';
import { getAllWidgets } from '../widgets/registry';

const LazyTemplateSelector = lazy(() =>
  import('./components/TemplateSelector').then((module) => ({
    default: module.TemplateSelector,
  })),
);

const AE_ACCENT = 'var(--ae-accent)';
const AE_ACCENT_STRONG = 'var(--ae-accent-strong)';
const AE_BORDER = 'var(--ae-border)';

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
  const [timelineHeight, setTimelineHeight] = useState(320);
  const [isResizingTimeline, setIsResizingTimeline] = useState(false);
  const [activeRibbonTab, setActiveRibbonTab] = useState<'start' | 'insert' | 'animation' | 'view' | 'script'>('insert');
  const [assetLibraryView, setAssetLibraryView] = useState<'logos' | 'widgets' | 'images' | null>(null);
  const [showShapeGallery, setShowShapeGallery] = useState(false);
  const [showScriptPanel, setShowScriptPanel] = useState(true);

  const timelineRef = useRef<HTMLDivElement>(null);
  const shapeGalleryButtonRef = useRef<HTMLButtonElement>(null);
  const logosButtonRef = useRef<HTMLButtonElement>(null);
  const widgetsButtonRef = useRef<HTMLButtonElement>(null);
  const imagesButtonRef = useRef<HTMLButtonElement>(null);
  const quickWidgets = getAllWidgets().slice(0, 3);

  useEffect(() => {
    if (!isResizingTimeline) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return;
      const containerBottom = timelineRef.current.getBoundingClientRect().bottom;
      const newHeight = containerBottom - e.clientY;
      setTimelineHeight(Math.max(84, Math.min(320, newHeight)));
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

  const handleRibbonTabChange = (tab: 'start' | 'insert' | 'animation' | 'view' | 'script') => {
    if (tab === 'script') {
      setShowScriptPanel((v) => !v);
      return;
    }
    setActiveRibbonTab(tab);
    setShowShapeGallery(false);
    setAssetLibraryView(null);
  };

  const handleAssetLibraryToggle = (view: 'logos' | 'widgets' | 'images') => {
    setShowShapeGallery(false);
    setAssetLibraryView((current) => (current === view ? null : view));
  };

  const handleInsertText = () => {
    addElement(createTextInsert(project));
  };

  const handleInsertImage = () => {
    addElement(createImageInsert(project));
  };

  const handleInsertShape = (shape: ShapeInsertDef) => {
    addElement(createShapeInsert(project, shape));
    setShowShapeGallery(false);
  };

  const handleInsertWidget = (widgetName: string) => {
    const widget = getAllWidgets().find((entry) => entry.name === widgetName);
    if (!widget) return;
    addElement(createWidgetInsert(project, widget));
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
                icon={<FontAwesomeIcon icon={widget.icon} />}
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
              text="Animationen steuerst du ueber den linken Eigenschaftenbereich und die Timeline."
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
      backgroundColor: 'var(--ae-bg-base)',
    }}>
      {/* Ribbon */}
      <div style={{
        backgroundColor: 'var(--ae-bg-panel)',
        borderBottom: `1px solid ${AE_BORDER}`,
        boxShadow: 'var(--ae-shadow-elevated)',
      }}>
        <div style={{
          height: 42,
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          padding: '0 12px',
          borderBottom: `1px solid ${AE_BORDER}`,
        }}>
          <button
            style={{
              height: 28,
              padding: '0 12px',
              borderRadius: 4,
              border: `1px solid ${AE_BORDER}`,
              backgroundColor: 'var(--ae-bg-panel-raised)',
              color: 'var(--ae-text-primary)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'default',
            }}
          >
            Datei
          </button>

          <div style={{ display: 'flex', alignItems: 'stretch', gap: 16, height: '100%' }}>
            <RibbonTab label="Start" active={activeRibbonTab === 'start'} onClick={() => handleRibbonTabChange('start')} />
            <RibbonTab label="Einfügen" active={activeRibbonTab === 'insert'} onClick={() => handleRibbonTabChange('insert')} />
            <StaticHeaderTab label="Zeichnen" />
            <StaticHeaderTab label="Entwurf" />
            <StaticHeaderTab label="Übergänge" />
            <RibbonTab label="Animationen" active={activeRibbonTab === 'animation'} onClick={() => handleRibbonTabChange('animation')} />
            <RibbonTab label="Ansicht" active={activeRibbonTab === 'view'} onClick={() => handleRibbonTabChange('view')} />
            <RibbonTab label="Skript" active={showScriptPanel} onClick={() => handleRibbonTabChange('script')} />
            <StaticHeaderTab label="Hilfe" />
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <HeaderActionButton
              buttonRef={logosButtonRef}
              label="Logos"
              active={assetLibraryView === 'logos'}
              onClick={() => handleAssetLibraryToggle('logos')}
            />
            <HeaderActionButton
              buttonRef={imagesButtonRef}
              label="Bilder"
              active={assetLibraryView === 'images'}
              onClick={() => handleAssetLibraryToggle('images')}
            />
            <HeaderActionButton
              buttonRef={widgetsButtonRef}
              label="Widgets"
              active={assetLibraryView === 'widgets'}
              onClick={() => handleAssetLibraryToggle('widgets')}
            />
            <div style={{ fontSize: 12, color: 'var(--ae-text-muted)' }}>
              {project.name}
            </div>
            <button
              onClick={onOpenPlayer}
              style={{
                height: 30,
                padding: '0 14px',
                backgroundColor: AE_ACCENT,
                color: 'var(--ae-gray-900)',
                border: `1px solid ${AE_ACCENT}`,
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Vorschau
            </button>
          </div>
        </div>

        <div style={{
          padding: '2px 10px 1px',
          display: 'flex',
          gap: 0,
          alignItems: 'stretch',
          overflowX: 'auto',
          backgroundColor: 'var(--ae-bg-panel-muted)',
        }}>
          {renderRibbonContent()}
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
        backgroundColor: 'var(--ae-bg-shell)',
      }}>
        <ResizablePanel
          defaultWidth={290}
          minWidth={230}
          maxWidth={380}
          position="left"
          backgroundColor="var(--ae-bg-panel)"
          borderColor={AE_BORDER}
          padding={0}
        >
          <div style={{ padding: 8 }}>
            <ErrorBoundary fallbackLabel="Properties">
              <PropertiesPanel />
            </ErrorBoundary>
          </div>
        </ResizablePanel>

        {/* Canvas Area (Center) */}
        <ErrorBoundary fallbackLabel="Canvas">
          <Canvas />
        </ErrorBoundary>

        {/* Script Panel (Right side, toggleable) */}
        {showScriptPanel && (
          <Suspense fallback={null}>
            <div style={{ width: 480, flexShrink: 0, overflow: 'hidden' }}>
              <LazyScriptPanel />
            </div>
          </Suspense>
        )}
      </div>

      {/* Scene Bar */}
      <SceneBar />

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
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--ae-accent-overlay)'; }}
          onMouseLeave={(e) => { if (!isResizingTimeline) e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          <div style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 40,
            height: 2,
            backgroundColor: isResizingTimeline ? AE_ACCENT : 'var(--ae-gray-400)',
            borderRadius: 2,
            opacity: isResizingTimeline ? 1 : 0.5,
          }} />
        </div>
        <ErrorBoundary fallbackLabel="Timeline">
          <Timeline />
        </ErrorBoundary>
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

      />

      <AssetLibrary
        anchorRef={assetLibraryView === 'widgets' ? widgetsButtonRef : assetLibraryView === 'images' ? imagesButtonRef : logosButtonRef}
        isOpen={assetLibraryView !== null}
        activeView={assetLibraryView ?? 'logos'}
        onChangeView={setAssetLibraryView}
        onClose={() => setAssetLibraryView(null)}
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
        height: '100%',
        padding: '0 2px',
        borderRadius: 0,
        border: 'none',
        backgroundColor: 'transparent',
        color: active ? 'var(--ae-text-primary)' : 'var(--ae-text-secondary)',
        fontSize: 13,
        fontWeight: active ? 600 : 500,
        cursor: 'pointer',
        borderBottom: active ? `2px solid ${AE_ACCENT}` : '2px solid transparent',
      }}
    >
      {label}
    </button>
  );
};

const StaticHeaderTab: React.FC<{ label: string }> = ({ label }) => {
  return (
    <span style={{
      height: '100%',
      display: 'inline-flex',
      alignItems: 'center',
      color: 'var(--ae-text-muted)',
      fontSize: 13,
      fontWeight: 500,
      borderBottom: '2px solid transparent',
    }}>
      {label}
    </span>
  );
};

interface HeaderActionButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  buttonRef?: React.Ref<HTMLButtonElement>;
}

const HeaderActionButton: React.FC<HeaderActionButtonProps> = ({
  label,
  active,
  onClick,
  buttonRef,
}) => {
  return (
    <button
      ref={buttonRef}
      onClick={onClick}
      style={{
        height: 30,
        padding: '0 12px',
        borderRadius: 4,
        border: `1px solid ${active ? AE_ACCENT : AE_BORDER}`,
        backgroundColor: active ? 'var(--ae-accent-overlay)' : 'var(--ae-bg-panel-raised)',
        color: active ? AE_ACCENT_STRONG : 'var(--ae-text-primary)',
        fontSize: 12,
        fontWeight: 600,
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
      padding: '3px 10px 2px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      justifyContent: 'space-between',
      flexShrink: 0,
      borderRight: `1px solid ${AE_BORDER}`,
    }}>
      <div style={{ display: 'flex', gap: 4, alignItems: 'stretch' }}>
        {children}
      </div>
      <div style={{
        fontSize: 8,
        color: 'var(--ae-text-muted)',
        textAlign: 'center',
        fontWeight: 500,
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
      backgroundColor: active ? 'var(--ae-accent-overlay)' : 'var(--ae-bg-panel-raised)',
      border: active ? AE_ACCENT : AE_BORDER,
      color: active ? AE_ACCENT_STRONG : 'var(--ae-text-primary)',
    },
    blue: { backgroundColor: AE_ACCENT, border: AE_ACCENT, color: 'var(--ae-gray-900)' },
    dark: { backgroundColor: 'var(--ae-bg-panel-raised)', border: AE_BORDER, color: 'var(--ae-text-primary)' },
    amber: { backgroundColor: 'var(--ae-notice)', border: 'var(--ae-notice)', color: 'var(--ae-gray-900)' },
    green: { backgroundColor: 'var(--ae-positive)', border: 'var(--ae-positive)', color: 'var(--ae-gray-900)' },
    danger: { backgroundColor: 'var(--ae-danger)', border: 'var(--ae-danger)', color: 'var(--ae-gray-900)' },
  } as const;

  const palette = tones[tone];

  return (
    <button
      ref={buttonRef}
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: 42,
        minHeight: 30,
        borderRadius: 4,
        border: `1px solid ${palette.border}`,
        backgroundColor: disabled ? 'var(--ae-bg-panel-muted)' : palette.backgroundColor,
        color: disabled ? 'var(--ae-text-disabled)' : palette.color,
        padding: '2px 5px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 2,
        cursor: disabled ? 'not-allowed' : 'pointer',
        textAlign: 'center',
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 12, lineHeight: 1 }}>{icon}</span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
        <span style={{ fontSize: 8, fontWeight: 600, lineHeight: 1.05 }}>{label}</span>
        {caption && <span style={{ fontSize: 7, opacity: 0.78, lineHeight: 1 }}>{caption}</span>}
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
      width: 188,
      padding: '8px 12px',
      borderRadius: 8,
      backgroundColor: 'var(--ae-bg-panel-raised)',
      border: `1px solid ${AE_BORDER}`,
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      justifyContent: 'space-between',
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ae-text-primary)' }}>{headline}</div>
      <div style={{ fontSize: 10, color: 'var(--ae-text-secondary)', lineHeight: 1.35 }}>{text}</div>
    </div>
  );
};
