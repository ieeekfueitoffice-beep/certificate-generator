// Lets non-technical users add basic formatting to their email body without
// a full rich-text editor: type **text** for bold and ==text== for a
// yellow highlight. This module turns that into real HTML for the email,
// and strips it back to clean plain text as a fallback for clients that
// don't render HTML.

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Converts the user's typed markup into a safe HTML email body.
// Order matters: escape first (so raw < > & in their text can't break the
// email), THEN apply markup, THEN convert newlines - otherwise escaping
// would also mangle the HTML tags we just inserted.
function markupToHtml(raw) {
  let safe = escapeHtml(raw || "");

  // **bold**
  safe = safe.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // ==highlight==
  safe = safe.replace(
    /==(.+?)==/g,
    '<mark style="background-color:#fff59d; padding:0 2px;">$1</mark>'
  );

  // Preserve line breaks as real line breaks in the rendered email
  safe = safe.replace(/\n/g, "<br>");

  return `<div style="font-family:Helvetica,Arial,sans-serif; font-size:15px; line-height:1.6; color:#1a1a1a;">${safe}</div>`;
}

// Plain-text fallback: same content, markup symbols simply removed
function markupToPlainText(raw) {
  return String(raw || "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/==(.+?)==/g, "$1");
}

module.exports = { markupToHtml, markupToPlainText, escapeHtml };
