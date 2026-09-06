const express = require("express");
const multer = require("multer");
const { parse } = require("csv-parse/sync");
const { nanoid } = require("nanoid");
const db = require("../config/db");
const { ensureAuthenticated } = require("../middleware/auth");

const router = express.Router({ mergeParams: true });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

function getOwnedTask(taskId, userId) {
  return db.prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ?").get(taskId, userId);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// List participants for a task
router.get("/", ensureAuthenticated, (req, res) => {
  const task = getOwnedTask(req.params.id, req.user.id);
  if (!task) return res.status(404).json({ error: "Task not found" });

  const participants = db
    .prepare("SELECT * FROM participants WHERE task_id = ? ORDER BY created_at ASC")
    .all(task.id);
  res.json({ participants });
});

// Add one participant manually
router.post("/", ensureAuthenticated, (req, res) => {
  const task = getOwnedTask(req.params.id, req.user.id);
  if (!task) return res.status(404).json({ error: "Task not found" });

  const { name, email } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: "Name is required" });
  if (!email || !EMAIL_RE.test(email.trim())) return res.status(400).json({ error: "Valid email is required" });

  const id = nanoid();
  db.prepare("INSERT INTO participants (id, task_id, name, email) VALUES (?, ?, ?, ?)").run(
    id, task.id, name.trim(), email.trim().toLowerCase()
  );
  res.status(201).json({ participant: db.prepare("SELECT * FROM participants WHERE id = ?").get(id) });
});

// Bulk-upload participants via CSV (columns: name, email — case-insensitive, order-flexible)
router.post("/csv", ensureAuthenticated, upload.single("file"), (req, res) => {
  const task = getOwnedTask(req.params.id, req.user.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  if (!req.file) return res.status(400).json({ error: "No CSV file uploaded" });

  let records;
  try {
    records = parse(req.file.buffer.toString("utf-8"), {
      columns: (header) => header.map((h) => h.trim().toLowerCase()),
      skip_empty_lines: true,
      trim: true,
    });
  } catch (err) {
    return res.status(400).json({ error: "Could not parse CSV: " + err.message });
  }

  const insert = db.prepare("INSERT INTO participants (id, task_id, name, email) VALUES (?, ?, ?, ?)");
  const insertMany = db.transaction((rows) => {
    let added = 0;
    const skipped = [];
    for (const row of rows) {
      const name = row.name || row["full name"] || row["fullname"];
      const email = row.email || row["e-mail"] || row["gmail"];
      if (!name || !email || !EMAIL_RE.test(String(email).trim())) {
        skipped.push(row);
        continue;
      }
      insert.run(nanoid(), task.id, String(name).trim(), String(email).trim().toLowerCase());
      added++;
    }
    return { added, skipped };
  });

  const result = insertMany(records);
  res.json({
    added: result.added,
    skippedCount: result.skipped.length,
    skipped: result.skipped.slice(0, 20), // sample of what was skipped
  });
});

// Delete a participant
router.delete("/:pid", ensureAuthenticated, (req, res) => {
  const task = getOwnedTask(req.params.id, req.user.id);
  if (!task) return res.status(404).json({ error: "Task not found" });

  db.prepare("DELETE FROM participants WHERE id = ? AND task_id = ?").run(req.params.pid, task.id);
  res.json({ ok: true });
});

module.exports = router;
