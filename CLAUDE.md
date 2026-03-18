# Animation Builder - Project Reference

## Quick Start
```bash
npm run dev      # Vite dev server with HMR
npm run build    # TypeScript check + production build
npm run preview  # Preview production build
```

## Tech Stack
- **React 18** + **TypeScript 5.7** + **Vite 6**
- **Zustand 5** - State management (2 stores)
- **Framer Motion 11** - Animation engine (variants-based)
- **react-dnd 16** - Drag & drop (HTML5 backend)
- Canvas: 1920x1080 (YouTube 16:9), DOM-based (not WebGL)

---

## Project Structure

```
src/
├── App.tsx                        # Root: DnD provider wrapper
├── main.tsx                       # React DOM entry
├── index.css                      # Global styles (dark body, overflow hidden)
├── animations/
│   └── presets.ts                 # 46 animation presets in 12 categories
├── editor/
│   ├── Canvas.tsx                 # Canvas with zoom/pan/marquee/rulers/drop-target
│   ├── EditorLayout.tsx           # Main layout: toolbar + sidebars + timeline + statusbar
│   ├── PropertiesPanel.tsx        # Right panel: position/size/rotation/color/animation/keyframes
│   ├── components/
│   │   ├── AnimationPicker.tsx    # Collapsible category UI, auto-preview on select
│   │   ├── AssetLibrary.tsx       # Left panel: shapes/text/widgets/logos (drag sources)
│   │   ├── CanvasElement.tsx      # Element renderer: drag/resize/select + framer-motion animation
│   │   ├── ContextMenu.tsx        # Right-click: crop, keyframe, "Bewegung hierher"
│   │   ├── CropOverlay.tsx        # 8-handle crop tool (inset percentages)
│   │   ├── KeyboardShortcutsOverlay.tsx
│   │   ├── ResizablePanel.tsx     # Horizontal resize handle for sidebars
│   │   ├── Ruler.tsx              # Canvas measurement rulers
│   │   ├── SnapGuides.tsx         # Magenta alignment guides (SVG overlay)
│   │   ├── TemplateSelector.tsx   # Template loader modal
│   │   ├── Timeline.tsx           # Animation bars, keyframe diamonds, playhead, layer reorder
│   │   ├── WidgetRenderer.tsx     # Widget display wrapper (scales to element size)
│   │   └── ZoomControls.tsx       # Zoom +/- and fit-to-screen
│   ├── hooks/
│   │   └── useKeyboardShortcuts.ts
│   └── utils/
│       ├── keyframeInterpolation.ts  # Linear lerp for all properties + hex color interpolation
│       └── snapping.ts               # 5px threshold snap to edges/centers of other elements
├── player/
│   └── PlayerController.tsx       # Full-screen playback renderer
├── store/
│   ├── useProjectStore.ts         # Project state, elements, history, playback, all actions
│   └── useViewportStore.ts        # Zoom (0.1-4.0), pan offset, snap guides
├── types/
│   ├── project.ts                 # Core types: Project, CanvasElement, AnimationConfig, Keyframe
│   └── animation.ts               # AnimationPreset interface, DragItem types, asset types
├── widgets/
│   ├── registry.ts                # Widget registry (Map<name, entry>)
│   ├── types.ts                   # WidgetComponentProps, WidgetRegistryEntry
│   ├── useFrameAnimation.ts       # RAF-based frame counter hook
│   ├── interpolate.ts             # Remotion-compatible interpolate()
│   └── components/
│       ├── ServerAnimation/       # Blinking LED server rack
│       ├── NetworkVisualization/  # User counter + connection lines
│       └── NeuralNetServer/       # Floating neural network graph
└── templates/
    └── index.ts                   # Empty template system (infrastructure ready)
```

---

## Core Data Types

### CanvasElement
```typescript
{
  id: string;
  type: 'logo' | 'text' | 'shape' | 'image' | 'widget';
  name?: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  rotation: number;          // degrees
  zIndex: number;
  content: LogoContent | TextContent | ShapeContent | ImageContent | WidgetContent;
  animation?: AnimationConfig;  // preset + delay + duration + easing
  keyframes?: Keyframe[];       // sorted by time, linear interpolation
  clip?: { top, right, bottom, left };  // crop inset percentages 0-100
  visible: boolean;
  locked: boolean;
}
```

### AnimationConfig
```typescript
{ preset: AnimationPresetName, delay: number (ms), duration: number (ms), easing: EasingName }
```
- **46 presets** in 12 categories (Fade, Slide, Scale/Zoom, Rotation, Bounce/Elastic, Reveal/Mask, Stroke/Shape, Glitch/Digital, Light/Shine, Motion, Particle/Dissolve, Dramatic)
- **6 easings**: linear, easeIn, easeOut, easeInOut, spring, bounce
- Delay = element hidden until currentTime >= delay, then animation triggers fresh
- Framer Motion delay is NOT used; timing is manual via currentTime comparison

### Keyframe
```typescript
{ time: number (ms), x, y, width?, height?, rotation?, fill?, stroke?, strokeWidth?, color?, fontSize? }
```
- Linear interpolation between keyframes (numeric lerp, hex color RGB lerp)
- Optional fields only interpolate when present in BOTH neighboring keyframes

---

## State Management (Zustand)

