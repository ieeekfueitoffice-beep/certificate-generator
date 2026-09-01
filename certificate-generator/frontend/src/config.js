// When running on your own computer, this stays empty and requests go
// through Vite's dev proxy to http://localhost:5000 automatically.
//
// When deployed to Netlify, set an environment variable named
// VITE_API_URL to your Render backend's URL (e.g.
// https://your-backend-name.onrender.com) — no trailing slash — and every
// request in the app will be sent there instead.
export const API_BASE = import.meta.env.VITE_API_URL || "";
