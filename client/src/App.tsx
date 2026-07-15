import { useEffect } from 'react';
import { useBoardStore } from './stores/boardStore';
import { useThemeStore } from './stores/themeStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import Sidebar from './components/Sidebar';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';

export default function App() {
  const { activeBoard, fetchBoards, loading } = useBoardStore();
  const { init } = useThemeStore();

  useKeyboardShortcuts();

  useEffect(() => {
    init();
    fetchBoards();

    const preventBrowserZoom = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) event.preventDefault();
    };
    window.addEventListener('wheel', preventBrowserZoom, {
      capture: true,
      passive: false,
    });

    return () => {
      window.removeEventListener('wheel', preventBrowserZoom, { capture: true });
    };
  }, []);

  return (
    <div className="h-full flex bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {activeBoard && <Toolbar />}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-gray-500">Loading...</span>
          </div>
        ) : activeBoard ? (
          <Canvas />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <p className="text-lg">No board selected</p>
              <p className="text-sm mt-1">Create or select a board from the sidebar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