### useProjectStore - Key Actions
| Action | Purpose |
|--------|---------|
| `addElement(el)` | Create element (auto ID + name) |
| `updateElement(id, updates)` | Update + push history |
| `updateElementSilent(id, updates)` | Update without history (drag/resize in progress) |
| `pushSnapshot(project)` | Manually push to history (on mouse up) |
| `deleteElement(id)` | Remove + deselect |
| `selectElement(id)` / `addToSelection(id)` / `selectElements(ids)` | Selection |
| `undo()` / `redo()` | History (max 50 snapshots) |
| `playAllAnimations()` | Start RAF playback loop |
| `pauseAllAnimations()` / `stopAllAnimations()` | Pause (keep time) / Stop (reset to 0) |
| `setCurrentTime(ms)` | Move playhead |
| `triggerPreview(id)` | 3-second preview of single element |
| `addKeyframe(id, kf)` / `removeKeyframe(id, time)` | Keyframe CRUD |
| `reorderElements(from, to)` | Timeline layer drag |
| `exportProject()` / `importProject(json)` | JSON serialization |

### useViewportStore
| Field | Purpose |
|-------|---------|
| `zoom` | 0.1 - 4.0 (default 0.5) |
| `panOffset` | { x, y } canvas offset |
| `snapGuides` | Alignment guides during drag |
| `zoomAtPoint(zoom, sx, sy)` | Zoom centered on cursor |
| `fitToScreen(w, h, cw, ch)` | Auto-fit canvas |

---

## Animation Playback Architecture

```
playAllAnimations() → RAF loop → setCurrentTime(elapsed)
    ↓
CanvasElement reads currentTime from store
    ↓
if currentTime < element.animation.delay → display: none (hidden)
if currentTime >= delay (first crossing) → increment animationKey → framer-motion triggers hidden→visible
    ↓
Keyframe interpolation also applies (position, size, rotation, colors)
    ↓
On stop: reset currentTime=0, prevPastDelay=false
```

**Important**: Framer Motion `transition.delay` is NOT used. The delay is implemented by hiding the element until `currentTime >= delay`, then triggering animation fresh via `animationKey` change. Inner variant transitions are stripped to ensure user-set duration/easing always take effect.

---

## UI Layout

```
┌──────────────────────────────────────────────┐
│  Toolbar (60px) - Undo/Redo, New, Templates, │
│  Play/Pause/Stop, Import, Export, Shortcuts   │
├────────┬─────────────────────┬───────────────┤
│ Assets │      Canvas         │  Properties   │
│ 225px  │   (flex: 1)         │    280px      │
│ resiz. │  zoom/pan/rulers    │   resizable   │
│ 150-   │  grid bg, drop      │   150-600px   │
│ 700px  │  target, marquee    │               │
├────────┴─────────────────────┴───────────────┤
│  Timeline (200px default, resizable 60-500px) │
│  Layer panel (220px) | Tracks (scrollable)    │
├──────────────────────────────────────────────┤
│  Status Bar (30px)                           │
└──────────────────────────────────────────────┘
```

---

## Keyboard Shortcuts
| Key | Action |
|-----|--------|
| Ctrl+Z | Undo |
| Ctrl+Shift+Z / Ctrl+Y | Redo |
| Ctrl+A | Select all |
| Delete / Backspace | Delete selected |
| Arrow keys | Move 1px (Shift = 10px) |
| Escape | Exit crop → close menu → deselect |
| Space + drag | Pan canvas |
| Ctrl + scroll | Zoom at cursor |
| ? | Toggle shortcuts overlay |

---

## Common Development Tasks

### Add a new animation preset
1. Add name to `AnimationPresetName` union in `types/project.ts`
2. Add preset object in `animations/presets.ts` (name, displayName, icon, defaultDuration, variants)
3. Add to appropriate category in `presetCategories` array

### Add a new widget
1. Create component in `widgets/components/YourWidget/`
2. Implement `WidgetComponentProps` interface
3. Register in `widgets/registry.ts`

### Add a new asset/logo
Drop SVG file in `/public/assets/` - auto-discovered by AssetLibrary via Vite glob

### Add a keyboard shortcut
Edit `editor/hooks/useKeyboardShortcuts.ts`

---

## Drag Patterns
- **Asset → Canvas**: react-dnd drop creates new element at position
- **Element drag**: Native mousedown/mousemove, `updateElementSilent` during drag, `pushSnapshot` on mouseup
- **Multi-drag**: All selected elements move together, delta applied to each
- **Timeline bar drag**: Move = change delay, resize edges = change delay+duration or duration only, 50ms snap grid
- **Timeline keyframe drag**: Move diamond = change keyframe time, 50ms snap
- **Layer reorder**: HTML5 drag in timeline layer panel

## Snapping
- 5px threshold in canvas coordinates
- Snaps to left/right/center of other elements + canvas edges
- Magenta dashed guide lines shown via SVG overlay

---

## Public Assets
`/public/assets/` contains ~25 AI/ML company SVG logos (Anthropic, DeepSeek, HuggingFace, Meta, Microsoft, Google Cloud, Mistral, Groq, etc.) - auto-discovered and shown in AssetLibrary.

---

## Known Constraints
- DOM-based canvas (no WebGL) - performance limit ~50-100 elements
- No video/GIF export (JSON only; external renderer needed)
- No asset upload UI (manual file placement)
- No element grouping
- No bezier easing editor (6 preset easings only)
- No path animation / SVG morphing
- Linear keyframe interpolation only (no bezier curves between keyframes)
- Single user (no collaboration)
- Template system exists but is empty
