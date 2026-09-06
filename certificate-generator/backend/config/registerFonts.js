const fs = require("fs");
const os = require("os");
const path = require("path");

// Sets up a private fontconfig configuration pointing at our bundled fonts
// folder, and points the FONTCONFIG_FILE environment variable at it. This
// MUST run before the first use of `sharp` anywhere in the process, since
// fontconfig reads this environment variable only once, on first
// initialization (see server.js, which requires this module first thing).
function registerFonts() {
  const fontsDir = path.join(__dirname, "..", "fonts");
  const cacheDir = path.join(os.tmpdir(), "certifyflow-fontconfig-cache");
  const confPath = path.join(os.tmpdir(), "certifyflow-fonts.conf");

  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

  const confXml = `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>${fontsDir}</dir>
  <cachedir>${cacheDir}</cachedir>
</fontconfig>
`;

  fs.writeFileSync(confPath, confXml);
  process.env.FONTCONFIG_FILE = confPath;
}

module.exports = { registerFonts };
