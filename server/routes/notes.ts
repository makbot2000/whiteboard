import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';

const router = Router();

// Get all notes for a board
router.get('/', (req, res) => {
  const { board_id } = req.query;
  if (!board_id) return res.status(400).json({ error: 'board_id required' });
  const notes = db.prepare('SELECT * FROM notes WHERE board_id = ? ORDER BY position_in_column ASC, created_at ASC').all(board_id);
  res.json(notes);
});

// Create a note
router.post('/', (req, res) => {
  const { board_id, column_id, group_id, title, content_json, x, y, width, height, position_in_column, tags } = req.body;
  if (!board_id) return res.status(400).json({ error: 'board_id required' });

  const id = uuidv4();
  const stmt = db.prepare(`
    INSERT INTO notes (id, board_id, column_id, group_id, title, content_json, x, y, width, height, position_in_column, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    id,
    board_id,
    column_id || null,
    group_id || null,
    title || '',
    content_json ? JSON.stringify(content_json) : '{}',
    x ?? 100,
    y ?? 100,
    width ?? 280,
    height ?? 200,
    position_in_column ?? null,
    tags ? JSON.stringify(tags) : '[]'
  );
  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
  res.status(201).json(note);
});

// Update a note
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: 'Note not found' });

  const { title, content_json, x, y, width, height, column_id, group_id, position_in_column, tags } = req.body;

  const stmt = db.prepare(`
    UPDATE notes SET
      title = ?, content_json = ?, x = ?, y = ?, width = ?, height = ?,
      column_id = ?, group_id = ?, position_in_column = ?, tags = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `);
  stmt.run(
    title ?? existing.title,
    content_json !== undefined ? JSON.stringify(content_json) : existing.content_json,
    x ?? existing.x,
    y ?? existing.y,
    width ?? existing.width,
    height ?? existing.height,
    column_id !== undefined ? column_id : existing.column_id,
    group_id !== undefined ? group_id : existing.group_id,
    position_in_column !== undefined ? position_in_column : existing.position_in_column,
    tags !== undefined ? JSON.stringify(tags) : existing.tags,
    req.params.id
  );
  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
  res.json(note);
});

// Delete a note
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM notes WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

// Batch update positions (for drag reordering)
router.put('/batch/positions', (req, res) => {
  const { updates } = req.body; // [{id, x, y, column_id, position_in_column}]
  if (!Array.isArray(updates)) return res.status(400).json({ error: 'updates array required' });

  const stmt = db.prepare(`
    UPDATE notes SET x = ?, y = ?, column_id = ?, position_in_column = ?, updated_at = datetime('now')
    WHERE id = ?
  `);

  const transaction = db.transaction(() => {
    for (const u of updates) {
      stmt.run(u.x ?? null, u.y ?? null, u.column_id ?? null, u.position_in_column ?? null, u.id);
    }
  });
  transaction();
  res.json({ success: true });
});

export default router;
