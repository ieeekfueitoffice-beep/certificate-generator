const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
const { CERT_DIR, BASE_DIR } = require("../config/paths");

if (!fs.existsSync(CERT_DIR)) fs.mkdirSync(CERT_DIR, { recursive: true });

// Escapes text so it can't break out of the SVG <text> element
function escapeXml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Renders one certificate: overlays the participant's name onto the
 * task's template image at the configured position, using an SVG layer
 * composited on top of the template.
 *
 * task.name_x / task.name_y are stored as PERCENTAGES (0-100) of the
 * template's width/height so the position stays correct regardless of
 * the image's actual pixel dimensions.
 */
async function generateCertificate({ task, participantId, name }) {
  const templatePath = path.join(BASE_DIR, task.template_path);
  const image = sharp(templatePath);
  const metadata = await image.metadata();
  const width = metadata.width;
  const height = metadata.height;

  const x = (task.name_x / 100) * width;
  const y = (task.name_y / 100) * height;
  const fontSize = task.font_size || 48;
  const color = task.font_color || "#1a1a1a";
  const fontFamily = task.font_family || "Helvetica, Arial, sans-serif";
  const textAnchor =
    task.text_align === "start" ? "start" : task.text_align === "end" ? "end" : "middle";

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .name-text {
          font-family: ${fontFamily};
          font-size: ${fontSize}px;
          fill: ${color};
          font-weight: 600;
        }
      </style>
      <text x="${x}" y="${y}" text-anchor="${textAnchor}" class="name-text">${escapeXml(name)}</text>
    </svg>
  `;

  const outputFilename = `${participantId}.png`;
  const outputPath = path.join(CERT_DIR, outputFilename);

  await image
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toFile(outputPath);

  return path.join("uploads", "certificates", outputFilename);
}

module.exports = { generateCertificate };
