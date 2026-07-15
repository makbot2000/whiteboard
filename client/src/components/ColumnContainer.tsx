import { useState, useRef, useEffect } from 'react';
import { useBoardStore } from '../stores/boardStore';
import type { Column } from '../types';
import NoteCard from './NoteCard';

interface Props {
  column: Column;
}

export default function ColumnContainer({ column }: Props) {
  const { notes, updateColumn, deleteColumn, createNote, updateNote } = useBoardStore();
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [position, setPosition] = useState({ x: column.x, y: column.y });
  const [width, setWidth] = useState(column.width);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(column.name);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragStart = useRef({ x: 0, y: 0, colX: 0, colY: 0 });
  const resizeStart = useRef({ x: 0, w: 0 });
  const columnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPosition({ x: column.x, y: column.y });
    setWidth(column.width);
  }, [column.x, column.y, column.width]);

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
      // Calculate final pos
      const finalX = dragStart.current.colX + ((window as any)._lastColDragX || 0);
      const finalY = dragStart.current.colY + ((window as any)._lastColDragY || 0);
      updateColumn(column.id, { x: finalX, y: finalY });
    }, { once: true });

    // Track
    const origMove = handleMove;
    document.removeEventListener('mousemove', handleMove);
    const trackMove = (ev: MouseEvent) => {
      (window as any)._lastColDragX = ev.clientX - dragStart.current.x;
      (window as any)._lastColDragY = ev.clientY - dragStart.current.y;
      origMove(ev);
    };
    document.addEventListener('mousemove', trackMove);
    document.addEventListener('mouseup', () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', trackMove);
      const finalX = dragStart.current.colX + ((window as any)._lastColDragX || 0);
      const finalY = dragStart.current.colY + ((window as any)._lastColDragY || 0);
      setPosition({ x: finalX, y: finalY });
      updateColumn(column.id, { x: finalX, y: finalY });
    }, { once: true });
  };

  // Resize column from right edge
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStart.current = { x: e.clientX, w: width };

    const handleMove = (ev: MouseEvent) => {
      const dw = ev.clientX - resizeStart.current.x;
      setWidth(Math.max(200, resizeStart.current.w + dw));
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMove);
      const finalW = Math.max(200, resizeStart.current.w + (((window as any)._lastColResizeW) || 0));
      updateColumn(column.id, { width });
    }, { once: true });

    // Track for stale closure
    document.removeEventListener('mousemove', handleMove);
    const trackMove = (ev: MouseEvent) => {
      (window as any)._lastColResizeW = ev.clientX - resizeStart.current.x;
      const dw = ev.clientX - resizeStart.current.x;
      setWidth(Math.max(200, resizeStart.current.w + dw));
    };
    document.addEventListener('mousemove', trackMove);
    document.addEventListener('mouseup', () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', trackMove);
      const finalW = Math.max(200, resizeStart.current.w + ((window as any)._lastColResizeW || 0));
      setWidth(finalW);
      updateColumn(column.id, { width: finalW });
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

  // Auto-size column height to fit content
  const handleAutoSize = () => {
    // Column auto-sizes via min-height and flex, but we can trigger a re-render
    // Nothing needed since columns expand downward infinitely
  };

  // Handle dropping a note into this column (from NoteCard drag)
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    // Figure out drop index based on Y position
    const rect = columnRef.current?.getBoundingClientRect();
    if (!rect) return;
    const y = e.clientY - rect.top;
    const noteHeight = 210; // approximate
    const index = Math.max(0, Math.floor(y / noteHeight));
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverIndex(null);
    const noteId = e.dataTransfer.getData('text/note-id');
    if (!noteId) return;

    const dropIndex = dragOverIndex ?? columnNotes.length;

    // Reorder existing notes to make room
    const existingNote = columnNotes.find((n) => n.id === noteId);
    if (existingNote) {
      // Reordering within the same column
      const reordered = columnNotes.filter((n) => n.id !== noteId);
      reordered.splice(dropIndex, 0, existingNote);
      reordered.forEach((n, i) => {
        updateNote(n.id, { position_in_column: i });
      });
    } else {
      // Moving from freeform or another column into this column
      updateNote(noteId, { column_id: column.id, position_in_column: dropIndex } as any);
      // Shift existing notes
      columnNotes.forEach((n, i) => {
        if (i >= dropIndex) {
          updateNote(n.id, { position_in_column: i + 1 });
        }
      });
    }
  };

  return (
    <div
      ref={columnRef}
      className={`absolute flex flex-col border border-gray-300 dark:border-gray-600 rounded-lg ${
        isDragging ? 'opacity-80 shadow-xl z-50' : 'z-20'
      } ${isResizing ? 'select-none' : ''}`}
      style={{
        left: position.x,
        top: position.y,
        width: width,
        minHeight: 200,
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column header */}
      <div
        className="flex items-center gap-1 px-3 py-2 border-b border-gray-300 dark:border-gray-600 cursor-move select-none bg-gray-200 dark:bg-gray-700 rounded-t-lg"
        onMouseDown={handleDragStart}
      >
        {isEditing ? (
          <input
            className="flex-1 bg-white dark:bg-gray-800 border border-gray-400 dark:border-gray-500 rounded px-1 py-0.5 text-sm text-gray-900 dark:text-gray-100"
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
            className="flex-1 font-medium text-sm truncate text-gray-900 dark:text-gray-100"
            onDoubleClick={() => { setIsEditing(true); setEditName(column.name); }}
          >
            {column.name}
          </span>
        )}

        {/* Sort controls */}
        <select
          className="text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-500 rounded px-1 py-0.5 cursor-pointer"
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
          className="text-xs text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-0.5"
          onClick={(e) => { e.stopPropagation(); toggleSortOrder(); }}
          title={`Sort ${column.sort_order === 'asc' ? 'ascending' : 'descending'}`}
        >
          {column.sort_order === 'asc' ? '↑' : '↓'}
        </button>

        <button
          className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-lg leading-none px-1"
          onClick={(e) => { e.stopPropagation(); handleAddNoteToColumn(); }}
          title="Add note to column"
        >
          +
        </button>

        <button
          className="text-red-400 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 text-xs px-1"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('Delete column? Notes will become freeform.')) deleteColumn(column.id);
          }}
          title="Delete column"
        >
          x
        </button>
      </div>

      {/* Column notes area */}
      <div className="flex flex-col gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-b-lg min-h-[100px]">
        {columnNotes.length === 0 && (
          <div className="text-center text-gray-400 dark:text-gray-500 text-sm py-4">
            Drag notes here
          </div>
        )}
        {columnNotes.map((note, index) => (
          <div key={note.id}>
            {/* Drop indicator */}
            {dragOverIndex === index && (
              <div className="h-1 bg-blue-500 rounded-full mb-1" />
            )}
            <NoteCard note={note} inColumn />
          </div>
        ))}
        {/* Drop indicator at end */}
        {dragOverIndex !== null && dragOverIndex >= columnNotes.length && (
          <div className="h-1 bg-blue-500 rounded-full mt-1" />
        )}
      </div>

      {/* Right edge resize handle */}
      <div
        className="absolute top-0 right-0 w-2 h-full cursor-ew-resize hover:bg-blue-500/20 rounded-r-lg"
        onMouseDown={handleResizeStart}
      />
    </div>
  );
}
