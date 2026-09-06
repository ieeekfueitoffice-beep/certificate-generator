import React, { useRef } from "react";

// Shows the uploaded template image; clicking on it sets name_x/name_y (as
// percentages of image width/height) so the position works at any resolution.
// A live preview of "Sample Name" is overlaid at the current position/style.
export default function TemplatePositioner({ imageUrl, settings, onChange, templateWidth }) {
  const imgRef = useRef(null);

  const handleClick = (e) => {
    const rect = imgRef.current.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    onChange({ ...settings, name_x: Math.round(xPct * 10) / 10, name_y: Math.round(yPct * 10) / 10 });
  };

  // Scale the on-screen preview font size to match how big the text will
  // actually render on the final image, based on displayed vs natural width.
  const renderedWidth = imgRef.current?.clientWidth;
  const scaleFactor = renderedWidth && templateWidth ? renderedWidth / templateWidth : 0.5;
  const previewFontSize = Math.max(settings.font_size * scaleFactor, 8);

  const previewStyle = {
    position: "absolute",
    left: `${settings.name_x}%`,
    top: `${settings.name_y}%`,
    transform:
      settings.text_align === "start"
        ? "translate(0, -50%)"
        : settings.text_align === "end"
        ? "translate(-100%, -50%)"
        : "translate(-50%, -50%)",
    fontSize: `${previewFontSize}px`,
    color: settings.font_color,
    fontFamily: `'${settings.font_family}', sans-serif`,
    fontWeight: 600,
    fontStyle: settings.font_style === "italic" ? "italic" : "normal",
    whiteSpace: "nowrap",
    pointerEvents: "none",
    textShadow: "0 0 1px rgba(255,255,255,0.5)",
  };

  return (
    <div>
      <p className="text-sm text-gray-500 mb-2">
        Click anywhere on the template to set where the participant's name will appear.
      </p>
      <div className="relative inline-block border rounded-lg overflow-hidden max-w-full">
        <img
          ref={imgRef}
          src={imageUrl}
          alt="Certificate template"
          onClick={handleClick}
          className="max-w-full h-auto cursor-crosshair select-none block"
          draggable={false}
        />
        <div style={previewStyle}>Sample Name</div>
      </div>
    </div>
  );
}
