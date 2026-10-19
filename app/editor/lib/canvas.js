// Pure canvas/geometry helpers used by the template editor's render loop
// and hit-testing. None of these touch React state — everything they need
// comes in as parameters — so they're safe to unit-test in isolation and
// safe to call from anywhere (render, mouse handlers, export).

export function flattenLayers(layers) {
  const result = [];
  function walk(list) {
    for (const l of list) { result.push(l); if (l.children) walk(l.children); }
  }
  walk(layers || []);
  return result;
}

export function drawImageInBounds(ctx, img, bounds, fitMode, offset, clipMask, canvasW, canvasH) {
  const { x, y, width, height } = bounds;
  const imgRatio    = img.naturalWidth / img.naturalHeight;
  const boundsRatio = width / height;
  let drawW, drawH;
  if (fitMode === "fill") {
    if (imgRatio > boundsRatio) { drawH = height; drawW = height * imgRatio; }
    else                        { drawW = width;  drawH = width  / imgRatio; }
  } else {
    if (imgRatio > boundsRatio) { drawW = width;  drawH = width  / imgRatio; }
    else                        { drawH = height; drawW = height * imgRatio; }
  }
  const drawX = x + (width  - drawW) / 2 + (offset?.x || 0);
  const drawY = y + (height - drawH) / 2 + (offset?.y || 0);

  if (clipMask) {
    const tmp = document.createElement("canvas");
    tmp.width = canvasW; tmp.height = canvasH;
    const tc  = tmp.getContext("2d");
    tc.drawImage(img, drawX, drawY, drawW, drawH);
    tc.globalCompositeOperation = "destination-in";
    tc.drawImage(clipMask, 0, 0, canvasW, canvasH);
    ctx.drawImage(tmp, 0, 0);
  } else {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.restore();
  }
}

// Tiled diagonal watermark drawn over an unpurchased template so a
// screenshot of the working canvas isn't a usable deliverable. Each row is
// offset by a deterministic (not Math.random) jitter derived from its own
// index, so the pattern isn't a perfectly even grid — harder to crop or
// clone-stamp out than a single centered mark — while still rendering
// identically on every call, so it doesn't jitter/flicker as the canvas
// re-renders on every edit.
export function drawWatermark(ctx, width, height, text = "ArchPresent — unpaid preview") {
  ctx.save();
  ctx.globalAlpha  = 0.13;
  ctx.fillStyle    = "#000000";
  ctx.font         = `bold ${Math.max(12, Math.round(width * 0.022))}px sans-serif`;
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";

  const angle    = -Math.PI / 8;
  const spacingX = width  / 3.2;
  const spacingY = height / 5.5;

  let row = 0;
  for (let y = -spacingY; y < height + spacingY; y += spacingY, row++) {
    const jitter  = (((row * 37) % 100) / 100 - 0.5) * spacingX;
    for (let x = -spacingX + jitter; x < width + spacingX; x += spacingX) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }
  }
  ctx.restore();
}

// Base direction of a piece of text, from its first strong letter: Arabic or
// Hebrew gives "rtl", a Latin letter gives "ltr", and text with neither (digits,
// punctuation, empty) defaults to "ltr". Used for ctx.direction so Arabic
// sentences keep their punctuation and numbers on the correct side. The browser
// already shapes and joins Arabic letters by itself.
const RTL_LETTER = /[֐-ࣿיִ-﷿ﹰ-﻿]/;
const LTR_LETTER = /[A-Za-zÀ-ɏͰ-ϿЀ-ӿ]/;
export function textDirection(text) {
  for (const ch of String(text || "")) {
    if (RTL_LETTER.test(ch)) return "rtl";
    if (LTR_LETTER.test(ch)) return "ltr";
  }
  return "ltr";
}

// Bundled fonts (app/fonts.css) load on first use, and a canvas draws in the
// fallback font until they have. Resolves once the regular and bold faces of
// every given family are ready; callers repaint afterwards.
export function loadFonts(families) {
  if (typeof document === "undefined" || !document.fonts) return Promise.resolve();
  const specs = [...new Set(families)].filter(Boolean).flatMap((f) => [`400 16px "${f}"`, `700 16px "${f}"`]);
  return Promise.all(specs.map((s) => document.fonts.load(s).catch(() => []))).then(() => undefined);
}

export function buildFont(txt) {
  const style  = `${txt.italic ? "italic " : ""}${txt.bold ? "bold " : ""}`;
  return `${style}${txt.size}px "${txt.font}"`;
}

const CONTOUR_DIRS = [[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];

// Traces the outer boundary of a raster mask's opaque region via
// Moore-neighbor tracing, downsampled for speed. Returns full-canvas-space
// points (not preview-scaled) so the same trace works at any zoom/export
// resolution, or null if the mask has no opaque pixels.
export function traceMaskContour(img, fullW, fullH) {
  const work  = 400;
  const scale = work / img.naturalWidth;
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const cctx = canvas.getContext("2d");
  cctx.drawImage(img, 0, 0, w, h);
  const data = cctx.getImageData(0, 0, w, h).data;
  const isOpaque = (x, y) => x >= 0 && y >= 0 && x < w && y < h && data[(y * w + x) * 4 + 3] > 100;

  let start = null;
  for (let y = 0; y < h && !start; y++) {
    for (let x = 0; x < w; x++) {
      if (isOpaque(x, y)) { start = [x, y]; break; }
    }
  }
  if (!start) return null;

  const contour = [start];
  let current = start;
  let dir = 6;
  const maxSteps = (w + h) * 6;
  for (let step = 0; step < maxSteps; step++) {
    let found = false;
    for (let i = 0; i < 8; i++) {
      const checkDir = (dir + 6 + i) % 8;
      const [dx, dy] = CONTOUR_DIRS[checkDir];
      const nx = current[0] + dx, ny = current[1] + dy;
      if (isOpaque(nx, ny)) {
        current = [nx, ny];
        dir = checkDir;
        found = true;
        break;
      }
    }
    if (!found) break;
    contour.push(current);
    if (step > 5 && current[0] === start[0] && current[1] === start[1]) break;
  }

  const toFullX = fullW / w, toFullY = fullH / h;
  return contour.map(([x, y]) => [x * toFullX, y * toFullY]);
}

export function wrapText(ctx, text, maxWidth) {
  if (maxWidth <= 0) return [text];
  const words = text.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [text];
}

// A text layer's rendered bounding box in full PSD coordinates — driven by
// boxWidth (the user-resizable text box width), matching the render loop's
// own word-wrap exactly. Used for hit-testing (so a click anywhere in the
// box, including wrapped lines below the first, can grab it), the
// resize-handle position, and the selection outline.
export function getTextBounds(measureCtx, t, fullCanvasWidth) {
  if (!t.content) return null;
  measureCtx.font = buildFont(t);
  const boxWidth = Math.max(20, t.boxWidth || 400);
  const lines  = wrapText(measureCtx, t.content, boxWidth);
  const lineH  = t.size * 1.3;
  const blockH = lines.length * lineH;

  const top    = t.pos.y - t.size * 0.9;
  const bottom = top + blockH + t.size * 0.3;
  let left, right;
  if (t.alignment === "center") {
    const cx = fullCanvasWidth / 2;
    left = cx - boxWidth / 2; right = cx + boxWidth / 2;
  } else if (t.alignment === "right") {
    right = fullCanvasWidth - 40; left = right - boxWidth;
  } else {
    left = t.pos.x; right = t.pos.x + boxWidth;
  }
  return { left, top, right, bottom };
}
