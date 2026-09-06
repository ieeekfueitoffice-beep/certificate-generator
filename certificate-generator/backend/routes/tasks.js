const express = require("express");
const multer = require("multer");
const { nanoid } = require("nanoid");
const sharp = require("sharp");
const path = require("path");
const db = require("../config/db");
const { ensureAuthenticated } = require("../middleware/auth");
const driveService = require("../services/driveService");
const { FONT_CATALOG, isValidFontKey } = require("../config/fontCatalog");

const router = express.Router();

// Templates are held in memory only long enough to read their dimensions
// and upload them straight to Google Drive - never written to local disk.
const upload = multer({
  storage: multer.memoryStorage(),
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

// Delete a task (cascades to participants via FK). Also removes its
// template file from Drive - participant certificates are cleaned up
// individually since each is a separate Drive file.
router.delete("/:id", ensureAuthenticated, async (req, res) => {
  const task = getOwnedTask(req.params.id, req.user.id);
  if (!task) return res.status(404).json({ error: "Task not found" });

  if (task.template_drive_id) {
    await driveService.deleteFile(req.user, task.template_drive_id);
  }
  const participants = db.prepare("SELECT certificate_drive_id FROM participants WHERE task_id = ?").all(task.id);
  for (const p of participants) {
    if (p.certificate_drive_id) await driveService.deleteFile(req.user, p.certificate_drive_id);
  }

  db.prepare("DELETE FROM tasks WHERE id = ?").run(task.id);
  res.json({ ok: true });
});

// Upload / replace certificate template image - stored in the user's Drive
router.post("/:id/template", ensureAuthenticated, upload.single("template"), async (req, res) => {
  const task = getOwnedTask(req.params.id, req.user.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  try {
    const metadata = await sharp(req.file.buffer).metadata();
    const folderId = await driveService.ensureTaskFolder(req.user, task);

    const driveFileId = await driveService.uploadFile(req.user, {
      buffer: req.file.buffer,
      filename: `template${path.extname(req.file.originalname) || ".png"}`,
      mimeType: req.file.mimetype,
      folderId,
    });

    // Clean up the old template in Drive if we're replacing one
    if (task.template_drive_id) {
      await driveService.deleteFile(req.user, task.template_drive_id);
    }

    db.prepare(
      "UPDATE tasks SET template_drive_id = ?, template_mime_type = ?, template_width = ?, template_height = ? WHERE id = ?"
    ).run(driveFileId, req.file.mimetype, metadata.width, metadata.height, task.id);

    const updated = db.prepare("SELECT * FROM tasks WHERE id = ?").get(task.id);
    res.json({ task: updated });
  } catch (err) {
    res.status(500).json({ error: "Failed to process/upload image: " + err.message });
  }
});

// Streams the template image from Drive so the frontend can display it
// without needing direct Drive access itself
router.get("/:id/template/preview", ensureAuthenticated, async (req, res) => {
  const task = getOwnedTask(req.params.id, req.user.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  if (!task.template_drive_id) return res.status(404).json({ error: "No template uploaded yet" });

  try {
    const buffer = await driveService.downloadFile(req.user, task.template_drive_id);
    res.set("Content-Type", task.template_mime_type || "image/png");
    res.set("Cache-Control", "private, max-age=60");
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: "Could not load template from Drive: " + err.message });
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
    font_style,
    text_align,
    email_subject,
    email_body,
  } = req.body;

  if (font_family !== undefined && font_family !== null && !isValidFontKey(font_family)) {
    return res.status(400).json({ error: "Unknown font selected" });
  }
  if (font_style !== undefined && font_style !== null && !["normal", "italic"].includes(font_style)) {
    return res.status(400).json({ error: "font_style must be 'normal' or 'italic'" });
  }

  db.prepare(
    `UPDATE tasks SET
      name_x = COALESCE(?, name_x),
      name_y = COALESCE(?, name_y),
      font_size = COALESCE(?, font_size),
      font_color = COALESCE(?, font_color),
      font_family = COALESCE(?, font_family),
      font_style = COALESCE(?, font_style),
      text_align = COALESCE(?, text_align),
      email_subject = COALESCE(?, email_subject),
      email_body = COALESCE(?, email_body)
     WHERE id = ?`
  ).run(
    name_x, name_y, font_size, font_color, font_family, font_style, text_align, email_subject, email_body,
    task.id
  );

  const updated = db.prepare("SELECT * FROM tasks WHERE id = ?").get(task.id);
  res.json({ task: updated });
});

// Returns the catalog of available fonts for the frontend's font picker
router.get("/meta/fonts", ensureAuthenticated, (req, res) => {
  res.json({ fonts: FONT_CATALOG });
});

module.exports = router;
