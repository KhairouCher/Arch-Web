export const PLACEHOLDER_COLORS = {
  PHOTO: "#3b82f6",
  PLAN:  "#10b981",
  MODEL: "#f59e0b",
  TEXT:  "#8b5cf6",
  LOGO:  "#ef4444",
};

export const PLACEHOLDER_LABELS = {
  PHOTO: "Photo",
  PLAN:  "Floor Plan",
  MODEL: "3D Model",
  TEXT:  "Text",
  LOGO:  "Logo",
};

// Bundled with the app (public/fonts, declared in app/fonts.css), so text looks
// the same on every machine. Arial stays first as the default; it is the only
// one that depends on the viewer's system. Cairo and Amiri cover Arabic.
export const AVAILABLE_FONTS = [
  "Arial", "Inter", "Montserrat", "Barlow Condensed",
  "Playfair Display", "Cormorant Garamond", "Cairo", "Amiri",
];

// Preview canvas resolution — editor renders at this width for performance
// (renderCanvas() recomposites every layer/shadow/image on every edit and
// every mousemove during a drag, so this directly drives interaction speed).
// Export always uses full PSD resolution.
export const PREVIEW_WIDTH = 1800;

// Print assumptions for the photo-quality warning (lib/printQuality.js).
// Templates are drawn at 300 dpi today. PRINT_SCALE is how much larger the
// page is printed than the canvas (1 = at canvas size; an A1 canvas printed
// on A0 would be about 1.414). Confirm both with the client.
export const CANVAS_DPI = 300;
export const PRINT_SCALE = 1;
