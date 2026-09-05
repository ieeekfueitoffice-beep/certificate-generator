const path = require("path");

// On your own computer, the database is stored right inside the backend
// folder. On Render (or any host with a persistent disk), set the DATA_DIR
// environment variable to the disk's mount path so your task/participant
// data survives restarts and redeploys. (Certificate images and templates
// no longer need this - they're stored in the user's own Google Drive.)
const BASE_DIR = process.env.DATA_DIR || path.join(__dirname, "..");
const DB_DIR = path.join(BASE_DIR, "data");

module.exports = { BASE_DIR, DB_DIR };
