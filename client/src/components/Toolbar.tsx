import { useState } from 'react';
import { useBoardStore } from '../stores/boardStore';

export default function Toolbar() {
  const { activeBoard, createNote, createColumn, createGroup, groups, notes, columns, updateNote, updateColumn, batchUpdatePositions } = useBoardStore();
  const [showGroupPanel, setShowGroupPanel] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#6366f1');
  const [sortMode, setSortMode] = useState<string>('freeform');

  const handleAddNote = () => {
    if (!activeBoard) return;
    const x = 200 + Math.random() * 300;
    const y = 100 + Math.random() * 200;
    createNote({ x, y, title: '', board_id: activeBoard.id } as any);
  };

  const handleAddColumn = () => {
    if (!activeBoard) return;
    const x = 100 + Math.random() * 200;
    const y = 50;
    createColumn({ x, y, name: 'New Column', board_id: activeBoard.id } as any);
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    createGroup({ name: newGroupName.trim(), color: newGroupColor });
    setNewGroupName('');
  };

  // Align columns side-by-side, freeform notes to the right
  const handleAlignColumns = () => {
    const padding = 20;
    const startX = 50;
    const startY = 50;

    let currentX = startX;

    // Sort columns by current x position to maintain relative order
    const sortedColumns = [...columns].sort((a, b) => a.x - b.x);

    // Position columns side by side
    for (const col of sortedColumns) {
      updateColumn(col.id, { x: currentX, y: startY });
      currentX += col.width + padding;
    }

    // Position freeform notes to the right of all columns
    const freeformNotes = notes.filter((n) => !n.column_id);
    if (freeformNotes.length > 0) {
      const noteCols = 3;
      const noteStartX = currentX + padding;
      let noteX = noteStartX;
      let noteY = startY;
      let maxHeightInRow = 0;
      let colCount = 0;

      for (const note of freeformNotes) {
        updateNote(note.id, { x: noteX, y: noteY });
        noteX += note.width + padding;
        maxHeightInRow = Math.max(maxHeightInRow, note.height);
        colCount++;

        if (colCount >= noteCols) {
          colCount = 0;
          noteX = noteStartX;
          noteY += maxHeightInRow + padding;
          maxHeightInRow = 0;
        }
      }
    }
  };

  // Canvas-level sort: arrange freeform notes into a grid
  const handleSort = (mode: string) => {
    setSortMode(mode);
    if (mode === 'freeform') return;

    const freeformNotes = notes.filter((n) => !n.column_id);
    let sorted = [...freeformNotes];

    if (mode === 'title') {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    } else if (mode === 'created') {
      sorted.sort((a, b) => a.created_at.localeCompare(b.created_at));
    } else if (mode === 'modified') {
      sorted.sort((a, b) => a.updated_at.localeCompare(b.updated_at));
    } else if (mode === 'tags') {
      sorted.sort((a, b) => {
        const tagsA = JSON.parse(a.tags || '[]').join(',');
        const tagsB = JSON.parse(b.tags || '[]').join(',');
        return tagsA.localeCompare(tagsB);
      });
    }

    // Arrange into a grid with proper spacing based on actual note sizes
    const cols = 4;
    const padding = 20; // gap between notes
    const startX = 50;
    const startY = 50;

    // Calculate max width and height per row/column to avoid overlap
    const rows: typeof sorted[] = [];
    for (let i = 0; i < sorted.length; i += cols) {
      rows.push(sorted.slice(i, i + cols));
    }

    let currentY = startY;
    const updates: { id: string; x: number; y: number }[] = [];

    for (const row of rows) {
      let currentX = startX;
      let maxHeightInRow = 0;

      for (const note of row) {
        updates.push({ id: note.id, x: currentX, y: currentY });
        currentX += note.width + padding;
        maxHeightInRow = Math.max(maxHeightInRow, note.height);
      }

      currentY += maxHeightInRow + padding;
    }

    // Update each note's position
    updates.forEach((u) => {
      updateNote(u.id, { x: u.x, y: u.y });
    });
  };

  const COLORS = ['#6366f1', '#ef4444', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#06b6d4'];

  return (
    <div className="absolute top-2 left-2 right-2 z-50 flex items-center justify-between pointer-events-none">
      {/* Left side: sort controls */}
      <div className="flex gap-2 pointer-events-auto">
        <select
          className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm shadow-md"
          value={sortMode}
          onChange={(e) => handleSort(e.target.value)}
        >
          <option value="freeform">Freeform</option>
          <option value="title">Sort: Title</option>
          <option value="created">Sort: Created</option>
          <option value="modified">Sort: Modified</option>
          <option value="tags">Sort: Tags</option>
        </select>
        <button
          className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 rounded text-sm shadow-md"
          onClick={handleAlignColumns}
          title="Align columns side-by-side, freeform notes to the right"
        >
          Align
        </button>
      </div>

      {/* Right side: action buttons */}
      <div className="flex gap-2 pointer-events-auto">
        <button
          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm shadow-md"
          onClick={() => setShowGroupPanel(!showGroupPanel)}
        >
          Groups
        </button>
        <button
          className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded text-sm shadow-md"
          onClick={handleAddColumn}
        >
          + Column
        </button>
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm shadow-md"
          onClick={handleAddNote}
        >
          + Note
        </button>
      </div>

      {/* Group management panel */}
      {showGroupPanel && (
        <div className="absolute top-10 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl p-3 min-w-[220px] pointer-events-auto">
          <h3 className="text-sm font-medium mb-2">Groups</h3>

          {/* Existing groups */}
          <div className="space-y-1 mb-2">
            {groups.length === 0 && (
              <p className="text-xs text-gray-500">No groups yet</p>
            )}
            {groups.map((g) => (
              <div key={g.id} className="flex items-center gap-2 text-sm">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
                <span className="flex-1 truncate">{g.name}</span>
              </div>
            ))}
          </div>

          {/* Create new group */}
          <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
            <div className="flex gap-1">
              <input
                className="flex-1 text-xs bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1"
                placeholder="Group name..."
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateGroup(); }}
              />
              <button className="text-xs bg-blue-600 text-white px-2 py-1 rounded" onClick={handleCreateGroup}>
                Add
              </button>
            </div>
            <div className="flex gap-1 mt-1 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  className={`w-5 h-5 rounded-full border-2 ${newGroupColor === c ? 'border-gray-900 dark:border-white' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setNewGroupColor(c)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
