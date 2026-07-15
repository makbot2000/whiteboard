import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';

const router = Router();

// Get all boards
router.get('/', (req, res) => {
  const boards = db.prepare('SELECT * FROM boards ORDER BY updated_at DESC').all();
  res.json(boards);
});

// Create a board
router.post('/', (req, res) => {
  const { name } = req.body;
  const id = uuidv4();
  const stmt = db.prepare('INSERT INTO boards (id, name) VALUES (?, ?)');
  stmt.run(id, name || 'Untitled Board');
  const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(id);
  res.status(201).json(board);
});

// Get a single board
router.get('/:id', (req, res) => {
  const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });
  res.json(board);
});

// Update a board
router.put('/:id', (req, res) => {
  const { name, zoom, pan_x, pan_y } = req.body;
  const existing = db.prepare('SELECT * FROM boards WHERE id = ?').get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: 'Board not found' });

  const stmt = db.prepare(`
    UPDATE boards SET name = ?, zoom = ?, pan_x = ?, pan_y = ?, updated_at = datetime('now')
    WHERE id = ?
  `);
  stmt.run(
    name ?? existing.name,
    zoom ?? existing.zoom,
    pan_x ?? existing.pan_x,
    pan_y ?? existing.pan_y,
    req.params.id
  );
  const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(req.params.id);
  res.json(board);
});

// Delete a board
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM boards WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

export default router;
