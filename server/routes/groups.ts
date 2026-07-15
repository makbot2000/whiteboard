import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';

const router = Router();

// Get all groups for a board
router.get('/', (req, res) => {
  const { board_id } = req.query;
  if (!board_id) return res.status(400).json({ error: 'board_id required' });
  const groups = db.prepare('SELECT * FROM groups WHERE board_id = ? ORDER BY name ASC').all(board_id);
  res.json(groups);
});

// Create a group
router.post('/', (req, res) => {
  const { board_id, name, color } = req.body;
  if (!board_id) return res.status(400).json({ error: 'board_id required' });

  const id = uuidv4();
  const stmt = db.prepare('INSERT INTO groups (id, board_id, name, color) VALUES (?, ?, ?, ?)');
  stmt.run(id, board_id, name || 'New Group', color || '#6366f1');
  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(id);
  res.status(201).json(group);
});

// Update a group
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM groups WHERE id = ?').get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: 'Group not found' });

  const { name, color } = req.body;
  const stmt = db.prepare('UPDATE groups SET name = ?, color = ? WHERE id = ?');
  stmt.run(name ?? existing.name, color ?? existing.color, req.params.id);
  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(req.params.id);
  res.json(group);
});

// Delete a group
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM groups WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

export default router;
