import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'whiteboard.db');
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS boards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    zoom REAL DEFAULT 1.0,
    pan_x REAL DEFAULT 0,
    pan_y REAL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#6366f1',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS columns (
    id TEXT PRIMARY KEY,
    board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    x REAL NOT NULL DEFAULT 0,
    y REAL NOT NULL DEFAULT 0,
    width REAL DEFAULT 300,
    height REAL DEFAULT 400,
    layout_mode TEXT DEFAULT 'freeform',
    grid_columns INTEGER DEFAULT 1,
    link_group_id TEXT,
    sort_by TEXT DEFAULT 'manual',
    sort_order TEXT DEFAULT 'asc',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    column_id TEXT REFERENCES columns(id) ON DELETE SET NULL,
    group_id TEXT REFERENCES groups(id) ON DELETE SET NULL,
    title TEXT DEFAULT '',
    content_json TEXT DEFAULT '{}',
    x REAL DEFAULT 100,
    y REAL DEFAULT 100,
    width REAL DEFAULT 280,
    height REAL DEFAULT 200,
    position_in_column INTEGER,
    tags TEXT DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

export default db;

// Migrations for existing databases
try {
  db.exec(`ALTER TABLE columns ADD COLUMN height REAL DEFAULT 400`);
} catch (e) { /* column already exists */ }
try {
  db.exec(`ALTER TABLE columns ADD COLUMN layout_mode TEXT DEFAULT 'freeform'`);
} catch (e) { /* column already exists */ }
try {
  db.exec(`ALTER TABLE columns ADD COLUMN grid_columns INTEGER DEFAULT 1`);
} catch (e) { /* column already exists */ }
try {
  db.exec(`ALTER TABLE columns ADD COLUMN link_group_id TEXT`);
} catch (e) { /* column already exists */ }
