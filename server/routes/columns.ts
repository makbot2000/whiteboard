import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';

const router = Router();

// Get all columns for a board
router.get('/', (req, res) => {
  const { board_id } = req.query;
  if (!board_id) return res.status(400).json({ error: 'board_id required' });
  const columns = db.prepare('SELECT * FROM columns WHERE board_id = ? ORDER BY x ASC').all(board_id);
  res.json(columns);
});

// Create a column
router.post('/', (req, res) => {
  const { board_id, name, x, y, width } = req.body;
  if (!board_id) return res.status(400).json({ error: 'board_id required' });

  const id = uuidv4();
  const stmt = db.prepare('INSERT INTO columns (id, board_id, name, x, y, width) VALUES (?, ?, ?, ?, ?, ?)');
  stmt.run(id, board_id, name || 'New Column', x ?? 0, y ?? 0, width ?? 300);
  const column = db.prepare('SELECT * FROM columns WHERE id = ?').get(id);
  res.status(201).json(column);
});

// Update a column
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM columns WHERE id = ?').get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: 'Column not found' });

  const { name, x, y, width, sort_by, sort_order } = req.body;
  const stmt = db.prepare(`
    UPDATE columns SET name = ?, x = ?, y = ?, width = ?, sort_by = ?, sort_order = ?, updated_at = datetime('now')
    WHERE id = ?
  `);
  stmt.run(
    name ?? existing.name,
    x ?? existing.x,
    y ?? existing.y,
    width ?? existing.width,
    sort_by ?? existing.sort_by,
    sort_order ?? existing.sort_order,
    req.params.id
  );
  const column = db.prepare('SELECT * FROM columns WHERE id = ?').get(req.params.id);
  res.json(column);
});

// Delete a column (notes become freeform)
router.delete('/:id', (req, res) => {
  // Notes in this column will have column_id set to NULL via ON DELETE SET NULL
  db.prepare('DELETE FROM columns WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

export default router;
