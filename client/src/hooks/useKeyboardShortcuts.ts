import { useEffect } from 'react';
import { useBoardStore } from '../stores/boardStore';

export function useKeyboardShortcuts() {
  const { activeBoard, createNote } = useBoardStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs/editors
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      // Ctrl/Cmd + N: New note
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        if (activeBoard) {
          const x = 200 + Math.random() * 300;
          const y = 100 + Math.random() * 200;
          createNote({ x, y, title: '', board_id: activeBoard.id } as any);
        }
      }

      // Delete key: handled per-note (not global for safety)
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeBoard, createNote]);
}
