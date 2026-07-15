import { useState, useRef, useCallback, useEffect } from 'react';
import { useBoardStore } from '../stores/boardStore';
import type { Note } from '../types';
import NoteEditor from './NoteEditor';

interface Props {
  note: Note;
  inColumn?: boolean;
  inFreeformColumn?: boolean;
  inGridColumn?: boolean;
}

export default function NoteCard({ note, inColumn = false, inFreeformColumn = false, inGridColumn = false }: Props) {
  const { updateNote, deleteNote, groups, columns, boards, activeBoard, copyNote, moveNote } = useBoardStore();
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [position, setPosition] = useState({ x: note.x, y: note.y });
  const [size, setSize] = useState({ width: note.width, height: note.height });
  const [showMenu, setShowMenu] = useState(false);
  const [editingTags, setEditingTags] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const dragStart = useRef({ x: 0, y: 0, noteX: 0, noteY: 0 });
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPosition({ x: note.x, y: note.y });
    setSize({ width: note.width, height: note.height });
  }, [note.x, note.y, note.width, note.height]);

  // Drag handlers — works for freeform notes AND notes in freeform columns
  const handleDragStart = (e: React.MouseEvent) => {
    // In a grid column, don't allow free dragging
    if (inColumn && !inFreeformColumn) return;
    if ((e.target as HTMLElement).closest('.note-editor-area') || (e.target as HTMLElement).closest('.resize-handle')) return;
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, noteX: position.x, noteY: position.y };

    const trackMove = (ev: MouseEvent) => {
      (window as any)._lastDragX = ev.clientX - dragStart.current.x;
      (window as any)._lastDragY = ev.clientY - dragStart.current.y;
      setPosition({
        x: dragStart.current.noteX + (ev.clientX - dragStart.current.x),
        y: dragStart.current.noteY + (ev.clientY - dragStart.current.y),
      });
    };

    document.addEventListener('mousemove', trackMove);
    document.addEventListener('mouseup', () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', trackMove);
      const finalX = dragStart.current.noteX + ((window as any)._lastDragX || 0);
      const finalY = dragStart.current.noteY + ((window as any)._lastDragY || 0);
      setPosition({ x: finalX, y: finalY });
      updateNote(note.id, { x: finalX, y: finalY });

      // Check if dropped over a column
      checkDropOnColumn(finalX, finalY);
    }, { once: true });
  };

  // Check if note was dropped over a column area
  const checkDropOnColumn = (noteX: number, noteY: number) => {
    for (const col of columns) {
      const colRight = col.x + col.width;
      const colBottom = col.y + 800; // approximate column height
      if (noteX >= col.x && noteX <= colRight && noteY >= col.y && noteY <= colBottom) {
        // Drop into this column
        if (note.column_id !== col.id) {
          updateNote(note.id, { column_id: col.id, position_in_column: 999 } as any);
        }
        return;
      }
    }
  };

  // HTML5 drag for column reordering
  const handleNativeDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/note-id', note.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Resize handlers
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStart.current = { x: e.clientX, y: e.clientY, w: size.width, h: size.height };

    const trackMove = (ev: MouseEvent) => {
      const dw = ev.clientX - resizeStart.current.x;
      const dh = ev.clientY - resizeStart.current.y;
      setSize({
        width: Math.max(180, resizeStart.current.w + dw),
        height: Math.max(100, resizeStart.current.h + dh),
      });
    };

    document.addEventListener('mousemove', trackMove);
    document.addEventListener('mouseup', () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', trackMove);
      updateNote(note.id, { width: size.width, height: size.height });
    }, { once: true });
  };

  // Fit/auto-size to content
  const handleFitToContent = () => {
    const editorEl = cardRef.current?.querySelector('.tiptap');
    if (editorEl) {
      const newHeight = Math.max(100, editorEl.scrollHeight + 90); // title + toolbar + padding
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
      ref={cardRef}
      data-note-id={note.id}
      draggable={inColumn && !inFreeformColumn && !inGridColumn}
      onDragStart={inColumn && !inFreeformColumn && !inGridColumn ? handleNativeDragStart : undefined}
      className={`rounded-lg shadow-lg border bg-white dark:bg-gray-800 flex flex-col ${
        isDragging ? 'opacity-80 shadow-2xl z-50' : 'z-10'
      } ${isResizing ? 'select-none' : ''} ${
        inGridColumn ? 'relative' :
        inColumn && !inFreeformColumn ? 'relative cursor-grab' :
        inFreeformColumn ? 'absolute' :
        'absolute'
      }`}
      style={{
        ...(inGridColumn ? {} : inColumn && !inFreeformColumn ? {} : { left: position.x, top: position.y }),
        width: inGridColumn ? '100%' : inColumn && !inFreeformColumn ? '100%' : size.width,
        height: size.height,
        borderColor: borderColor || (isDragging ? '#3b82f6' : undefined),
        borderWidth: borderColor ? 2 : undefined,
      }}
    >
      {/* Title bar / drag handle - tall and easy to grab */}
      <div
        className="flex items-center gap-1 px-3 py-2 border-b border-gray-200 dark:border-gray-700 select-none shrink-0 cursor-move bg-gray-50 dark:bg-gray-750 rounded-t-lg"
        onMouseDown={handleDragStart}
      >
        <div className="w-4 shrink-0 flex flex-col gap-[2px] opacity-40">
          <div className="h-[2px] bg-gray-400 rounded" />
          <div className="h-[2px] bg-gray-400 rounded" />
          <div className="h-[2px] bg-gray-400 rounded" />
        </div>
        <input
          className="flex-1 bg-transparent text-sm font-medium outline-none placeholder-gray-400 text-gray-900 dark:text-gray-100 cursor-text"
          value={note.title}
          placeholder="Untitled"
          onChange={(e) => {
            updateNote(note.id, { title: e.target.value });
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        />
        <button
          className="text-gray-400 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 text-sm px-1"
          onClick={(e) => { e.stopPropagation(); handleFitToContent(); }}
          onMouseDown={(e) => e.stopPropagation()}
          title="Fit to content"
        >
          ⤢
        </button>
        <button
          className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200 text-xs px-1"
          onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          ...
        </button>
      </div>

      {/* Context menu */}
      {showMenu && (
        <div className="absolute top-7 right-1 z-[100] bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded shadow-lg py-1 text-sm min-w-[160px]">
          <button className="block w-full text-left px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100" onClick={() => { setEditingTags(!editingTags); setShowMenu(false); }}>
            Edit tags
          </button>

          {/* Move to column submenu */}
          {columns.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-600 mt-1 pt-1">
              <span className="block px-3 py-0.5 text-xs text-gray-500 dark:text-gray-400">Move to column:</span>
              {columns.map((col) => (
                <button
                  key={col.id}
                  className={`block w-full text-left px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-600 ${
                    note.column_id === col.id ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-900 dark:text-gray-100'
                  }`}
                  onClick={() => handleMoveToColumn(col.id)}
                >
                  {col.name}
                </button>
              ))}
              {isInColumn && (
                <button className="block w-full text-left px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-600 text-orange-500 dark:text-orange-400" onClick={handleRemoveFromColumn}>
                  Remove from column
                </button>
              )}
            </div>
          )}

          {/* Group submenu */}
          {groups.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-600 mt-1 pt-1">
              <span className="block px-3 py-0.5 text-xs text-gray-500 dark:text-gray-400">Group:</span>
              <button
                className={`block w-full text-left px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-600 ${!note.group_id ? 'font-medium' : ''} text-gray-900 dark:text-gray-100`}
                onClick={() => handleAssignGroup(null)}
              >
                None
              </button>
              {groups.map((g) => (
                <button
                  key={g.id}
                  className={`block w-full text-left px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 ${
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
            <button className="block w-full text-left px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-600 text-red-500 dark:text-red-400" onClick={handleDelete}>
              Delete
            </button>
          </div>

          {/* Send to another board */}
          {boards.length > 1 && (
            <div className="border-t border-gray-200 dark:border-gray-600 mt-1 pt-1">
              <span className="block px-3 py-0.5 text-xs text-gray-500 dark:text-gray-400">Send to board:</span>
              {boards.filter((b) => b.id !== activeBoard?.id).map((b) => (
                <div key={b.id} className="flex items-center px-3 py-0.5 gap-1">
                  <button
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    onClick={() => { copyNote(note.id, b.id); setShowMenu(false); }}
                  >
                    Copy
                  </button>
                  <span className="text-xs text-gray-400">|</span>
                  <button
                    className="text-xs text-orange-600 dark:text-orange-400 hover:underline"
                    onClick={() => { moveNote(note.id, b.id); setShowMenu(false); }}
                  >
                    Move
                  </button>
                  <span className="text-xs text-gray-700 dark:text-gray-300 truncate flex-1">{b.name}</span>
                </div>
              ))}
            </div>
          )}
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
              <span key={i} className="inline-flex items-center text-xs bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded px-1.5 py-0.5">
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
                className="flex-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5"
                placeholder="Add tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTag();
                  if (e.key === 'Escape') setEditingTags(false);
                }}
              />
              <button className="text-xs text-blue-500 dark:text-blue-400" onClick={handleAddTag}>+</button>
              <button className="text-xs text-gray-500 dark:text-gray-400" onClick={() => setEditingTags(false)}>done</button>
            </div>
          )}
        </div>
      )}

      {/* Group indicator */}
      {group && (
        <div className="px-2 py-0.5 border-t border-gray-200 dark:border-gray-700 shrink-0">
          <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: group.color }} />
            {group.name}
          </span>
        </div>
      )}

      {/* Resize handle — show for freeform notes and notes in freeform columns */}
      {(!inColumn || inFreeformColumn) && <div className="resize-handle" onMouseDown={handleResizeStart} />}
    </div>
  );
}
