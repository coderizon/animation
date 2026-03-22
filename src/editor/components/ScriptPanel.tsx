import React, { useRef, useState, useCallback, useMemo } from 'react';
import Editor, { OnMount, Monaco } from '@monaco-editor/react';
import { createScriptApi, SCRIPT_API_TYPES } from '../scriptApi';
import { generateCodeFromProject } from '../generateCode';
import { useProjectStore } from '../../store/useProjectStore';

const SCRIPT_TEMPLATES: { name: string; code: string }[] = [
  {
    name: '5 Kreise mit Animation',
    code: `// 5 Kreise die nacheinander erscheinen
for (let i = 0; i < 5; i++) {
  const id = api.addElement({
    type: 'shape',
    shape: 'circle',
    x: 200 + i * 300,
    y: 540,
    width: 150,
    height: 150,
    fill: \`hsl(\${i * 60}, 80%, 60%)\`,
  });

  api.addAnimation(id, {
    preset: 'scaleIn',
    delay: i * 400,
    duration: 600,
    easing: 'easeOut',
  });
}

api.log('5 Kreise erstellt!');`,
  },
  {
    name: 'Text-Sequenz',
    code: `// Texte die nacheinander einsliden
const texts = ['Willkommen', 'bei unserem', 'Projekt'];

texts.forEach((text, i) => {
  const id = api.addElement({
    type: 'text',
    text: text,
    x: 960,
    y: 300 + i * 120,
    width: 600,
    height: 80,
    fontSize: 64,
    color: '#ffffff',
  });

  api.addAnimation(id, {
    preset: 'slideInLeft',
    delay: i * 600,
    duration: 800,
    easing: 'easeOut',
  });
});

api.log(texts.length + ' Texte erstellt!');`,
  },
  {
    name: 'Logo-Raster',
    code: `// Raster aus Logos mit versetzter Animation
const cols = 4;
const rows = 3;
const spacing = 200;
const startX = 400;
const startY = 200;

for (let row = 0; row < rows; row++) {
  for (let col = 0; col < cols; col++) {
    const id = api.addElement({
      type: 'shape',
      shape: 'rectangle',
      x: startX + col * spacing,
      y: startY + row * spacing,
      width: 120,
      height: 120,
      fill: '#4a90d9',
      borderRadius: 16,
    });

    const delay = (row * cols + col) * 150;
    api.addAnimation(id, {
      preset: 'fadeIn',
      delay: delay,
      duration: 500,
      easing: 'easeOut',
    });

    // Keyframe: leicht nach oben bewegen
    api.addKeyframe(id, {
      time: delay + 500,
      x: startX + col * spacing,
      y: startY + row * spacing,
    });
    api.addKeyframe(id, {
      time: delay + 1500,
      x: startX + col * spacing,
      y: startY + row * spacing - 30,
    });
  }
}

api.log(cols * rows + ' Elemente im Raster erstellt!');`,
  },
  {
    name: 'Bewegungspfad (Kreis)',
    code: `// Element bewegt sich auf einem Kreispfad
const id = api.addElement({
  type: 'shape',
  shape: 'circle',
  x: 960,
  y: 340,
  width: 80,
  height: 80,
  fill: '#ff6600',
});

api.addAnimation(id, {
  preset: 'scaleIn',
  delay: 0,
  duration: 400,
  easing: 'easeOut',
});

// Kreisförmiger Pfad mit Keyframes
const centerX = 960;
const centerY = 540;
const radius = 200;
const steps = 16;

for (let i = 0; i <= steps; i++) {
  const angle = (i / steps) * Math.PI * 2;
  api.addKeyframe(id, {
    time: 500 + i * 200,
    x: centerX + Math.cos(angle) * radius,
    y: centerY + Math.sin(angle) * radius,
  });
}

api.log('Kreispfad mit ' + steps + ' Keyframes erstellt!');`,
  },
  {
    name: 'Kamera-Zoom Sequenz',
    code: `// Kamera fährt rein und raus
api.addCameraKeyframe({ time: 0, x: 960, y: 540, zoom: 1.0 });
api.addCameraKeyframe({ time: 1500, x: 600, y: 400, zoom: 2.0 });
api.addCameraKeyframe({ time: 3000, x: 1300, y: 600, zoom: 1.5 });
api.addCameraKeyframe({ time: 4500, x: 960, y: 540, zoom: 1.0 });

api.log('Kamera-Sequenz mit 4 Keyframes erstellt!');`,
  },
  {
    name: 'Partikel-Explosion',
    code: `// Viele kleine Elemente fliegen vom Zentrum weg
const count = 20;
const centerX = 960;
const centerY = 540;

for (let i = 0; i < count; i++) {
  const angle = (i / count) * Math.PI * 2;
  const distance = 200 + Math.random() * 300;
  const size = 20 + Math.random() * 40;
  const hue = Math.round(Math.random() * 360);

  const id = api.addElement({
    type: 'shape',
    shape: Math.random() > 0.5 ? 'circle' : 'rectangle',
    x: centerX,
    y: centerY,
    width: size,
    height: size,
    fill: \`hsl(\${hue}, 80%, 60%)\`,
    borderRadius: Math.random() > 0.5 ? 50 : 4,
  });

  api.addAnimation(id, {
    preset: 'scaleIn',
    delay: i * 50,
    duration: 300,
    easing: 'easeOut',
  });

  // Vom Zentrum nach außen fliegen
  api.addKeyframe(id, {
    time: i * 50 + 300,
    x: centerX,
    y: centerY,
  });
  api.addKeyframe(id, {
    time: i * 50 + 1200,
    x: centerX + Math.cos(angle) * distance,
    y: centerY + Math.sin(angle) * distance,
    rotation: Math.random() * 360,
  });
}

api.log(count + ' Partikel erstellt!');`,
  },
];

