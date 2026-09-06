import React, { useRef } from "react";

// Converts the same **bold** / ==highlight== markup the backend uses,
// purely for an in-browser live preview (the real email is rendered by
// the backend's emailFormatting.js - this just mirrors it visually).
function renderPreview(raw) {
  const escapeHtml = (s) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  let safe = escapeHtml(raw || "");
  safe = safe.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  safe = safe.replace(/==(.+?)==/g, '<mark style="background-color:#fff59d; padding:0 2px;">$1</mark>');
  safe = safe.replace(/\n/g, "<br>");
  return safe;
}

export default function EmailBodyEditor({ value, onChange }) {
  const textareaRef = useRef(null);

  // Wraps the currently selected text in the textarea with the given
  // markers (e.g. ** **), or inserts placeholder text if nothing is selected
  const wrapSelection = (marker, placeholder) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end) || placeholder;
    const next = value.slice(0, start) + marker + selected + marker + value.slice(end);
    onChange(next);

    // Restore focus and select the just-wrapped text for quick re-editing
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = start + marker.length;
      el.selectionEnd = start + marker.length + selected.length;
    });
  };

  return (
    <div>
      <div className="flex gap-2 mb-2">
        <button
          type="button"
          onClick={() => wrapSelection("**", "bold text")}
          className="px-3 py-1 text-sm rounded-md border font-bold hover:bg-gray-50"
          title="Bold selected text"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => wrapSelection("==", "highlighted text")}
          className="px-3 py-1 text-sm rounded-md border hover:bg-gray-50"
          style={{ backgroundColor: "#fff59d55" }}
          title="Highlight selected text"
        >
          Highlight
        </button>
        <span className="text-xs text-gray-400 self-center">
          Select some text first, then click a button
        </span>
      </div>

      <textarea
        ref={textareaRef}
        className="w-full border rounded-lg px-3 py-2 font-mono text-sm"
        rows={5}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Hi {{name}}, congratulations on **completing the event**! We were ==really impressed== by your work."
      />

      <div className="mt-2 border rounded-lg p-3 bg-gray-50">
        <p className="text-xs text-gray-400 mb-1">Preview (name shown as "Sample Name")</p>
        <div
          className="text-sm text-gray-800"
          dangerouslySetInnerHTML={{
            __html: renderPreview(value.replace(/\{\{\s*name\s*\}\}/gi, "Sample Name")),
          }}
        />
      </div>
    </div>
  );
}
