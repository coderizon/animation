import { Suspense, lazy, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { EditorLayout } from './editor/EditorLayout';
import { useProjectStore } from './store/useProjectStore';

const LazyPlayerController = lazy(() =>
  import('./player/PlayerController').then((module) => ({
    default: module.PlayerController,
  })),
);

function App() {
  const project = useProjectStore((state) => state.project);
  const stopAllAnimations = useProjectStore((state) => state.stopAllAnimations);
  const [mode, setMode] = useState<'editor' | 'player'>('editor');

  const handleOpenPlayer = () => {
    stopAllAnimations();
    setMode('player');
  };

  const handleExitPlayer = () => {
    stopAllAnimations();
    setMode('editor');
  };

  if (mode === 'player') {
    return (
      <Suspense fallback={<div style={{ width: '100vw', height: '100vh', backgroundColor: '#050816' }} />}>
        <LazyPlayerController project={project} onExit={handleExitPlayer} />
      </Suspense>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <EditorLayout onOpenPlayer={handleOpenPlayer} />
    </DndProvider>
  );
}

export default App;
