const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const { DB_DIR } = require("./paths");

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(path.join(DB_DIR, "app.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  google_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  avatar TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expiry INTEGER,
  drive_folder_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  template_path TEXT,
  template_drive_id TEXT,
  template_mime_type TEXT,
  template_width INTEGER,
  template_height INTEGER,
  name_x REAL DEFAULT 50,
  name_y REAL DEFAULT 50,
  font_size INTEGER DEFAULT 48,
  font_color TEXT DEFAULT '#1a1a1a',
  font_family TEXT DEFAULT 'Poppins',
  text_align TEXT DEFAULT 'middle',
  email_subject TEXT DEFAULT 'Your Certificate',
  email_body TEXT DEFAULT 'Hi {{name}},\n\nCongratulations! Please find your certificate attached.\n\nBest regards',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  certificate_path TEXT,
  certificate_drive_id TEXT,
  status TEXT DEFAULT 'pending', -- pending | generated | sent | failed
  error TEXT,
  sent_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_task ON participants(task_id);
`);

// Lightweight migration for databases created before Drive storage support existed
function ensureColumn(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}
ensureColumn("users", "drive_folder_id", "TEXT");
ensureColumn("tasks", "template_drive_id", "TEXT");
ensureColumn("tasks", "template_mime_type", "TEXT");
ensureColumn("tasks", "drive_folder_id", "TEXT");
ensureColumn("tasks", "font_style", "TEXT DEFAULT 'normal'");
ensureColumn("participants", "certificate_drive_id", "TEXT");

module.exports = db;
