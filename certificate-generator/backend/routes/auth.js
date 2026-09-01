const express = require("express");
const passport = require("passport");
const router = express.Router();

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email", "https://www.googleapis.com/auth/gmail.send"],
    accessType: "offline",
    prompt: "consent",
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${process.env.CLIENT_URL}/login?error=auth_failed`,
  }),
  (req, res) => {
    res.redirect(`${process.env.CLIENT_URL}/dashboard`);
  }
);

router.get("/me", (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    const { id, email, name, avatar } = req.user;
    return res.json({ user: { id, email, name, avatar } });
  }
  res.json({ user: null });
});

router.post("/logout", (req, res) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.json({ ok: true });
    });
  });
});

module.exports = router;
