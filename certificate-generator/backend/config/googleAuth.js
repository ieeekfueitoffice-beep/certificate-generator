const { google } = require("googleapis");
const db = require("./db");

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALLBACK_URL
  );
}

// Ensures we have a fresh access_token for this user, refreshing + persisting
// it in the database if it has expired. Shared by Gmail and Drive services
// since both act on behalf of the logged-in user's own Google account.
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
  // Keep the in-memory user object in sync for the rest of this request
  user.access_token = credentials.access_token;
  user.token_expiry = credentials.expiry_date || Date.now() + 55 * 60 * 1000;

  return oauth2Client;
}

module.exports = { getOAuthClient, getValidAccessToken };
