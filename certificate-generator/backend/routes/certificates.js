const express = require("express");
const path = require("path");
const fs = require("fs");
const archiver = require("archiver");
const db = require("../config/db");
const { ensureAuthenticated } = require("../middleware/auth");
const { generateCertificate } = require("../services/certificateGenerator");
const { sendCertificateEmail } = require("../services/gmailService");
const { BASE_DIR } = require("../config/paths");

const router = express.Router({ mergeParams: true });

function getOwnedTask(taskId, userId) {
  return db.prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ?").get(taskId, userId);
}

// Generate certificates for ALL pending/failed participants in this task
router.post("/generate", ensureAuthenticated, async (req, res) => {
  const task = getOwnedTask(req.params.id, req.user.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  if (!task.template_path) return res.status(400).json({ error: "Upload a template first" });

  const participants = db
    .prepare("SELECT * FROM participants WHERE task_id = ?")
    .all(task.id);

  if (participants.length === 0) {
    return res.status(400).json({ error: "No participants to generate for" });
  }

  const results = { success: 0, failed: 0, errors: [] };

  for (const p of participants) {
    try {
      const certPath = await generateCertificate({ task, participantId: p.id, name: p.name });
      db.prepare("UPDATE participants SET certificate_path = ?, status = 'generated', error = NULL WHERE id = ?").run(
        certPath, p.id
      );
      results.success++;
    } catch (err) {
      db.prepare("UPDATE participants SET status = 'failed', error = ? WHERE id = ?").run(err.message, p.id);
      results.failed++;
      results.errors.push({ participant: p.name, error: err.message });
    }
  }

  res.json({ results });
});

// Send emails (with attached certificate) to all participants with status = 'generated'
router.post("/send", ensureAuthenticated, async (req, res) => {
  const task = getOwnedTask(req.params.id, req.user.id);
  if (!task) return res.status(404).json({ error: "Task not found" });

  const participants = db
    .prepare("SELECT * FROM participants WHERE task_id = ? AND status = 'generated'")
    .all(task.id);

  if (participants.length === 0) {
    return res.status(400).json({ error: "No generated certificates ready to send. Generate first." });
  }

  const results = { sent: 0, failed: 0, errors: [] };

  for (const p of participants) {
    try {
      const attachmentPath = path.join(BASE_DIR, p.certificate_path);
      const body = (task.email_body || "").replace(/\{\{\s*name\s*\}\}/gi, p.name);
      const subject = (task.email_subject || "Your Certificate").replace(/\{\{\s*name\s*\}\}/gi, p.name);

      await sendCertificateEmail({
        user: req.user,
        to: p.email,
        subject,
        body,
        attachmentPath,
      });

      db.prepare("UPDATE participants SET status = 'sent', sent_at = datetime('now'), error = NULL WHERE id = ?").run(p.id);
      results.sent++;
    } catch (err) {
      db.prepare("UPDATE participants SET error = ? WHERE id = ?").run(err.message, p.id);
      results.failed++;
      results.errors.push({ participant: p.name, email: p.email, error: err.message });
    }
  }

  res.json({ results });
});

// Preview / download a single participant's certificate image
router.get("/:pid/preview", ensureAuthenticated, (req, res) => {
  const task = getOwnedTask(req.params.id, req.user.id);
  if (!task) return res.status(404).json({ error: "Task not found" });

  const participant = db
    .prepare("SELECT * FROM participants WHERE id = ? AND task_id = ?")
    .get(req.params.pid, task.id);

  if (!participant || !participant.certificate_path) {
    return res.status(404).json({ error: "Certificate not generated yet" });
  }

  const fullPath = path.join(BASE_DIR, participant.certificate_path);
  if (!fs.existsSync(fullPath)) return res.status(404).json({ error: "File missing on disk" });
  res.sendFile(fullPath);
});

// Download all generated certificates for a task as a single zip
router.get("/download-all", ensureAuthenticated, (req, res) => {
  const task = getOwnedTask(req.params.id, req.user.id);
  if (!task) return res.status(404).json({ error: "Task not found" });

  const participants = db
    .prepare("SELECT * FROM participants WHERE task_id = ? AND certificate_path IS NOT NULL")
    .all(task.id);

  if (participants.length === 0) return res.status(400).json({ error: "No certificates generated yet" });

  res.attachment(`${task.title.replace(/[^a-z0-9_\-]+/gi, "_")}_certificates.zip`);
  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.on("error", (err) => res.status(500).send({ error: err.message }));
  archive.pipe(res);

  for (const p of participants) {
    const fullPath = path.join(BASE_DIR, p.certificate_path);
    if (fs.existsSync(fullPath)) {
      const safeName = p.name.replace(/[^a-z0-9_\-]+/gi, "_");
      archive.file(fullPath, { name: `${safeName}.png` });
    }
  }

  archive.finalize();
});

module.exports = router;
