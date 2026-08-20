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
