const { google } = require("googleapis");
const { Readable } = require("stream");
const db = require("../config/db");
const { getValidAccessToken } = require("../config/googleAuth");

const FOLDER_NAME = "CertifyFlow Certificates";

function bufferToStream(buffer) {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

async function getDriveClient(user) {
  const oauth2Client = await getValidAccessToken(user);
  return google.drive({ version: "v3", auth: oauth2Client });
}

// Finds (or creates, on first use) a single dedicated folder in the user's
// Drive so all app files stay organized in one place rather than cluttering
// "My Drive". The folder ID is cached on the user record after first creation.
async function ensureAppFolder(user) {
  if (user.drive_folder_id) return user.drive_folder_id;

  const drive = await getDriveClient(user);

  // In case the column exists but is empty, double check Drive itself
  // (covers the case of a fresh login after a database reset)
  const existing = await drive.files.list({
    q: `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id, name)",
    spaces: "drive",
  });

  let folderId;
  if (existing.data.files && existing.data.files.length > 0) {
    folderId = existing.data.files[0].id;
  } else {
    const folder = await drive.files.create({
      requestBody: {
        name: FOLDER_NAME,
        mimeType: "application/vnd.google-apps.folder",
      },
      fields: "id",
    });
    folderId = folder.data.id;
  }

  db.prepare("UPDATE users SET drive_folder_id = ? WHERE id = ?").run(folderId, user.id);
  user.drive_folder_id = folderId;
  return folderId;
}

// Uploads a buffer to the user's Drive app folder, returns the new file's ID
async function uploadFile(user, { buffer, filename, mimeType }) {
  const drive = await getDriveClient(user);
  const folderId = await ensureAppFolder(user);

  const res = await drive.files.create({
    requestBody: { name: filename, parents: [folderId] },
    media: { mimeType, body: bufferToStream(buffer) },
    fields: "id",
  });

  return res.data.id;
}

// Downloads a file's content as a Buffer
async function downloadFile(user, fileId) {
  const drive = await getDriveClient(user);
  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "arraybuffer" }
  );
  return Buffer.from(res.data);
}

// Deletes a file (used when replacing a template or removing a task)
async function deleteFile(user, fileId) {
  if (!fileId) return;
  try {
    const drive = await getDriveClient(user);
    await drive.files.delete({ fileId });
  } catch (err) {
    // Non-fatal: file may already be gone. Log and move on.
    console.warn("Drive delete failed (continuing):", err.message);
  }
}

module.exports = { uploadFile, downloadFile, deleteFile, ensureAppFolder };
