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

export const AVAILABLE_FONTS = [
  "Arial", "Georgia", "Times New Roman", "Verdana",
  "Helvetica", "Trebuchet MS", "Impact", "Courier New",
  "Palatino", "Garamond", "Comic Sans MS", "Tahoma",
];

// Preview canvas resolution — editor renders at this width for performance
// (renderCanvas() recomposites every layer/shadow/image on every edit and
// every mousemove during a drag, so this directly drives interaction speed).
// Export always uses full PSD resolution.
export const PREVIEW_WIDTH = 1800;
