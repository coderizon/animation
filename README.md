# Animation Builder

Animation Builder is a browser-based motion editor for assembling canvas elements, animating them with presets and keyframes, and exporting project state as JSON.

## Quick Start

```bash
npm install
npm run dev
```

## Scripts

```bash
npm run dev        # Start the Vite dev server
npm run test       # Run the automated test suite
npm run typecheck  # Run TypeScript without emitting files
npm run build      # Type-check and create a production build
npm run check      # Run typecheck, tests, and build
npm run preview    # Preview the production build locally
```

## What The App Does

- Drag assets, text, shapes, logos, and widgets onto a 1920x1080 canvas.
- Move, resize, crop, rotate, and layer elements directly in the editor.
- Use the timeline for animation delays, duration changes, and keyframe editing.
- Import and export projects as JSON.
- Preview animations inside the editor and in the player view.

## Tech Stack

- React 18
- TypeScript 5.7
- Vite 6
- Zustand for state management
- Framer Motion for animation playback
- react-dnd for drag and drop

## Project Layout

- `src/editor/` contains the editor UI, canvas, timeline, panels, and interactions.
- `src/store/` contains the Zustand project and viewport stores.
- `src/animations/` contains animation presets.
- `src/widgets/` contains the built-in widget registry and widget implementations.
- `src/player/` contains the full-screen playback renderer.
- `src/templates/` contains the template registry and loading helpers.

## Current Limits

- Projects are exported as JSON only.
- There is no media render/export pipeline yet.
- The canvas is DOM-based, so very large scenes will eventually hit performance limits.

## Development Notes

`CLAUDE.md` contains the more detailed internal implementation reference for contributors.
