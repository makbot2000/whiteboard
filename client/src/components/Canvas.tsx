import { useCallback, useRef, useState, useEffect } from 'react';
import { useBoardStore } from '../stores/boardStore';
import NoteCard from './NoteCard';
import ColumnContainer from './ColumnContainer';

export default function Canvas() {
  const { activeBoard, notes, columns, updateBoard } = useBoardStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Load saved pan/zoom from board
  useEffect(() => {
    if (activeBoard) {
      setPan({ x: activeBoard.pan_x || 0, y: activeBoard.pan_y || 0 });
      setZoom(activeBoard.zoom || 1);
    }
  }, [activeBoard?.id]);

  // Save pan/zoom to board (debounced)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savePanZoom = useCallback(
    (newPan: { x: number; y: number }, newZoom: number) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        if (activeBoard) {
          updateBoard(activeBoard.id, { pan_x: newPan.x, pan_y: newPan.y, zoom: newZoom } as any);
        }
      }, 500);
    },
    [activeBoard, updateBoard]
  );

  // Mouse wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.2, Math.min(3, zoom * delta));
        setZoom(newZoom);
        savePanZoom(pan, newZoom);
      } else {
        // Pan with scroll
        const newPan = { x: pan.x - e.deltaX, y: pan.y - e.deltaY };
        setPan(newPan);
        savePanZoom(newPan, zoom);
      }
    },
    [zoom, pan, savePanZoom]
  );

  // Middle mouse pan
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        e.preventDefault();
        setIsPanning(true);
        panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
      }
    },
    [pan]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return;
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      const newPan = { x: panStart.current.panX + dx, y: panStart.current.panY + dy };
      setPan(newPan);
    },
    [isPanning]
  );

  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      savePanZoom(pan, zoom);
    }
  }, [isPanning, pan, zoom, savePanZoom]);

  // Freeform notes (not in a column)
  const freeformNotes = notes.filter((n) => !n.column_id);

  return (
    <div
      ref={containerRef}
      className={`flex-1 overflow-hidden relative ${isPanning ? 'canvas-panning' : ''}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Zoom indicator */}
      <div className="absolute bottom-2 right-2 z-50 bg-gray-200 dark:bg-gray-800 rounded px-2 py-1 text-xs text-gray-600 dark:text-gray-400">
        {Math.round(zoom * 100)}%
      </div>

      {/* Canvas transform layer */}
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '1px',
          height: '1px',
        }}
      >
        {/* Columns */}
        {columns.map((col) => (
          <ColumnContainer key={col.id} column={col} />
        ))}

        {/* Freeform notes */}
        {freeformNotes.map((note) => (
          <NoteCard key={note.id} note={note} />
        ))}
      </div>
    </div>
  );
}
