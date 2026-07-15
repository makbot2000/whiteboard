import { useState, useRef } from 'react';
import { useBoardStore } from '../stores/boardStore';
import type { Column } from '../types';
import NoteCard from './NoteCard';

interface Props {
  column: Column;
}

export default function ColumnContainer({ column }: Props) {
  const { notes, updateColumn, deleteColumn, createNote } = useBoardStore();
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: column.x, y: column.y });
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(column.name);
  const dragStart = useRef({ x: 0, y: 0, colX: 0, colY: 0 });

  // Notes in this column, sorted
  const columnNotes = notes
    .filter((n) => n.column_id === column.id)
    .sort((a, b) => {
      if (column.sort_by === 'title') {
        return column.sort_order === 'asc'
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title);
      }
      if (column.sort_by === 'created') {
        return column.sort_order === 'asc'
          ? a.created_at.localeCompare(b.created_at)
          : b.created_at.localeCompare(a.created_at);
      }
      if (column.sort_by === 'modified') {
        return column.sort_order === 'asc'
          ? a.updated_at.localeCompare(b.updated_at)
          : b.updated_at.localeCompare(a.updated_at);
      }
      // manual: sort by position_in_column
      return (a.position_in_column ?? 0) - (b.position_in_column ?? 0);
    });

  // Drag column header
  const handleDragStart = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('input') || (e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('select')) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, colX: position.x, colY: position.y };

    const handleMove = (ev: MouseEvent) => {
      const dx = ev.clientX - dragStart.current.x;
      const dy = ev.clientY - dragStart.current.y;
      setPosition({ x: dragStart.current.colX + dx, y: dragStart.current.colY + dy });
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMove);
      // Save position
      updateColumn(column.id, { x: position.x, y: position.y });
    }, { once: true });
  };

  const handleRename = () => {
    if (editName.trim()) {
      updateColumn(column.id, { name: editName.trim() });
    }
    setIsEditing(false);
  };

  const handleAddNoteToColumn = () => {
    const posIndex = columnNotes.length;
    createNote({
      column_id: column.id,
      position_in_column: posIndex,
      x: 0,
      y: 0,
    } as any);
  };

  const handleSortChange = (sortBy: string) => {
    updateColumn(column.id, { sort_by: sortBy });
  };

  const toggleSortOrder = () => {
    updateColumn(column.id, { sort_order: column.sort_order === 'asc' ? 'desc' : 'asc' });
  };

  return (
    <div
      className={`absolute flex flex-col border border-gray-300 dark:border-gray-600 rounded-lg ${
        isDragging ? 'opacity-80 shadow-xl z-50' : 'z-20'
      }`}
      style={{
        left: position.x,
        top: position.y,
        width: column.width,
        minHeight: 200,
        backgroundColor: 'rgba(var(--col-bg), 0.5)',
      }}
    >
      {/* Column header */}
      <div
        className="flex items-center gap-1 px-3 py-2 border-b border-gray-300 dark:border-gray-600 cursor-move select-none bg-gray-200/90 dark:bg-gray-700/90 rounded-t-lg"
        onMouseDown={handleDragStart}
      >
        {isEditing ? (
          <input
            className="flex-1 bg-white dark:bg-gray-800 border border-gray-400 rounded px-1 py-0.5 text-sm"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') setIsEditing(false);
            }}
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className="flex-1 font-medium text-sm truncate"
            onDoubleClick={() => { setIsEditing(true); setEditName(column.name); }}
          >
            {column.name}
          </span>
        )}

        {/* Sort controls */}
        <select
          className="text-xs bg-transparent border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 cursor-pointer"
          value={column.sort_by}
          onChange={(e) => handleSortChange(e.target.value)}
          onClick={(e) => e.stopPropagation()}
        >
          <option value="manual">Manual</option>
          <option value="title">Title</option>
          <option value="created">Created</option>
          <option value="modified">Modified</option>
        </select>

        <button
          className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-0.5"
          onClick={(e) => { e.stopPropagation(); toggleSortOrder(); }}
          title={`Sort ${column.sort_order === 'asc' ? 'ascending' : 'descending'}`}
        >
          {column.sort_order === 'asc' ? '↑' : '↓'}
        </button>

        <button
          className="text-blue-500 hover:text-blue-700 text-lg leading-none px-1"
          onClick={(e) => { e.stopPropagation(); handleAddNoteToColumn(); }}
          title="Add note to column"
        >
          +
        </button>

        <button
          className="text-red-400 hover:text-red-600 text-xs px-1"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('Delete column? Notes will become freeform.')) deleteColumn(column.id);
          }}
          title="Delete column"
        >
          x
        </button>
      </div>

      {/* Column notes */}
      <div className="flex flex-col gap-2 p-2 bg-gray-100/50 dark:bg-gray-800/50 rounded-b-lg">
        {columnNotes.length === 0 && (
          <div className="text-center text-gray-400 dark:text-gray-500 text-sm py-4">
            No notes yet
          </div>
        )}
        {columnNotes.map((note) => (
          <NoteCard key={note.id} note={note} inColumn />
        ))}
      </div>
    </div>
  );
}
