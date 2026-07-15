import { useState, useRef, useCallback, useEffect } from 'react';
import { useBoardStore } from '../stores/boardStore';
import type { Note } from '../types';
import NoteEditor from './NoteEditor';

interface Props {
  note: Note;
  inColumn?: boolean;
}

export default function NoteCard({ note, inColumn = false }: Props) {
  const { updateNote, deleteNote, groups, columns } = useBoardStore();
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [position, setPosition] = useState({ x: note.x, y: note.y });
  const [size, setSize] = useState({ width: note.width, height: note.height });
  const [showMenu, setShowMenu] = useState(false);
  const [editingTags, setEditingTags] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const dragStart = useRef({ x: 0, y: 0, noteX: 0, noteY: 0 });
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setPosition({ x: note.x, y: note.y });
    setSize({ width: note.width, height: note.height });
  }, [note.x, note.y, note.width, note.height]);

  const debouncedSave = useCallback(
    (data: Partial<Note>) => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        updateNote(note.id, data);
      }, 300);
    },
    [note.id, updateNote]
  );

  // Drag handlers (only for freeform notes)
  const handleDragStart = (e: React.MouseEvent) => {
    if (inColumn) return; // columns handle their own ordering
    if ((e.target as HTMLElement).closest('.note-editor-area') || (e.target as HTMLElement).closest('.resize-handle')) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, noteX: position.x, noteY: position.y };

    const trackMove = (ev: MouseEvent) => {
      (window as any)._lastDragX = ev.clientX - dragStart.current.x;
      (window as any)._lastDragY = ev.clientY - dragStart.current.y;
      const newPos = {
        x: dragStart.current.noteX + (ev.clientX - dragStart.current.x),
        y: dragStart.current.noteY + (ev.clientY - dragStart.current.y),
      };
      setPosition(newPos);
    };

    document.addEventListener('mousemove', trackMove);
    document.addEventListener('mouseup', () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', trackMove);
      const finalX = dragStart.current.noteX + ((window as any)._lastDragX || 0);
      const finalY = dragStart.current.noteY + ((window as any)._lastDragY || 0);
      setPosition({ x: finalX, y: finalY });
      updateNote(note.id, { x: finalX, y: finalY });
    }, { once: true });
  };

  // Resize handlers
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStart.current = { x: e.clientX, y: e.clientY, w: size.width, h: size.height };

    const handleMove = (ev: MouseEvent) => {
      const dw = ev.clientX - resizeStart.current.x;
      const dh = ev.clientY - resizeStart.current.y;
      const newSize = {
        width: Math.max(180, resizeStart.current.w + dw),
        height: Math.max(100, resizeStart.current.h + dh),
      };
      setSize(newSize);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMove);
      const finalW = Math.max(180, resizeStart.current.w + ((window as any)._lastResizeW || 0));
      const finalH = Math.max(100, resizeStart.current.h + ((window as any)._lastResizeH || 0));
      updateNote(note.id, { width: size.width, height: size.height });
    }, { once: true });
  };

  // Fit to content
  const handleFitToContent = () => {
    const editorEl = document.querySelector(`[data-note-id="${note.id}"] .tiptap`);
    if (editorEl) {
      const newHeight = Math.max(100, editorEl.scrollHeight + 80);
      setSize({ ...size, height: newHeight });
      updateNote(note.id, { height: newHeight });
    }
    setShowMenu(false);
  };

  const handleDelete = () => {
    deleteNote(note.id);
    setShowMenu(false);
  };

  // Remove from column (make freeform)
  const handleRemoveFromColumn = () => {
    updateNote(note.id, { column_id: null, position_in_column: null, x: 200, y: 200 } as any);
    setShowMenu(false);
  };

  // Move to column
  const handleMoveToColumn = (columnId: string) => {
    updateNote(note.id, { column_id: columnId, position_in_column: 999 } as any);
    setShowMenu(false);
  };

  // Group assignment
  const handleAssignGroup = (groupId: string | null) => {
    updateNote(note.id, { group_id: groupId } as any);
    setShowMenu(false);
  };

  // Tags
  const parsedTags: string[] = (() => {
    try { return JSON.parse(note.tags || '[]'); } catch { return []; }
  })();

  const handleAddTag = () => {
    const newTag = tagInput.trim();
    if (newTag && !parsedTags.includes(newTag)) {
      const newTags = [...parsedTags, newTag];
      updateNote(note.id, { tags: newTags } as any);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    const newTags = parsedTags.filter((t) => t !== tag);
    updateNote(note.id, { tags: newTags } as any);
  };

  // Find group color
  const group = groups.find((g) => g.id === note.group_id);
  const borderColor = group ? group.color : undefined;

  const isInColumn = !!note.column_id;

  return (
    <div
      data-note-id={note.id}
      className={`rounded-lg shadow-lg border bg-white dark:bg-gray-800 flex flex-col ${
        isDragging ? 'opacity-80 shadow-2xl z-50' : 'z-10'
      } ${isResizing ? 'select-none' : ''} ${inColumn ? 'relative' : 'absolute'}`}
      style={{
        ...(inColumn ? {} : { left: position.x, top: position.y }),
        width: inColumn ? '100%' : size.width,
        height: size.height,
        borderColor: borderColor || (isDragging ? '#3b82f6' : undefined),
        borderWidth: borderColor ? 2 : undefined,
      }}
    >
      {/* Title bar / drag handle */}
      <div
        className={`flex items-center gap-1 px-2 py-1 border-b border-gray-200 dark:border-gray-700 select-none shrink-0 ${
          inColumn ? 'cursor-default' : 'cursor-move'
        }`}
        onMouseDown={handleDragStart}
      >
        <input
          className="flex-1 bg-transparent text-sm font-medium outline-none placeholder-gray-400 dark:text-gray-100"
          value={note.title}
          placeholder="Untitled"
          onChange={(e) => {
            updateNote(note.id, { title: e.target.value });
          }}
          onClick={(e) => e.stopPropagation()}
        />
        <button
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs px-1"
          onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
        >
          ...
        </button>
      </div>

      {/* Context menu */}
      {showMenu && (
        <div className="absolute top-7 right-1 z-[100] bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded shadow-lg py-1 text-sm min-w-[160px]">
          <button className="block w-full text-left px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-600" onClick={handleFitToContent}>
            Fit to content
          </button>
          <button className="block w-full text-left px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => { setEditingTags(!editingTags); setShowMenu(false); }}>
            Edit tags
          </button>

          {/* Move to column submenu */}
          {columns.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-600 mt-1 pt-1">
              <span className="block px-3 py-0.5 text-xs text-gray-500">Move to column:</span>
              {columns.map((col) => (
                <button
                  key={col.id}
                  className={`block w-full text-left px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-600 ${
                    note.column_id === col.id ? 'text-blue-600 font-medium' : ''
                  }`}
                  onClick={() => handleMoveToColumn(col.id)}
                >
                  {col.name}
                </button>
              ))}
              {isInColumn && (
                <button className="block w-full text-left px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-600 text-orange-500" onClick={handleRemoveFromColumn}>
                  Remove from column
                </button>
              )}
            </div>
          )}

          {/* Group submenu */}
          {groups.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-600 mt-1 pt-1">
              <span className="block px-3 py-0.5 text-xs text-gray-500">Group:</span>
              <button
                className={`block w-full text-left px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-600 ${!note.group_id ? 'font-medium' : ''}`}
                onClick={() => handleAssignGroup(null)}
              >
                None
              </button>
              {groups.map((g) => (
                <button
                  key={g.id}
                  className={`block w-full text-left px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-600 ${
                    note.group_id === g.id ? 'font-medium' : ''
                  }`}
                  onClick={() => handleAssignGroup(g.id)}
                >
                  <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: g.color }} />
                  {g.name}
                </button>
              ))}
            </div>
          )}

          <div className="border-t border-gray-200 dark:border-gray-600 mt-1 pt-1">
            <button className="block w-full text-left px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-600 text-red-500" onClick={handleDelete}>
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Editor area */}
      <div className="flex-1 overflow-y-auto note-content note-editor-area">
        <NoteEditor note={note} />
      </div>

      {/* Tags section */}
      {(parsedTags.length > 0 || editingTags) && (
        <div className="px-2 py-1 border-t border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex flex-wrap gap-1">
            {parsedTags.map((tag, i) => (
              <span key={i} className="inline-flex items-center text-xs bg-gray-200 dark:bg-gray-600 rounded px-1.5 py-0.5">
                {tag}
                {editingTags && (
                  <button className="ml-1 text-red-400 hover:text-red-600" onClick={() => handleRemoveTag(tag)}>x</button>
                )}
              </span>
            ))}
          </div>
          {editingTags && (
            <div className="flex gap-1 mt-1">
              <input
                className="flex-1 text-xs bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5"
                placeholder="Add tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTag();
                  if (e.key === 'Escape') setEditingTags(false);
                }}
              />
              <button className="text-xs text-blue-500" onClick={handleAddTag}>+</button>
              <button className="text-xs text-gray-500" onClick={() => setEditingTags(false)}>done</button>
            </div>
          )}
        </div>
      )}

      {/* Group indicator */}
      {group && (
        <div className="px-2 py-0.5 border-t border-gray-200 dark:border-gray-700 shrink-0">
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: group.color }} />
            {group.name}
          </span>
        </div>
      )}

      {/* Resize handle */}
      <div className="resize-handle" onMouseDown={handleResizeStart} />
    </div>
  );
}
