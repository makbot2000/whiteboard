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
  const [size, setSize] = useState({ width: column.width, height: column.height || 400 });
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(column.name);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragStart = useRef({ x: 0, y: 0, colX: 0, colY: 0 });
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const columnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPosition({ x: column.x, y: column.y });
    setSize({ width: column.width, height: column.height || 400 });
  }, [column.x, column.y, column.width, column.height]);

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
      return (a.position_in_column ?? 0) - (b.position_in_column ?? 0);
    });

  // Drag column header
  const handleDragStart = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('input') || (e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('select')) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, colX: position.x, colY: position.y };

    const trackMove = (ev: MouseEvent) => {
      (window as any)._lastColDragX = ev.clientX - dragStart.current.x;
      (window as any)._lastColDragY = ev.clientY - dragStart.current.y;
      setPosition({
        x: dragStart.current.colX + (ev.clientX - dragStart.current.x),
        y: dragStart.current.colY + (ev.clientY - dragStart.current.y),
      });
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

  // Diagonal resize (bottom-right corner)
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStart.current = { x: e.clientX, y: e.clientY, w: size.width, h: size.height };

    const trackMove = (ev: MouseEvent) => {
      const dw = ev.clientX - resizeStart.current.x;
      const dh = ev.clientY - resizeStart.current.y;
      setSize({
        width: Math.max(200, resizeStart.current.w + dw),
        height: Math.max(150, resizeStart.current.h + dh),
      });
    };

    document.addEventListener('mousemove', trackMove);
    document.addEventListener('mouseup', () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', trackMove);
      updateColumn(column.id, { width: size.width, height: size.height });
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
      x: 10,
      y: 10 + posIndex * 50,
    } as any);
  };

  const handleSortChange = (sortBy: string) => {
    updateColumn(column.id, { sort_by: sortBy });
  };

  const toggleSortOrder = () => {
    updateColumn(column.id, { sort_order: column.sort_order === 'asc' ? 'desc' : 'asc' });
  };

  const handleLayoutChange = (value: string) => {
    if (value === 'freeform') {
      updateColumn(column.id, { layout_mode: 'freeform' });
      return;
    }

    const gridColumns = Math.max(2, Math.min(5, Number(value.split('-')[1])));
    updateColumn(column.id, {
      layout_mode: 'grid',
      grid_columns: gridColumns,
    });
  };

  // Fit column to its content
  const handleFitToContent = () => {
    if (columnNotes.length === 0) return;

    const headerHeight = columnRef.current?.querySelector<HTMLElement>('.column-header')?.offsetHeight ?? 42;
    const contentPadding = 16;
    const borderHeight = 2;

    if (layoutMode === 'freeform') {
      let maxX = 0;
      let maxY = 0;
      for (const note of columnNotes) {
        maxX = Math.max(maxX, note.x + note.width);
        maxY = Math.max(maxY, note.y + note.height);
      }

      const fittedSize = {
        width: Math.max(200, maxX + contentPadding),
        height: Math.max(150, headerHeight + maxY + contentPadding + borderHeight),
      };
      setSize(fittedSize);
      updateColumn(column.id, fittedSize);
    } else {
      const rowGap = 8;
      let gridHeight = 0;

      for (let index = 0; index < columnNotes.length; index += gridCols) {
        const row = columnNotes.slice(index, index + gridCols);
        gridHeight += Math.max(...row.map((note) => note.height));
        if (index + gridCols < columnNotes.length) gridHeight += rowGap;
      }

      const newHeight = Math.max(
        150,
        headerHeight + contentPadding + gridHeight + borderHeight,
      );
      setSize((current) => ({ ...current, height: newHeight }));
      updateColumn(column.id, { height: newHeight });
    }
  };

  // Align notes inside this column into a neat grid/stack
  const handleAlignNotes = () => {
    const padding = 10;

    if (layoutMode === 'freeform') {
      // Align freeform notes into a vertical stack
      let currentY = 10;
      columnNotes.forEach((note, i) => {
        updateNote(note.id, { x: 10, y: currentY, position_in_column: i });
        currentY += note.height + padding;
      });
    } else if (layoutMode === 'grid') {
      // In grid mode, just re-number positions so they flow in order
      // The CSS grid handles the visual layout
      columnNotes.forEach((note, i) => {
        updateNote(note.id, { position_in_column: i });
      });
    }
  };

  // Handle dropping a note into this column
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = columnRef.current?.getBoundingClientRect();
    if (!rect) return;
    const y = e.clientY - rect.top;
    const noteHeight = 210;
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

    const existingNote = columnNotes.find((n) => n.id === noteId);
    if (existingNote) {
      const reordered = columnNotes.filter((n) => n.id !== noteId);
      reordered.splice(dropIndex, 0, existingNote);
      reordered.forEach((n, i) => {
        updateNote(n.id, { position_in_column: i });
      });
    } else {
      updateNote(noteId, { column_id: column.id, position_in_column: dropIndex } as any);
      columnNotes.forEach((n, i) => {
        if (i >= dropIndex) {
          updateNote(n.id, { position_in_column: i + 1 });
        }
      });
    }
  };

  const layoutMode = column.layout_mode || 'freeform';
  const gridCols = column.grid_columns || 1;

  return (
    <div
      ref={columnRef}
      className={`absolute flex flex-col border border-gray-300 dark:border-gray-600 rounded-lg ${
        isDragging ? 'opacity-80 shadow-xl z-50' : 'z-20'
      } ${isResizing ? 'select-none' : ''}`}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        minHeight: size.height,
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column header */}
      <div
        className="column-header flex items-center gap-2 px-3 py-2 border-b border-gray-300 dark:border-gray-600 cursor-move select-none bg-gray-200 dark:bg-gray-700 rounded-t-lg"
        onMouseDown={handleDragStart}
      >
        {isEditing ? (
          <input
            className="flex-1 bg-white dark:bg-gray-800 border border-gray-400 dark:border-gray-500 rounded px-2 py-1 text-sm text-gray-900 dark:text-gray-100"
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

        {/* Fit to content */}
        <button
          className="text-sm text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 px-1"
          onClick={(e) => { e.stopPropagation(); handleFitToContent(); }}
          title="Fit column to content"
        >
          Fit
        </button>

        {/* Align button */}
        <button
          className="text-sm text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 px-1"
          onClick={(e) => { e.stopPropagation(); handleAlignNotes(); }}
          title="Align notes inside column"
        >
          Align
        </button>

        {/* Layout mode - combined dropdown */}
        <select
          className="text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-500 rounded px-1 py-0.5 cursor-pointer"
          value={layoutMode === 'grid' ? `grid-${gridCols}` : 'freeform'}
          onChange={(e) => handleLayoutChange(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          title="Layout mode"
        >
          <option value="freeform">Free</option>
          <option value="grid-2">Grid 2</option>
          <option value="grid-3">Grid 3</option>
          <option value="grid-4">Grid 4</option>
          <option value="grid-5">Grid 5</option>
        </select>

        {/* Sort controls */}
        <select
          className="text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-500 rounded px-1 py-0.5 cursor-pointer"
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
          className="text-sm text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white px-1"
          onClick={(e) => { e.stopPropagation(); toggleSortOrder(); }}
          title={`Sort ${column.sort_order === 'asc' ? 'ascending' : 'descending'}`}
        >
          {column.sort_order === 'asc' ? '↑' : '↓'}
        </button>

        <button
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 px-1"
          onClick={(e) => { e.stopPropagation(); handleAddNoteToColumn(); }}
          title="Add note to column"
        >
          + Add
        </button>

        <button
          className="text-sm text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 px-1"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('Delete column? Notes will become freeform.')) deleteColumn(column.id);
          }}
          title="Delete column"
        >
          Delete
        </button>
      </div>

      {/* Column notes area */}
      <div
        className={`column-content flex-1 p-2 bg-gray-100 dark:bg-gray-800 rounded-b-lg ${
          layoutMode === 'freeform'
            ? 'relative overflow-hidden'
            : 'overflow-y-auto'
        }`}
      >
        {columnNotes.length === 0 && (
          <div className="text-center text-gray-400 dark:text-gray-500 text-sm py-4">
            Drag notes here
          </div>
        )}
        {layoutMode === 'freeform' ? (
          columnNotes.map((note) => (
            <NoteCard key={note.id} note={note} inColumn inFreeformColumn />
          ))
        ) : layoutMode === 'grid' ? (
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}
          >
            {columnNotes.map((note, index) => (
              <div key={note.id} className="min-w-0">
                {dragOverIndex === index && (
                  <div className="h-1 bg-blue-500 rounded-full mb-1" />
                )}
                <NoteCard note={note} inColumn inGridColumn />
              </div>
            ))}
            {dragOverIndex !== null && dragOverIndex >= columnNotes.length && (
              <div className="h-1 bg-blue-500 rounded-full mt-1 col-span-full" />
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {columnNotes.map((note, index) => (
              <div key={note.id}>
                {dragOverIndex === index && (
                  <div className="h-1 bg-blue-500 rounded-full mb-1" />
                )}
                <NoteCard note={note} inColumn />
              </div>
            ))}
            {dragOverIndex !== null && dragOverIndex >= columnNotes.length && (
              <div className="h-1 bg-blue-500 rounded-full mt-1" />
            )}
          </div>
        )}
      </div>

      {/* Diagonal resize handle (bottom-right corner) */}
      <div
        className="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize z-30"
        onMouseDown={handleResizeStart}
      >
        <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-r-2 border-b-2 border-gray-400 dark:border-gray-500" />
      </div>
    </div>
  );
}
