// How sharp an uploaded photo will print inside its zone. Pure functions: no
// React, no canvas, so they can be tested on their own (printQuality.test.mjs).
//
// Template canvases are drawn at a known resolution (today 300 dpi, 9933 x 7016 px).
// A photo placed in a zone is scaled so that one photo pixel covers `scale`
// canvas pixels. Each canvas pixel is 1/canvasDpi of an inch, so the photo's
// effective resolution on paper is canvasDpi / (scale * printScale).
// printScale > 1 means the page is printed larger than the canvas (A1 canvas on
// A0 paper is about 1.414).

// Placeholder thresholds, to be confirmed with the client (Plan P-5.5).
export const DPI_GOOD = 200;   // sharp
export const DPI_LOW = 120;    // visible softness up close

// Canvas pixels covered by one photo pixel, using the same rules as drawImageInBounds:
// "fill" covers the whole zone, anything else fits the photo inside it.
export function photoScale({ imageWidth, imageHeight, zoneWidth, zoneHeight, fitMode }) {
  const sx = zoneWidth / imageWidth;
  const sy = zoneHeight / imageHeight;
  return fitMode === "fill" ? Math.max(sx, sy) : Math.min(sx, sy);
}

export function effectiveDpi({ imageWidth, imageHeight, zoneWidth, zoneHeight, fitMode = "fill", canvasDpi = 300, printScale = 1 }) {
  if (!(imageWidth > 0 && imageHeight > 0 && zoneWidth > 0 && zoneHeight > 0)) return null;
  const scale = photoScale({ imageWidth, imageHeight, zoneWidth, zoneHeight, fitMode });
  return canvasDpi / (scale * printScale);
}

// level: "good", "low" or "poor". dpi is rounded for display.
export function assessPhoto(args) {
  const dpi = effectiveDpi(args);
  if (dpi == null) return null;
  const level = dpi >= DPI_GOOD ? "good" : dpi >= DPI_LOW ? "low" : "poor";
  return { dpi: Math.round(dpi), level };
}

// Smallest photo (in pixels) that reaches `targetDpi` in this zone, keeping the photo's own shape.
export function minPixelsFor({ imageWidth, imageHeight, zoneWidth, zoneHeight, fitMode = "fill", canvasDpi = 300, printScale = 1, targetDpi = DPI_GOOD }) {
  const scale = photoScale({ imageWidth, imageHeight, zoneWidth, zoneHeight, fitMode });
  const factor = (canvasDpi / (scale * printScale)) > 0 ? targetDpi / (canvasDpi / (scale * printScale)) : 1;
  return { width: Math.ceil(imageWidth * factor), height: Math.ceil(imageHeight * factor) };
}
