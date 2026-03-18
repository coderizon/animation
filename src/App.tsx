import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { EditorLayout } from './editor/EditorLayout';

function App() {
  return (
    <DndProvider backend={HTML5Backend}>
      <EditorLayout />
    </DndProvider>
  );
}

export default App;