const DEFAULT_CODE = `// === Szene 1: Server + Inferenz-Engine Logos ===
// === Szene 2: Drei Logos groß verteilt (Morph) ===
// Drücke Strg+Enter zum Ausführen.

// =============================================
// SZENE 1
// =============================================

const serverW = 400;
const serverH = 141;
const server = api.addElement({
  type: 'image', src: '/images/dgxspark.png',
  x: 960 - serverW / 2, y: 220,
  width: serverW, height: serverH, name: 'Server',
});
api.addAnimation(server, { preset: 'scaleIn', delay: 0, duration: 900, easing: 'easeOut' });

const rectW = serverW;
const rectH = 110;
const rectX = 960 - rectW / 2;
const rectY = 570;

const rect = api.addElement({
  type: 'shape', shape: 'rectangle',
  x: rectX, y: rectY, width: rectW, height: rectH,
  fill: 'transparent', stroke: '#ffffff', strokeWidth: 2, borderRadius: 10,
  name: 'Rect Outline',
});
api.addAnimation(rect, { preset: 'strokeDraw', delay: 2000, duration: 700, easing: 'easeOut' });

const logoSize = 70;
const logoY = rectY + (rectH - logoSize) / 2;
const gap = 40;
const vllmX = 960 - gap / 2 - logoSize;
const nvidiaX = 960 + gap / 2;

const vllm = api.addElement({
  type: 'logo', src: '/assets/vllm-color.svg',
  x: vllmX, y: logoY, width: logoSize, height: logoSize, name: 'VLLM',
});
api.addAnimation(vllm, { preset: 'elasticScale', delay: 2800, duration: 800, easing: 'spring' });
api.addEffect(vllm, 'float', 0.4, 0.7);

const nvidia = api.addElement({
  type: 'logo', src: '/assets/nvidia-color.svg',
  x: nvidiaX, y: logoY, width: logoSize, height: logoSize, name: 'Nvidia',
});
api.addAnimation(nvidia, { preset: 'elasticScale', delay: 3100, duration: 800, easing: 'spring' });
api.addEffect(nvidia, 'float', 0.4, 0.7);

const textY = rectY + rectH + 16;
const textDelay = 5100;

const vllmText = api.addElement({
  type: 'text', text: 'vLLM',
  x: vllmX + logoSize / 2 - 50, y: textY, width: 100, height: 36,
  fontSize: 20, color: '#ffffff', name: 'vLLM Label',
});
api.addAnimation(vllmText, { preset: 'fadeIn', delay: textDelay, duration: 500, easing: 'easeOut' });

const nvidiaText = api.addElement({
  type: 'text', text: 'TensorRT-LLM',
  x: nvidiaX + logoSize / 2 - 75, y: textY, width: 150, height: 36,
  fontSize: 20, color: '#76b900', name: 'TensorRT Label',
});
api.addAnimation(nvidiaText, { preset: 'fadeIn', delay: textDelay + 300, duration: 500, easing: 'easeOut' });

const lineDelay = textDelay + 1300;
const lineW = 260;
const lineY = textY + 40;

api.addElement({
  type: 'shape', shape: 'rectangle',
  x: 960 - lineW / 2, y: lineY, width: lineW, height: 2,
  fill: '#ffffff', borderRadius: 1, name: 'Divider Line',
});
api.addAnimation(api.getElementIds().at(-1), { preset: 'wipeRight', delay: lineDelay, duration: 600, easing: 'easeOut' });

api.addElement({
  type: 'text', text: 'Inferenz-Engine',
  x: 960 - 120, y: lineY + 12, width: 240, height: 40,
  fontSize: 18, color: '#888888', name: 'Engine Label',
});
api.addAnimation(api.getElementIds().at(-1), { preset: 'fadeIn', delay: lineDelay + 400, duration: 600, easing: 'easeOut' });

// ---- Neural Net + Logo Karussell über dem Server ----
const nnStartDelay = lineDelay + 1200;
const nnSize = 300;

const neuralNet = api.addElement({
  type: 'widget', widgetName: 'neuralNetServer',
  x: 960 - nnSize / 2, y: 220 - nnSize / 2 + 30,
  width: nnSize, height: nnSize,
  fps: 30, durationInFrames: 300, name: 'Neural Net',
});
api.addAnimation(neuralNet, { preset: 'fadeIn', delay: nnStartDelay, duration: 600, easing: 'easeOut' });

// Logo Karussell im Zentrum des Neuronalen Netzes
const carouselSize = 100;
const logoCarousel = api.addElement({
  type: 'widget', widgetName: 'logoCarousel',
  x: 960 - carouselSize / 2, y: 220 - carouselSize / 2 + 30,
  width: carouselSize, height: carouselSize,
  fps: 30, durationInFrames: 225,
  props: {
    logos: ['/assets/deepseek-color.svg', '/assets/mistral-color.svg', '/assets/claude-color.svg'],
    displayDuration: 1.5,
    transitionDuration: 0.5,
    logoScale: 0.7,
    floatDistance: 15,
  },
  name: 'Logo Karussell',
});
api.addAnimation(logoCarousel, { preset: 'fadeIn', delay: nnStartDelay + 400, duration: 400, easing: 'easeOut' });

// Nach dem Karussell (3 Logos × 2.5s = 7.5s) alles ausblenden
const nnEndDelay = nnStartDelay + 400 + 7500; // ~15500ms
api.addAnimation(neuralNet, { preset: 'fadeOut', delay: nnEndDelay, duration: 500, easing: 'easeOut' });
api.addAnimation(logoCarousel, { preset: 'fadeOut', delay: nnEndDelay, duration: 500, easing: 'easeOut' });

// Rechteck expandiert NACH dem Neural Net verschwindet
const expandTime = nnEndDelay + 800;
const expandedRectW = 600;
const expandedRectX = 960 - expandedRectW / 2;

api.addKeyframe(rect, { time: expandTime, x: rectX, y: rectY, width: rectW });
api.addKeyframe(rect, { time: expandTime + 800, x: expandedRectX, y: rectY, width: expandedRectW });

const vllmTargetX = expandedRectX + 25;
api.addKeyframe(vllm, { time: expandTime, x: vllmX, y: logoY });
api.addKeyframe(vllm, { time: expandTime + 800, x: vllmTargetX, y: logoY });
api.addKeyframe(vllmText, { time: expandTime, x: vllmX + logoSize / 2 - 50, y: textY });
api.addKeyframe(vllmText, { time: expandTime + 800, x: vllmTargetX + logoSize / 2 - 50, y: textY });

const nvidiaTargetX = expandedRectX + expandedRectW - logoSize - 25;
api.addKeyframe(nvidia, { time: expandTime, x: nvidiaX, y: logoY });
api.addKeyframe(nvidia, { time: expandTime + 800, x: nvidiaTargetX, y: logoY });
api.addKeyframe(nvidiaText, { time: expandTime, x: nvidiaX + logoSize / 2 - 75, y: textY });
api.addKeyframe(nvidiaText, { time: expandTime + 800, x: nvidiaTargetX + logoSize / 2 - 75, y: textY });

const ollama = api.addElement({
  type: 'logo', src: '/assets/ollama.svg', filter: 'brightness(0) invert(1)',
  x: 960 - logoSize / 2, y: logoY, width: logoSize, height: logoSize, name: 'Ollama',
});
api.addAnimation(ollama, { preset: 'scalePop', delay: expandTime + 1200, duration: 600, easing: 'spring' });

const ollamaText = api.addElement({
  type: 'text', text: 'Ollama',
  x: 960 - 50, y: textY, width: 100, height: 36,
  fontSize: 20, color: '#ffffff', name: 'Ollama Label',
});
api.addAnimation(ollamaText, { preset: 'fadeIn', delay: expandTime + 1600, duration: 500, easing: 'easeOut' });

// Szene-Duration setzen (alle Animationen enden bei ~10s)
const scenes1 = api.getScenes();
api.setSceneDuration(scenes1[0].id, 20000);

api.log('Szene 1 erstellt!');

// =============================================
// SZENE 2: KV Cache Visualisierung (Morph)
// =============================================

api.addScene('Szene 2');
const scenes2 = api.getScenes();
const scene2Id = scenes2[scenes2.length - 1].id;
api.setSceneTransition(scene2Id, 'morph', 1000);

// KV Cache Widget (dark) — zentriert
const kvW = 900;
const kvH = 560;
const kvX = 960 - kvW / 2;
const kvY = 260;
const kvScale = kvW / 740; // native 740 → canvas 900

const kvWidget = api.addElement({
  type: 'widget', widgetName: 'kvCacheDark',
  x: kvX, y: kvY, width: kvW, height: kvH,
  fps: 12, durationInFrames: 600, name: 'KV Cache Widget',
});
api.addAnimation(kvWidget, { preset: 'slideInTop', delay: 1000, duration: 800, easing: 'easeOut' });

// Logos morphen exakt auf die Header-Positionen im Widget
// Widget-intern: padding=22, title≈26px, columns start at y≈48
// Left column header: native x=22, y=48
// Right column header: native x=377, y=48
const headerY = kvY + Math.round(48 * kvScale);
const s2LogoSize = Math.round(24 * kvScale);

// vLLM logo → links, vor dem "vLLM · PagedAttention" Text
const s2VllmX = kvX + Math.round(22 * kvScale);
api.addElement({
  type: 'logo', src: '/assets/vllm-color.svg',
  x: s2VllmX, y: headerY, width: s2LogoSize, height: s2LogoSize, name: 'VLLM',
});

// Nvidia logo → neben vLLM
const s2NvidiaX = s2VllmX + s2LogoSize + 6;
api.addElement({
  type: 'logo', src: '/assets/nvidia-color.svg',
  x: s2NvidiaX, y: headerY, width: s2LogoSize, height: s2LogoSize, name: 'Nvidia',
});

// Ollama logo → rechte Spalte, vor dem "Ollama · llama.cpp" Text
const s2OllamaX = kvX + Math.round(377 * kvScale);
api.addElement({
  type: 'logo', src: '/assets/ollama.svg', filter: 'brightness(0) invert(1)',
  x: s2OllamaX, y: headerY, width: s2LogoSize, height: s2LogoSize, name: 'Ollama',
});

// Text-Labels aus Szene 1 NICHT morphen (keine matching names in Szene 2)
// → vLLM Label, TensorRT Label, Ollama Label faden automatisch aus

// Titel
api.addElement({
  type: 'text', text: 'KV Cache · GPU Memory',
  x: 960 - 200, y: 60, width: 400, height: 50,
  fontSize: 28, color: '#ffffff', fontWeight: 700, name: 'KV Title',
});
api.addAnimation(api.getElementIds().at(-1), { preset: 'fadeIn', delay: 800, duration: 600, easing: 'easeOut' });

api.setSceneDuration(scene2Id, 15000);

api.log('Szene 2 (KV Cache) erstellt!');
`;

