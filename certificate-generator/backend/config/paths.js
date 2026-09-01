const path = require("path");

// On your own computer, everything is stored right inside the backend folder.
// On Render (or any host with a persistent disk), set the DATA_DIR environment
// variable to the disk's mount path so your data survives restarts/redeploys.
const BASE_DIR = process.env.DATA_DIR || path.join(__dirname, "..");

const DB_DIR = path.join(BASE_DIR, "data");
const UPLOADS_DIR = path.join(BASE_DIR, "uploads");
const TEMPLATE_DIR = path.join(UPLOADS_DIR, "templates");
const CERT_DIR = path.join(UPLOADS_DIR, "certificates");

module.exports = { BASE_DIR, DB_DIR, UPLOADS_DIR, TEMPLATE_DIR, CERT_DIR };
