const { google } = require("googleapis");
const { getValidAccessToken } = require("../config/googleAuth");

function base64UrlEncode(buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Builds an RFC 2822 MIME message and sends it via the Gmail API
 * "users.messages.send" endpoint, using the currently logged-in user's own
 * Gmail account (thanks to the gmail.send OAuth scope).
 *
 * Structure:
 *   multipart/mixed                 <- lets us attach the certificate
 *     multipart/alternative         <- lets email clients pick plain or HTML
 *       text/plain                  <- fallback for clients that can't show HTML
 *       text/html                   <- the real formatted version (bold/highlight)
 *     image/png attachment
 */
async function sendCertificateEmail({
  user,
  to,
  subject,
  textBody,
  htmlBody,
  attachmentBuffer,
  attachmentFilename,
}) {
  const oauth2Client = await getValidAccessToken(user);
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  const attachmentBase64 = attachmentBuffer.toString("base64");
  const mixedBoundary = "cert_gen_mixed_" + Date.now();
  const altBoundary = "cert_gen_alt_" + Date.now();

  const messageParts = [
    `From: ${user.name} <${user.email}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
    "",
    `--${mixedBoundary}`,
    `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
    "",
    `--${altBoundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "",
    textBody,
    "",
    `--${altBoundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "",
    htmlBody,
    "",
    `--${altBoundary}--`,
    "",
    `--${mixedBoundary}`,
    `Content-Type: image/png; name="${attachmentFilename}"`,
    "Content-Transfer-Encoding: base64",
    `Content-Disposition: attachment; filename="${attachmentFilename}"`,
    "",
    attachmentBase64,
    `--${mixedBoundary}--`,
  ];

  const rawMessage = base64UrlEncode(Buffer.from(messageParts.join("\r\n"), "utf-8"));

  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: rawMessage },
  });
}

module.exports = { sendCertificateEmail };
