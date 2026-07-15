import { useState } from 'react';
import { useBoardStore } from '../stores/boardStore';
import { useThemeStore } from '../stores/themeStore';

export default function Sidebar() {
  const { boards, activeBoard, createBoard, selectBoard, deleteBoard, updateBoard } = useBoardStore();
  const { theme, toggle } = useThemeStore();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleCreate = () => {
    const name = newName.trim() || 'Untitled Board';
    createBoard(name);
    setNewName('');
  };

  const handleRename = (id: string) => {
    if (editName.trim()) {
      updateBoard(id, { name: editName.trim() } as any);
    }
    setEditingId(null);
  };

  return (
    <div className="w-60 h-full bg-gray-200 dark:bg-gray-800 border-r border-gray-300 dark:border-gray-700 flex flex-col">
      <div className="p-3 border-b border-gray-300 dark:border-gray-700">
        <h1 className="text-sm font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
          Whiteboard
        </h1>
      </div>

      {/* Board list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {boards.map((board) => (
          <div
            key={board.id}
            className={`group flex items-center rounded px-2 py-1.5 cursor-pointer text-sm ${
              activeBoard?.id === board.id
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200'
                : 'hover:bg-gray-300 dark:hover:bg-gray-700'
            }`}
            onClick={() => selectBoard(board.id)}
            onDoubleClick={() => {
              setEditingId(board.id);
              setEditName(board.name);
            }}
          >
            {editingId === board.id ? (
              <input
                className="flex-1 bg-white dark:bg-gray-900 border border-gray-400 dark:border-gray-600 rounded px-1 py-0.5 text-sm"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => handleRename(board.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename(board.id);
                  if (e.key === 'Escape') setEditingId(null);
                }}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <>
                <span className="flex-1 truncate">{board.name}</span>
                <button
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 ml-1 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete this board?')) deleteBoard(board.id);
                  }}
                  title="Delete board"
                >
                  x
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {/* New board input */}
      <div className="p-2 border-t border-gray-300 dark:border-gray-700">
        <div className="flex gap-1">
          <input
            className="flex-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm"
            placeholder="New board..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
          />
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-sm"
            onClick={handleCreate}
          >
            +
          </button>
        </div>
      </div>

      {/* Theme toggle */}
      <div className="p-2 border-t border-gray-300 dark:border-gray-700">
        <button
          className="w-full text-left text-sm px-2 py-1 rounded hover:bg-gray-300 dark:hover:bg-gray-700"
          onClick={toggle}
        >
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
      </div>
    </div>
  );
}
