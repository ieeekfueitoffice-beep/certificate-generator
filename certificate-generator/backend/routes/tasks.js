const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { nanoid } = require("nanoid");
const sharp = require("sharp");
const db = require("../config/db");
const { ensureAuthenticated } = require("../middleware/auth");
const { TEMPLATE_DIR, BASE_DIR } = require("../config/paths");

const router = express.Router();

if (!fs.existsSync(TEMPLATE_DIR)) fs.mkdirSync(TEMPLATE_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, TEMPLATE_DIR),
    filename: (req, file, cb) => cb(null, `${nanoid()}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (req, file, cb) => {
    const ok = ["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(file.mimetype);
    cb(ok ? null : new Error("Template must be a PNG, JPG, or WEBP image"), ok);
  },
});

// Helper: verify the task belongs to the logged-in user
function getOwnedTask(taskId, userId) {
  return db.prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ?").get(taskId, userId);
}

// List all tasks for logged-in user, with participant counts
router.get("/", ensureAuthenticated, (req, res) => {
  const tasks = db
    .prepare(
      `SELECT t.*,
        (SELECT COUNT(*) FROM participants p WHERE p.task_id = t.id) as total_participants,
        (SELECT COUNT(*) FROM participants p WHERE p.task_id = t.id AND p.status = 'generated') as generated_count,
        (SELECT COUNT(*) FROM participants p WHERE p.task_id = t.id AND p.status = 'sent') as sent_count
       FROM tasks t WHERE t.user_id = ? ORDER BY t.created_at DESC`
    )
    .all(req.user.id);
  res.json({ tasks });
});

// Create a new task/event
router.post("/", ensureAuthenticated, (req, res) => {
  const { title, description } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: "Title is required" });

  const id = nanoid();
  db.prepare(`INSERT INTO tasks (id, user_id, title, description) VALUES (?, ?, ?, ?)`).run(
    id,
    req.user.id,
    title.trim(),
    description || ""
  );
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
  res.status(201).json({ task });
});

// Get single task detail
router.get("/:id", ensureAuthenticated, (req, res) => {
  const task = getOwnedTask(req.params.id, req.user.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  res.json({ task });
});

// Delete a task (cascades to participants via FK)
router.delete("/:id", ensureAuthenticated, (req, res) => {
  const task = getOwnedTask(req.params.id, req.user.id);
  if (!task) return res.status(404).json({ error: "Task not found" });

  if (task.template_path) {
    const p = path.join(BASE_DIR, task.template_path);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  db.prepare("DELETE FROM tasks WHERE id = ?").run(task.id);
  res.json({ ok: true });
});

// Upload / replace certificate template image
router.post("/:id/template", ensureAuthenticated, upload.single("template"), async (req, res) => {
  const task = getOwnedTask(req.params.id, req.user.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  try {
    const metadata = await sharp(req.file.path).metadata();
    const relPath = path.join("uploads", "templates", req.file.filename);

    // Clean up old template if replacing
    if (task.template_path) {
      const oldPath = path.join(BASE_DIR, task.template_path);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    db.prepare(
      "UPDATE tasks SET template_path = ?, template_width = ?, template_height = ? WHERE id = ?"
    ).run(relPath, metadata.width, metadata.height, task.id);

    const updated = db.prepare("SELECT * FROM tasks WHERE id = ?").get(task.id);
    res.json({ task: updated });
  } catch (err) {
    res.status(500).json({ error: "Failed to process image: " + err.message });
  }
});

// Update name-placement + styling + email text config
router.put("/:id/settings", ensureAuthenticated, (req, res) => {
  const task = getOwnedTask(req.params.id, req.user.id);
  if (!task) return res.status(404).json({ error: "Task not found" });

  const {
    name_x,
    name_y,
    font_size,
    font_color,
    font_family,
    text_align,
    email_subject,
    email_body,
  } = req.body;

  db.prepare(
    `UPDATE tasks SET
      name_x = COALESCE(?, name_x),
      name_y = COALESCE(?, name_y),
      font_size = COALESCE(?, font_size),
      font_color = COALESCE(?, font_color),
      font_family = COALESCE(?, font_family),
      text_align = COALESCE(?, text_align),
      email_subject = COALESCE(?, email_subject),
      email_body = COALESCE(?, email_body)
     WHERE id = ?`
  ).run(
    name_x, name_y, font_size, font_color, font_family, text_align, email_subject, email_body,
    task.id
  );

  const updated = db.prepare("SELECT * FROM tasks WHERE id = ?").get(task.id);
  res.json({ task: updated });
});

module.exports = router;
