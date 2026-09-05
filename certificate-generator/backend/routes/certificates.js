const express = require("express");
const archiver = require("archiver");
const db = require("../config/db");
const { ensureAuthenticated } = require("../middleware/auth");
const { generateCertificate } = require("../services/certificateGenerator");
const { sendCertificateEmail } = require("../services/gmailService");
const driveService = require("../services/driveService");
const { markupToHtml, markupToPlainText } = require("../services/emailFormatting");

const router = express.Router({ mergeParams: true });

function getOwnedTask(taskId, userId) {
  return db.prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ?").get(taskId, userId);
}

// Generate certificates for ALL participants in this task (re-runs for
// everyone, including previously generated/sent ones, so edits to the
// template or name position can be re-applied on demand)
router.post("/generate", ensureAuthenticated, async (req, res) => {
  const task = getOwnedTask(req.params.id, req.user.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  if (!task.template_drive_id) return res.status(400).json({ error: "Upload a template first" });

  const participants = db
    .prepare("SELECT * FROM participants WHERE task_id = ?")
    .all(task.id);

  if (participants.length === 0) {
    return res.status(400).json({ error: "No participants to generate for" });
  }

  const results = { success: 0, failed: 0, errors: [] };

  for (const p of participants) {
    try {
      const driveFileId = await generateCertificate({ user: req.user, task, participantId: p.id, name: p.name });

      // Clean up the previous certificate file in Drive if regenerating
      if (p.certificate_drive_id) {
        await driveService.deleteFile(req.user, p.certificate_drive_id);
      }

      db.prepare("UPDATE participants SET certificate_drive_id = ?, status = 'generated', error = NULL WHERE id = ?").run(
        driveFileId, p.id
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
      const attachmentBuffer = await driveService.downloadFile(req.user, p.certificate_drive_id);
      const rawBody = (task.email_body || "").replace(/\{\{\s*name\s*\}\}/gi, p.name);
      const subject = (task.email_subject || "Your Certificate").replace(/\{\{\s*name\s*\}\}/gi, p.name);

      await sendCertificateEmail({
        user: req.user,
        to: p.email,
        subject,
        textBody: markupToPlainText(rawBody),
        htmlBody: markupToHtml(rawBody),
        attachmentBuffer,
        attachmentFilename: `${p.name.replace(/[^a-z0-9_\-]+/gi, "_")}.png`,
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

// Preview / download a single participant's certificate image, streamed from Drive
router.get("/:pid/preview", ensureAuthenticated, async (req, res) => {
  const task = getOwnedTask(req.params.id, req.user.id);
  if (!task) return res.status(404).json({ error: "Task not found" });

  const participant = db
    .prepare("SELECT * FROM participants WHERE id = ? AND task_id = ?")
    .get(req.params.pid, task.id);

  if (!participant || !participant.certificate_drive_id) {
    return res.status(404).json({ error: "Certificate not generated yet" });
  }

  try {
    const buffer = await driveService.downloadFile(req.user, participant.certificate_drive_id);
    res.set("Content-Type", "image/png");
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: "Could not load certificate from Drive: " + err.message });
  }
});

// Download all generated certificates for a task as a single zip, streamed from Drive
router.get("/download-all", ensureAuthenticated, async (req, res) => {
  const task = getOwnedTask(req.params.id, req.user.id);
  if (!task) return res.status(404).json({ error: "Task not found" });

  const participants = db
    .prepare("SELECT * FROM participants WHERE task_id = ? AND certificate_drive_id IS NOT NULL")
    .all(task.id);

  if (participants.length === 0) return res.status(400).json({ error: "No certificates generated yet" });

  res.attachment(`${task.title.replace(/[^a-z0-9_\-]+/gi, "_")}_certificates.zip`);
  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.on("error", (err) => res.status(500).send({ error: err.message }));
  archive.pipe(res);

  for (const p of participants) {
    try {
      const buffer = await driveService.downloadFile(req.user, p.certificate_drive_id);
      const safeName = p.name.replace(/[^a-z0-9_\-]+/gi, "_");
      archive.append(buffer, { name: `${safeName}.png` });
    } catch (err) {
      console.warn(`Skipping ${p.name} in zip - could not download from Drive:`, err.message);
    }
  }

  archive.finalize();
});

module.exports = router;