export const ScriptPanel: React.FC = () => {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const [logs, setLogs] = useState<{ text: string; type: 'info' | 'error' }[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [mode, setMode] = useState<'editor' | 'codeview'>('editor');

  // Live generated code from project state
  const project = useProjectStore((s) => s.project);
  const generatedCode = useMemo(() => generateCodeFromProject(project), [project]);

  // Use a ref so the Monaco action always calls the latest version
  const runScriptRef = useRef<() => void>(() => {});

  const runScript = useCallback(() => {
    if (!editorRef.current) return;
    const code = editorRef.current.getValue();
    setIsRunning(true);
    setLogs([]);

    try {
      const scriptApi = createScriptApi();

      // Execute the script with api in scope
      const fn = new Function('api', code);
      const result = fn(scriptApi);

      // Handle async scripts
      if (result instanceof Promise) {
        result
          .then(() => {
            setLogs(scriptApi._logs.map((t) => ({ text: t, type: 'info' as const })));
            setIsRunning(false);
          })
          .catch((err: Error) => {
            setLogs([
              ...scriptApi._logs.map((t) => ({ text: t, type: 'info' as const })),
              { text: `Fehler: ${err.message}`, type: 'error' },
            ]);
            setIsRunning(false);
          });
      } else {
        setLogs(scriptApi._logs.map((t) => ({ text: t, type: 'info' })));
        setIsRunning(false);
      }
    } catch (err: any) {
      setLogs([{ text: `Fehler: ${err.message}`, type: 'error' }]);
      setIsRunning(false);
    }
  }, []);

  // Keep ref in sync
  runScriptRef.current = runScript;

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });

    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      allowNonTsExtensions: true,
      allowJs: true,
    });

    monaco.languages.typescript.javascriptDefaults.addExtraLib(
      SCRIPT_API_TYPES,
      'ts:script-api.d.ts'
    );

    editor.addAction({
      id: 'run-script',
      label: 'Skript ausführen',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
      run: () => runScriptRef.current(),
    });
  };

  const loadTemplate = useCallback((code: string) => {
    if (editorRef.current) {
      editorRef.current.setValue(code);
    }
    setShowTemplates(false);
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'var(--ae-bg-panel)',
      borderLeft: '1px solid var(--ae-border)',
    }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 10px',
        borderBottom: '1px solid var(--ae-border)',
        flexShrink: 0,
      }}>
        {/* Mode tabs */}
        <div style={{ display: 'flex', gap: 0, marginRight: 'auto' }}>
          {(['editor', 'codeview'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                padding: '4px 12px',
                fontSize: 11,
                fontWeight: mode === m ? 700 : 400,
                backgroundColor: mode === m ? 'var(--ae-accent)' : 'transparent',
                border: '1px solid var(--ae-border)',
                borderRadius: m === 'editor' ? '4px 0 0 4px' : '0 4px 4px 0',
                color: mode === m ? '#fff' : 'var(--ae-text-secondary)',
                cursor: 'pointer',
                marginLeft: m === 'codeview' ? -1 : 0,
              }}
            >
              {m === 'editor' ? 'Editor' : 'Code-View'}
            </button>
          ))}
        </div>

        {/* Editor mode controls */}
        {mode === 'editor' && (
          <>
            {/* Templates dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                style={{
                  padding: '4px 10px',
                  fontSize: 11,
                  backgroundColor: 'var(--ae-bg-panel-muted)',
                  border: '1px solid var(--ae-border)',
                  borderRadius: 4,
                  color: 'var(--ae-text-secondary)',
                  cursor: 'pointer',
                }}
              >
                Vorlagen
              </button>
              {showTemplates && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 4,
                  backgroundColor: 'var(--ae-bg-panel)',
                  border: '1px solid var(--ae-border)',
                  borderRadius: 6,
                  padding: '4px 0',
                  minWidth: 200,
                  zIndex: 1000,
                  boxShadow: 'var(--ae-shadow-floating)',
                }}>
                  {SCRIPT_TEMPLATES.map((tpl, i) => (
                    <div
                      key={i}
                      onClick={() => loadTemplate(tpl.code)}
                      style={{
                        padding: '8px 14px',
                        fontSize: 12,
                        color: 'var(--ae-text-primary)',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--ae-bg-panel-raised)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent';
                      }}
                    >
                      {tpl.name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={runScript}
              disabled={isRunning}
              style={{
                padding: '4px 14px',
                fontSize: 11,
                fontWeight: 700,
                backgroundColor: isRunning ? 'var(--ae-bg-panel-muted)' : 'var(--ae-accent)',
                border: 'none',
                borderRadius: 4,
                color: '#fff',
                cursor: isRunning ? 'wait' : 'pointer',
              }}
            >
              {isRunning ? 'Läuft...' : 'Ausführen (Strg+Enter)'}
            </button>
          </>
        )}

        {/* Code-view mode controls */}
        {mode === 'codeview' && (
          <>
            <button
              onClick={() => {
                navigator.clipboard.writeText(generatedCode);
                setLogs([{ text: 'Code in Zwischenablage kopiert!', type: 'info' }]);
              }}
              style={{
                padding: '4px 10px',
                fontSize: 11,
                backgroundColor: 'var(--ae-bg-panel-muted)',
                border: '1px solid var(--ae-border)',
                borderRadius: 4,
                color: 'var(--ae-text-secondary)',
                cursor: 'pointer',
              }}
            >
              Kopieren
            </button>
            <button
              onClick={() => {
                setMode('editor');
                setTimeout(() => {
                  if (editorRef.current) editorRef.current.setValue(generatedCode);
                }, 100);
              }}
              style={{
                padding: '4px 10px',
                fontSize: 11,
                backgroundColor: 'var(--ae-bg-panel-muted)',
                border: '1px solid var(--ae-border)',
                borderRadius: 4,
                color: 'var(--ae-text-secondary)',
                cursor: 'pointer',
              }}
            >
              In Editor laden
            </button>
          </>
        )}
      </div>

      {/* Editor (always mounted, hidden when not active) */}
      <div style={{ flex: 1, minHeight: 0, display: mode === 'editor' ? 'block' : 'none' }}>
        <Editor
          defaultLanguage="javascript"
          defaultValue={DEFAULT_CODE}
          theme="vs-dark"
          onMount={handleEditorMount}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            tabSize: 2,
            automaticLayout: true,
            suggestOnTriggerCharacters: true,
            quickSuggestions: true,
            parameterHints: { enabled: true },
            padding: { top: 8 },
          }}
        />
      </div>
      {/* Code-View (read-only, live generated) */}
      <div style={{ flex: 1, minHeight: 0, display: mode === 'codeview' ? 'block' : 'none' }}>
        <Editor
          language="javascript"
          value={generatedCode}
          theme="vs-dark"
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            tabSize: 2,
            automaticLayout: true,
            padding: { top: 8 },
            renderLineHighlight: 'none',
          }}
        />
      </div>

      {/* Console output */}
      <div style={{
        borderTop: '1px solid var(--ae-border)',
        maxHeight: 120,
        minHeight: 32,
        overflowY: 'auto',
        padding: '6px 10px',
        fontSize: 12,
        fontFamily: 'monospace',
        backgroundColor: '#1a1a1a',
        flexShrink: 0,
      }}>
        {logs.length === 0 && (
          <span style={{ color: 'var(--ae-text-disabled)' }}>Konsole — Ausgabe erscheint hier</span>
        )}
        {logs.map((log, i) => (
          <div
            key={i}
            style={{
              color: log.type === 'error' ? 'var(--ae-danger)' : '#8cc265',
              lineHeight: 1.5,
            }}
          >
            {log.type === 'error' ? '✗ ' : '› '}{log.text}
          </div>
        ))}
      </div>
    </div>
  );
};
