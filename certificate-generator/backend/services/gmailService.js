const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");
const db = require("../config/db");

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALLBACK_URL
  );
}

// Ensures we have a fresh access_token, refreshing + persisting if expired
async function getValidAccessToken(user) {
  const oauth2Client = getOAuthClient();

  if (user.token_expiry && Date.now() < user.token_expiry && user.access_token) {
    oauth2Client.setCredentials({ access_token: user.access_token, refresh_token: user.refresh_token });
    return oauth2Client;
  }

  if (!user.refresh_token) {
    throw new Error(
      "No refresh token on file for this user. Please log out and log in again, granting access."
    );
  }

  oauth2Client.setCredentials({ refresh_token: user.refresh_token });
  const { credentials } = await oauth2Client.refreshAccessToken();

  db.prepare("UPDATE users SET access_token = ?, token_expiry = ? WHERE id = ?").run(
    credentials.access_token,
    credentials.expiry_date || Date.now() + 55 * 60 * 1000,
    user.id
  );

  oauth2Client.setCredentials(credentials);
  return oauth2Client;
}

function base64UrlEncode(buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Builds an RFC 2822 MIME message with a single attachment and sends it
 * via the Gmail API "users.messages.send" endpoint, using the currently
 * logged-in user's own Gmail account (thanks to the gmail.send OAuth scope).
 */
async function sendCertificateEmail({ user, to, subject, body, attachmentPath }) {
  const oauth2Client = await getValidAccessToken(user);
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  const attachmentData = fs.readFileSync(attachmentPath);
  const attachmentBase64 = attachmentData.toString("base64");
  const boundary = "cert_gen_boundary_" + Date.now();
  const filename = path.basename(attachmentPath);

  const messageParts = [
    `From: ${user.name} <${user.email}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "",
    body,
    "",
    `--${boundary}`,
    `Content-Type: image/png; name="${filename}"`,
    "Content-Transfer-Encoding: base64",
    `Content-Disposition: attachment; filename="${filename}"`,
    "",
    attachmentBase64,
    `--${boundary}--`,
  ];

  const rawMessage = base64UrlEncode(Buffer.from(messageParts.join("\r\n"), "utf-8"));

  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: rawMessage },
  });
}

module.exports = { sendCertificateEmail };
