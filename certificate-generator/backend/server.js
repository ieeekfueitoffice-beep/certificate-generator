require("dotenv").config();
const express = require("express");
const session = require("express-session");
const cors = require("cors");
const path = require("path");

const passport = require("./config/passport");
require("./config/db"); // initializes DB + tables on startup
const { UPLOADS_DIR } = require("./config/paths");

const authRoutes = require("./routes/auth");
const taskRoutes = require("./routes/tasks");
const participantRoutes = require("./routes/participants");
const certificateRoutes = require("./routes/certificates");

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === "production";

// Needed so "secure" cookies work correctly behind Render's reverse proxy
if (isProduction) app.set("trust proxy", 1);

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev_secret_change_me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      // Frontend (Netlify) and backend (Render) live on different domains in
      // production, so the login cookie needs sameSite "none" + secure to be
      // allowed cross-site. Locally, both run on localhost so "lax" is fine.
      sameSite: isProduction ? "none" : "lax",
      secure: isProduction,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Static file serving for uploaded templates + generated certificates
app.use("/uploads", express.static(UPLOADS_DIR));

app.use("/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/tasks/:id/participants", participantRoutes);
app.use("/api/tasks/:id/certificates", certificateRoutes);

app.get("/health", (req, res) => res.json({ ok: true }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Server error" });
});

app.listen(PORT, () => {
  console.log(`Certificate generator backend running on http://localhost:${PORT}`);
});
