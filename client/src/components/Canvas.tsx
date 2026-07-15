import { useCallback, useRef, useState, useEffect } from 'react';
import { useBoardStore } from '../stores/boardStore';
import NoteCard from './NoteCard';
import ColumnContainer from './ColumnContainer';

export default function Canvas() {
  const { activeBoard, notes, columns, updateBoard, createNote, updateNote } = useBoardStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawRect, setDrawRect] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
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

  // Convert screen coordinates to canvas coordinates
  const screenToCanvas = (screenX: number, screenY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (screenX - rect.left - pan.x) / zoom,
      y: (screenY - rect.top - pan.y) / zoom,
    };
  };

  // Mouse wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey || e.shiftKey) {
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

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only act on clicks directly on the canvas background (the container div)
      if (e.target !== containerRef.current) return;

      // Ctrl+click or middle mouse: PAN
      if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
        e.preventDefault();
        setIsPanning(true);
        panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
        return;
      }

      // Left click on empty canvas: DRAW new note
      if (e.button === 0 && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setIsDrawing(true);
        const canvasPos = screenToCanvas(e.clientX, e.clientY);
        setDrawRect({ startX: canvasPos.x, startY: canvasPos.y, endX: canvasPos.x, endY: canvasPos.y });
      }
    },
    [pan, zoom]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        const dx = e.clientX - panStart.current.x;
        const dy = e.clientY - panStart.current.y;
        const newPan = { x: panStart.current.panX + dx, y: panStart.current.panY + dy };
        setPan(newPan);
        return;
      }

      if (isDrawing && drawRect) {
        const canvasPos = screenToCanvas(e.clientX, e.clientY);
        setDrawRect({ ...drawRect, endX: canvasPos.x, endY: canvasPos.y });
      }
    },
    [isPanning, isDrawing, drawRect, zoom, pan]
  );

  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      savePanZoom(pan, zoom);
      return;
    }

    if (isDrawing && drawRect) {
      setIsDrawing(false);
      const x = Math.min(drawRect.startX, drawRect.endX);
      const y = Math.min(drawRect.startY, drawRect.endY);
      const width = Math.abs(drawRect.endX - drawRect.startX);
      const height = Math.abs(drawRect.endY - drawRect.startY);

      // Only create a note if the drag was big enough (not just a click)
      if (width > 30 && height > 30) {
        createNote({
          x,
          y,
          width: Math.max(180, width),
          height: Math.max(100, height),
          title: '',
          board_id: activeBoard?.id,
        } as any);
      }
      setDrawRect(null);
    }
  }, [isPanning, isDrawing, drawRect, pan, zoom, savePanZoom, activeBoard, createNote]);

  // Freeform notes (not in a column)
  const freeformNotes = notes.filter((n) => !n.column_id);

  // Calculate draw rectangle for display
  const drawRectDisplay = drawRect
    ? {
        left: Math.min(drawRect.startX, drawRect.endX),
        top: Math.min(drawRect.startY, drawRect.endY),
        width: Math.abs(drawRect.endX - drawRect.startX),
        height: Math.abs(drawRect.endY - drawRect.startY),
      }
    : null;

  return (
    <div
      ref={containerRef}
      className={`flex-1 overflow-hidden relative ${isPanning ? 'canvas-panning' : isDrawing ? 'cursor-crosshair' : ''}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
      onDrop={(e) => {
        e.preventDefault();
        const noteId = e.dataTransfer.getData('text/note-id');
        if (!noteId) return;
        // Convert drop position to canvas coordinates
        const canvasPos = screenToCanvas(e.clientX, e.clientY);
        // Remove from column and set freeform position
        updateNote(noteId, { column_id: null, position_in_column: null, x: canvasPos.x, y: canvasPos.y } as any);
      }}
    >
      {/* Zoom indicator + pan hint */}
      <div className="absolute bottom-2 right-2 z-50 bg-gray-200 dark:bg-gray-800 rounded px-2 py-1 text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
        <div>{Math.round(zoom * 100)}%</div>
        <div className="text-[10px]">Ctrl+drag: pan | Drag: new note</div>
      </div>

      {/* Canvas transform layer */}
      <div
        className="canvas-layer"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100000px',
          height: '100000px',
        }}
      >
        {/* Draw rectangle preview */}
        {isDrawing && drawRectDisplay && drawRectDisplay.width > 5 && (
          <div
            className="absolute border-2 border-dashed border-blue-500 bg-blue-100/20 dark:bg-blue-900/20 rounded-lg pointer-events-none z-[100]"
            style={{
              left: drawRectDisplay.left,
              top: drawRectDisplay.top,
              width: drawRectDisplay.width,
              height: drawRectDisplay.height,
            }}
          />
        )}

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
