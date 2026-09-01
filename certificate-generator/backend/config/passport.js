const passport = require("passport");
const { Strategy: GoogleStrategy } = require("passport-google-oauth20");
const { nanoid } = require("nanoid");
const db = require("./db");

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser((id, done) => {
  try {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
    done(null, user || false);
  } catch (err) {
    done(err);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      // gmail.send lets the app send certificate emails FROM the logged-in user's own Gmail
      scope: [
        "profile",
        "email",
        "https://www.googleapis.com/auth/gmail.send",
      ],
      accessType: "offline",
      prompt: "consent", // ensures a refresh_token is returned every login
    },
    (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails && profile.emails[0] && profile.emails[0].value;
        const avatar = profile.photos && profile.photos[0] && profile.photos[0].value;
        const existing = db
          .prepare("SELECT * FROM users WHERE google_id = ?")
          .get(profile.id);

        const tokenExpiry = Date.now() + 55 * 60 * 1000; // ~55 min safety margin

        if (existing) {
          db.prepare(
            `UPDATE users SET email = ?, name = ?, avatar = ?, access_token = ?,
             refresh_token = COALESCE(?, refresh_token), token_expiry = ? WHERE id = ?`
          ).run(email, profile.displayName, avatar, accessToken, refreshToken, tokenExpiry, existing.id);
          return done(null, db.prepare("SELECT * FROM users WHERE id = ?").get(existing.id));
        }

        const id = nanoid();
        db.prepare(
          `INSERT INTO users (id, google_id, email, name, avatar, access_token, refresh_token, token_expiry)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(id, profile.id, email, profile.displayName, avatar, accessToken, refreshToken, tokenExpiry);

        return done(null, db.prepare("SELECT * FROM users WHERE id = ?").get(id));
      } catch (err) {
        return done(err);
      }
    }
  )
);

module.exports = passport;
