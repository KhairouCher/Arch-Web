"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { PLACEHOLDER_COLORS, PREVIEW_WIDTH } from "./lib/constants";
import { flattenLayers, drawImageInBounds, buildFont, traceMaskContour, wrapText, getTextBounds } from "./lib/canvas";
import { hasPurchased, markPurchased } from "../lib/mockPayment";
import PlaceholderOverlay from "./components/PlaceholderOverlay";
import TextLayerRow from "./components/TextLayerRow";
import LayerRow from "./components/LayerRow";
import PaywallModal from "./components/PaywallModal";

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TemplateEditor() {
  const [template,     setTemplate]     = useState(null);
  const [placeholders, setPlaceholders] = useState([]);
  const [textLayers,   setTextLayers]   = useState([]);  // { id, content, font, size, color, bold, italic, alignment, pos, boxWidth }
  const [layers,       setLayers]       = useState([]);
  const [selected,     setSelected]     = useState(null);
  const [scale,        setScale]        = useState(1);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [exporting,    setExporting]    = useState(false);
  const [loadedCount,  setLoadedCount]  = useState(0);
  const [dropIndicator, setDropIndicator] = useState(null); // { name, position: "above"|"below" } — sidebar drag target
  const [showPaywall,  setShowPaywall]  = useState(false);
  const [templateId,   setTemplateId]   = useState("template");

  const canvasRef       = useRef();
  const containerRef    = useRef();
  const placeholdersRef = useRef([]);
  const textLayersRef   = useRef([]);
  const layersRef       = useRef([]);
  const templateRef     = useRef(null);
  const templateBaseRef = useRef("/templates/template");
  const pendingExportFormatRef = useRef(null);
  const layerImgsRef    = useRef({});
  const clipImgsRef     = useRef({});
  const clipContourRef  = useRef({}); // clipPath -> traced outline points, in full-canvas coords
  const shadowImgsRef   = useRef({});
  const dragIdRef       = useRef(null);
  const renderQueuedRef = useRef(false);
  const dragMovedRef    = useRef(false); // did the current mouse-down actually drag, vs. a plain click
  const pendingUploadIdRef = useRef(null); // placeholder id awaiting a file from the shared upload input
  const uploadInputRef  = useRef(null);

  // pan + text drag state
  const panningRef  = useRef(null); // { type: "image"|"text"|"text-resize", id, startX, startY, startOffsetX, startOffsetY }

  const renderCanvasRef = useRef(() => {});

  // Coalesces bursts of render requests (e.g. every mousemove during a drag,
  // or fast typing) into at most one actual repaint per tick — renderCanvas()
  // itself is a full multi-layer/shadow/image recomposite, too expensive to
  // run synchronously on every single input event. Uses setTimeout rather
  // than requestAnimationFrame: rAF is throttled/suspended for backgrounded
  // or non-visible tabs, which would silently stall rendering here.
  //
  // Stable across renders (via renderCanvasRef, updated below on every
  // render to point at the latest renderCanvas closure) so effects can list
  // it as a dependency without triggering re-runs on every render.
  const scheduleRender = useCallback(() => {
    if (renderQueuedRef.current) return;
    renderQueuedRef.current = true;
    setTimeout(() => {
      renderQueuedRef.current = false;
      renderCanvasRef.current();
    }, 0);
  }, []);

  useEffect(() => { placeholdersRef.current = placeholders; }, [placeholders]);
  useEffect(() => { textLayersRef.current   = textLayers;   }, [textLayers]);
  useEffect(() => { layersRef.current       = layers;       }, [layers]);

  // ── Load template.json ────────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id     = params.get("template") || "template";
    templateBaseRef.current = `/templates/${id}`;

    fetch(`${templateBaseRef.current}/template.json`)
      .then((r) => { if (!r.ok) throw new Error("template.json not found"); return r.json(); })
      .then((data) => {
        templateRef.current = data;
        setTemplate(data);
        setTemplateId(id);

        // Separate TEXT placeholders from image placeholders
        const imgPhs  = data.placeholders.filter((p) => p.type !== "TEXT");
        const txtPhs  = data.placeholders.filter((p) => p.type === "TEXT");

        const initPhs = imgPhs.map((p) => ({ ...p, userImage: null, previewUrl: null, fitMode: "fill", offset: { x: 0, y: 0 } }));
        placeholdersRef.current = initPhs;
        setPlaceholders(initPhs);

        // Initialize text layer state — position starts at placeholder bounds center
        const initTxt = txtPhs.map((p) => ({
          id:        p.id,
          rawId:     p.rawId,
          layerName: p.layerName,
          zIndex:    p.zIndex,
          bounds:    p.bounds,
          clipPath:  p.clipPath || null,
          content:   p.defaultText || "",
          font:      "Arial",
          size:      Math.max(24, Math.round((p.bounds.height || 60) * 0.4)),
          color:     "#000000",
          bold:      false,
          italic:    false,
          alignment: "left",
          pos:       { x: p.bounds.x, y: p.bounds.y + (p.bounds.height || 60) * 0.7 },
          boxWidth:  Math.max(80, p.bounds.width || 400),
        }));
        textLayersRef.current = initTxt;
        setTextLayers(initTxt);

        const allLayers = flattenLayers(data.layers).sort((a, b) => b.zIndex - a.zIndex);
        layersRef.current = allLayers;
        setLayers(allLayers);

        setLoading(false);
      })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, []);

  // ── Load images ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!template) return;
    const base   = templateBaseRef.current;
    const toLoad = flattenLayers(template.layers).filter((l) => l.imagePath).sort((a, b) => a.zIndex - b.zIndex);
    let cancelled = false;

    async function load() {
      for (const layer of toLoad) {
        if (cancelled) break;
        await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => { layerImgsRef.current[layer.imagePath] = img; setLoadedCount((n) => n + 1); scheduleRender(); resolve(); };
          img.onerror = () => resolve();
          img.src = `${base}/${layer.imagePath}`;
        });
      }
    }

    const clipPaths = [...new Set(template.placeholders.map((p) => p.clipPath).filter(Boolean))];
    clipPaths.forEach((cp) => {
      const img = new Image();
      img.onload  = () => {
        clipImgsRef.current[cp] = img;
        clipContourRef.current[cp] = traceMaskContour(img, template.meta.canvasWidth, template.meta.canvasHeight);
        scheduleRender();
      };
      img.onerror = () => {};
      img.src = `${base}/${cp}`;
    });

    const shadowPaths = [...new Set(template.placeholders.map((p) => p.shadowPath).filter(Boolean))];
    shadowPaths.forEach((sp) => {
      const img = new Image();
      img.onload  = () => { shadowImgsRef.current[sp] = img; scheduleRender(); };
      img.onerror = () => {};
      img.src = `${base}/${sp}`;
    });

    load();
    return () => { cancelled = true; };
  }, [template, scheduleRender]);

  // ── Scale ─────────────────────────────────────────────────────────────────
  function updateScale() {
    if (!templateRef.current || !containerRef.current) return;
    const tmpl   = templateRef.current;
    const fullW  = tmpl.meta.canvasWidth;
    const fullH  = tmpl.meta.canvasHeight;
    const ps     = Math.min(1, PREVIEW_WIDTH / fullW);       // preview scale
    const prevW  = Math.round(fullW * ps);
    const prevH  = Math.round(fullH * ps);
    const availH = containerRef.current.clientHeight - 32;
    const availW = containerRef.current.clientWidth  - 32;
    // CSS display scale: fit preview canvas in container by height, clamped by width
    const cssScale = Math.min(availH / prevH, availW / prevW, 1);
    setScale(cssScale);
  }

  useEffect(() => {
    if (!template || !containerRef.current) return;
    const obs = new ResizeObserver(updateScale);
    obs.observe(containerRef.current);
    updateScale();
    return () => obs.disconnect();
  }, [template]);

  // ── Canvas render ─────────────────────────────────────────────────────────
  // renderCanvas(full=false) renders at PREVIEW_WIDTH for the editor.
  // renderCanvas(full=true) renders at full PSD resolution for export.
  function renderCanvas(full = false) {
    const canvas = canvasRef.current;
    const tmpl   = templateRef.current;
    const phs    = placeholdersRef.current;
    const txts   = textLayersRef.current;
    const lyrs   = layersRef.current;
    if (!canvas || !tmpl) return;

    const { canvasWidth: fullW, canvasHeight: fullH } = tmpl.meta;

    // Preview scale: render at PREVIEW_WIDTH, maintaining aspect ratio
    const previewScale = full ? 1 : Math.min(1, PREVIEW_WIDTH / fullW);
    const canvasWidth  = Math.round(fullW * previewScale);
    const canvasHeight = Math.round(fullH * previewScale);

    // Scale all coordinate values for preview
    const s = previewScale;

    canvas.width  = canvasWidth;
    canvas.height = canvasHeight;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    const zMap = {};
    lyrs.forEach((l) => { zMap[l.name] = l.zIndex; });

    // All renderable items: static layers + image placeholders + text layers
    const items = [
      ...flattenLayers(tmpl.layers).map((l) => ({ ...l, zIndex: zMap[l.name] ?? l.zIndex, _kind: "layer" })),
      ...txts.map((t) => ({ ...t, _kind: "text" })),
    ].sort((a, b) => a.zIndex - b.zIndex);

    for (const item of items) {
      if (item._kind === "text") {
        // Render text layer
        const t = item;
        if (!t.content) continue;
        const scaledSize = Math.round(t.size * s);
        ctx.save();
        ctx.font         = buildFont({ ...t, size: scaledSize });
        ctx.fillStyle    = t.color;
        ctx.textAlign    = t.alignment;
        ctx.textBaseline = "alphabetic";

        // Word wrap — boxWidth is the user-resizable text box width, the
        // single source of truth for wrapping (used identically by
        // getTextBounds for hit-testing/the resize handle).
        const maxWidth = (t.boxWidth || 400) * s;
        const lines    = wrapText(ctx, t.content, maxWidth);
        const lineH    = scaledSize * 1.3;
        lines.forEach((line, i) => {
          const tx = t.alignment === "center" ? canvasWidth / 2
                   : t.alignment === "right"  ? canvasWidth - 40
                   : t.pos.x * s;
          ctx.fillText(line, tx, t.pos.y * s + i * lineH);
        });
        ctx.restore();

        // Selection outline + resize handle, only for the selected text box.
        const textLayerEntry = lyrs.find((l) => l.placeholder?.id === t.id);
        if (textLayerEntry && textLayerEntry.name === selected) {
          const b = getTextBounds(ctx, t, fullW);
          if (b) {
            ctx.save();
            ctx.strokeStyle = "#3b82f6";
            ctx.setLineDash([5, 4]);
            ctx.lineWidth = 1.5;
            ctx.strokeRect(b.left * s, b.top * s, (b.right - b.left) * s, (b.bottom - b.top) * s);
            ctx.setLineDash([]);

            const hx = b.right * s;
            const hy = (b.top + b.bottom) / 2 * s;
            ctx.beginPath();
            ctx.arc(hx, hy, 6, 0, Math.PI * 2);
            ctx.fillStyle = "#fff";
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
          }
        }
        continue;
      }

      const layer = item;
      if (!layer.visible) continue;
      ctx.globalAlpha = layer.opacity ?? 1;

      if (layer.placeholder) {
        if (layer.placeholder.type === "TEXT") { ctx.globalAlpha = 1; continue; } // handled above
        const ph       = phs.find((p) => p.id === layer.placeholder.id);
        const clipMask = layer.clipPath ? clipImgsRef.current[layer.clipPath] : null;
        const shadowImg = layer.shadowPath ? shadowImgsRef.current[layer.shadowPath] : null;
        const color    = PLACEHOLDER_COLORS[layer.placeholder.type] || "#6b7280";

        if (shadowImg) ctx.drawImage(shadowImg, 0, 0, canvasWidth, canvasHeight);

        if (ph?.userImage) {
          const scaledBounds = { x: layer.bounds.x * s, y: layer.bounds.y * s, width: layer.bounds.width * s, height: layer.bounds.height * s };
          const scaledOffset = { x: (ph.offset?.x || 0) * s, y: (ph.offset?.y || 0) * s };
          drawImageInBounds(ctx, ph.userImage, scaledBounds, ph.fitMode, scaledOffset, clipMask, canvasWidth, canvasHeight);
        } else if (clipMask) {
          // No photo uploaded yet — show the mask layer's own rendered
          // look (its real color/gradient from the PSD) so it matches the
          // actual design, plus a low-opacity color tint over that same
          // shape so it's still obvious at a glance this zone needs a photo.
          ctx.drawImage(clipMask, 0, 0, canvasWidth, canvasHeight);

          const tint = document.createElement("canvas");
          tint.width = canvasWidth; tint.height = canvasHeight;
          const tc = tint.getContext("2d");
          tc.fillStyle = `${color}55`;
          tc.fillRect(0, 0, canvasWidth, canvasHeight);
          tc.globalCompositeOperation = "destination-in";
          tc.drawImage(clipMask, 0, 0, canvasWidth, canvasHeight);
          ctx.drawImage(tint, 0, 0);

          // Higher-opacity dashed border tracing the mask's actual shape
          // (not its bounding box), from the contour cached on load.
          const contour = clipContourRef.current[layer.clipPath];
          if (contour && contour.length > 1) {
            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 6]);
            ctx.beginPath();
            contour.forEach(([x, y], i) => {
              if (i === 0) ctx.moveTo(x * s, y * s); else ctx.lineTo(x * s, y * s);
            });
            ctx.closePath();
            ctx.stroke();
            ctx.restore();
          }
        } else {
          ctx.save();
          ctx.fillStyle = `${color}33`;
          ctx.fillRect(layer.bounds.x * s, layer.bounds.y * s, layer.bounds.width * s, layer.bounds.height * s);
          ctx.restore();
        }
      } else if (layer.imagePath) {
        const img = layerImgsRef.current[layer.imagePath];
        if (img) ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
      }

      ctx.globalAlpha = 1;
    }
  }

  // Keep the ref pointing at the latest renderCanvas closure (which reads
  // current state/refs like `selected`) after every render — in an effect,
  // not during the render body itself, since mutating a ref while rendering
  // is impure and unsafe under concurrent rendering.
  useEffect(() => {
    renderCanvasRef.current = renderCanvas;
  });

  // ── Mouse events — image pan + text drag ──────────────────────────────────
  function getCanvasPoint(e) {
    // Returns point in FULL PSD coordinates (not preview coordinates)
    const canvas = canvasRef.current;
    const tmpl   = templateRef.current;
    const rect   = canvas.getBoundingClientRect();
    const fullW  = tmpl?.meta?.canvasWidth  || canvas.width;
    const fullH  = tmpl?.meta?.canvasHeight || canvas.height;
    return {
      x: (e.clientX - rect.left)  / rect.width  * fullW,
      y: (e.clientY - rect.top)   / rect.height * fullH,
    };
  }

  function handleCanvasMouseDown(e) {
    dragMovedRef.current = false;
    const { x, y } = getCanvasPoint(e);
    const tmpl = templateRef.current;
    if (!tmpl) return;
    const measureCtx = canvasRef.current.getContext("2d");
    const s = Math.min(1, PREVIEW_WIDTH / tmpl.meta.canvasWidth);

    // Resize handle of the selected text box takes priority over dragging.
    if (selected) {
      const selLayer = layersRef.current.find((l) => l.name === selected);
      const t = selLayer?.placeholder
        ? textLayersRef.current.find((tl) => tl.id === selLayer.placeholder.id)
        : null;
      if (t) {
        const b = getTextBounds(measureCtx, t, tmpl.meta.canvasWidth);
        if (b) {
          const hx = b.right, hy = (b.top + b.bottom) / 2;
          const handleR = 20 / s; // generous full-res hit radius around the on-screen handle
          if (Math.hypot(x - hx, y - hy) <= handleR) {
            panningRef.current = { type: "text-resize", id: t.id, startX: e.clientX, startBoxWidth: t.boxWidth || 400 };
            canvasRef.current.style.cursor = "ew-resize";
            return;
          }
        }
      }
    }

    // Check text layers first (rendered on top). Hit-test against the
    // actual rendered (possibly multi-line, wrapped) bounding box, with a
    // little padding, so any click on the visible text grabs it.
    const txts = [...textLayersRef.current].sort((a, b) => b.zIndex - a.zIndex);
    const pad = 12;
    for (const t of txts) {
      const b = getTextBounds(measureCtx, t, tmpl.meta.canvasWidth);
      if (!b) continue;
      if (x >= b.left - pad && x <= b.right + pad && y >= b.top - pad && y <= b.bottom + pad) {
        panningRef.current = { type: "text", id: t.id, startX: e.clientX, startY: e.clientY, startOffsetX: t.pos.x, startOffsetY: t.pos.y };
        canvasRef.current.style.cursor = "grabbing";
        // Selecting the text is what shows its box + resize handle.
        const layerEntry = layersRef.current.find((l) => l.placeholder?.id === t.id);
        setSelected(layerEntry ? layerEntry.name : null);
        return;
      }
    }

    // Check image placeholders
    const phs = [...placeholdersRef.current].sort((a, b) => b.zIndex - a.zIndex);
    for (const ph of phs) {
      if (!ph.userImage) continue;
      const layer    = flattenLayers(tmpl.layers).find((l) => l.placeholder?.id === ph.id);
      const clipMask = layer?.clipPath ? clipImgsRef.current[layer.clipPath] : null;

      let hit = false;
      if (clipMask) {
        const tmp = document.createElement("canvas");
        tmp.width = clipMask.naturalWidth; tmp.height = clipMask.naturalHeight;
        const tc  = tmp.getContext("2d");
        tc.drawImage(clipMask, 0, 0);
        const px = tc.getImageData(Math.round(x), Math.round(y), 1, 1).data;
        hit = px[3] > 10;
      } else if (layer) {
        const { x: bx, y: by, width: bw, height: bh } = layer.bounds;
        hit = x >= bx && x <= bx + bw && y >= by && y <= by + bh;
      }

      if (hit) {
        panningRef.current = { type: "image", id: ph.id, startX: e.clientX, startY: e.clientY, startOffsetX: ph.offset?.x || 0, startOffsetY: ph.offset?.y || 0 };
        canvasRef.current.style.cursor = "grabbing";
        setSelected(null); // clicking something else hides the text box
        return;
      }
    }

    // Clicked empty canvas space — hide the text box.
    setSelected(null);
  }

  function handleCanvasMouseMove(e) {
    const p = panningRef.current;
    if (!p) return;
    dragMovedRef.current = true;

    const canvas = canvasRef.current;
    const tmpl   = templateRef.current;
    const rect   = canvas.getBoundingClientRect();
    // Map mouse delta to full PSD coordinate space
    const fullW  = tmpl?.meta?.canvasWidth  || canvas.width;
    const fullH  = tmpl?.meta?.canvasHeight || canvas.height;
    const dx = (e.clientX - p.startX) / rect.width  * fullW;
    const dy = (e.clientY - p.startY) / rect.height * fullH;

    if (p.type === "image") {
      placeholdersRef.current = placeholdersRef.current.map((ph) =>
        ph.id === p.id ? { ...ph, offset: { x: p.startOffsetX + dx, y: p.startOffsetY + dy } } : ph
      );
      setPlaceholders([...placeholdersRef.current]);
    } else if (p.type === "text") {
      textLayersRef.current = textLayersRef.current.map((t) =>
        t.id === p.id ? { ...t, pos: { x: p.startOffsetX + dx, y: p.startOffsetY + dy } } : t
      );
      setTextLayers([...textLayersRef.current]);
    } else if (p.type === "text-resize") {
      textLayersRef.current = textLayersRef.current.map((t) =>
        t.id === p.id ? { ...t, boxWidth: Math.max(40, p.startBoxWidth + dx) } : t
      );
      setTextLayers([...textLayersRef.current]);
    }

    scheduleRender();
  }

  function handleCanvasMouseUp() {
    panningRef.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = "default";
  }

  // Click-to-upload for empty placeholders — hit-tests the mask's actual
  // opaque pixels (same technique as the drag hit-test above) rather than
  // its bounding rectangle, so only the real visible shape is clickable.
  // click fires right after mouseup, so dragMovedRef (set in mousemove)
  // reliably tells us whether this was a genuine drag rather than a click.
  function handleCanvasClick(e) {
    if (dragMovedRef.current) { dragMovedRef.current = false; return; }
    const { x, y } = getCanvasPoint(e);
    const tmpl = templateRef.current;
    if (!tmpl) return;

    const phs = [...placeholdersRef.current].sort((a, b) => b.zIndex - a.zIndex);
    for (const ph of phs) {
      if (ph.userImage) continue;
      const layer = flattenLayers(tmpl.layers).find((l) => l.placeholder?.id === ph.id);
      if (!layer) continue;
      const clipMask = layer.clipPath ? clipImgsRef.current[layer.clipPath] : null;

      let hit = false;
      if (clipMask) {
        const tmp = document.createElement("canvas");
        tmp.width = clipMask.naturalWidth; tmp.height = clipMask.naturalHeight;
        const tc  = tmp.getContext("2d");
        tc.drawImage(clipMask, 0, 0);
        const px = tc.getImageData(Math.round(x), Math.round(y), 1, 1).data;
        hit = px[3] > 10;
      } else {
        const { x: bx, y: by, width: bw, height: bh } = layer.bounds;
        hit = x >= bx && x <= bx + bw && y >= by && y <= by + bh;
      }

      if (hit) {
        pendingUploadIdRef.current = ph.id;
        uploadInputRef.current?.click();
        return;
      }
    }
  }

  // ── Text change ───────────────────────────────────────────────────────────
  function handleTextChange(id, changes) {
    textLayersRef.current = textLayersRef.current.map((t) =>
      t.id === id ? { ...t, ...changes } : t
    );
    setTextLayers([...textLayersRef.current]);
    scheduleRender();
  }

  // ── Image upload/remove/fit ───────────────────────────────────────────────
  function handleUpload(placeholderId, file) {
    const existing = placeholdersRef.current.find((p) => p.id === placeholderId);
    if (existing?.previewUrl) URL.revokeObjectURL(existing.previewUrl);
    const previewUrl = URL.createObjectURL(file);
    const img        = new Image();
    img.onload = () => {
      placeholdersRef.current = placeholdersRef.current.map((p) =>
        p.id === placeholderId ? { ...p, previewUrl, userImage: img, offset: { x: 0, y: 0 } } : p
      );
      setPlaceholders([...placeholdersRef.current]);
      scheduleRender();
    };
    img.src = previewUrl;
    placeholdersRef.current = placeholdersRef.current.map((p) =>
      p.id === placeholderId ? { ...p, previewUrl, userImage: null } : p
    );
    setPlaceholders([...placeholdersRef.current]);
  }

  function handleRemove(placeholderId) {
    const existing = placeholdersRef.current.find((p) => p.id === placeholderId);
    if (existing?.previewUrl) URL.revokeObjectURL(existing.previewUrl);
    placeholdersRef.current = placeholdersRef.current.map((p) =>
      p.id === placeholderId ? { ...p, previewUrl: null, userImage: null, offset: { x: 0, y: 0 } } : p
    );
    setPlaceholders([...placeholdersRef.current]);
    scheduleRender();
  }

  function handleFitMode(placeholderId, fitMode) {
    placeholdersRef.current = placeholdersRef.current.map((p) =>
      p.id === placeholderId ? { ...p, fitMode } : p
    );
    setPlaceholders([...placeholdersRef.current]);
    scheduleRender();
  }

  // ── Reorder ───────────────────────────────────────────────────────────────
  // Shared by both the sidebar's up/down arrows and drag-and-drop: swap two
  // layers' zIndex, re-sort, and keep text layers' zIndex in sync.
  function swapZIndex(nameA, nameB) {
    const list = layersRef.current;
    const a = list.find((l) => l.name === nameA);
    const b = list.find((l) => l.name === nameB);
    if (!a || !b) return;
    const updated  = list.map((l) => {
      if (l.name === nameA) return { ...l, zIndex: b.zIndex };
      if (l.name === nameB) return { ...l, zIndex: a.zIndex };
      return l;
    });
    const resorted = [...updated].sort((x, y) => y.zIndex - x.zIndex);
    layersRef.current = resorted;
    setLayers(resorted);

    textLayersRef.current = textLayersRef.current.map((t) => {
      const match = resorted.find((l) => l.placeholder?.id === t.id);
      return match ? { ...t, zIndex: match.zIndex } : t;
    });
    setTextLayers([...textLayersRef.current]);

    scheduleRender();
  }

  function reorderPlaceholder(name, direction) {
    const list = layersRef.current;
    const idx  = list.findIndex((l) => l.name === name);
    const swap = direction === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= list.length) return;
    swapZIndex(name, list[swap].name);
  }

  // Moves draggedName to sit directly above/below targetName (rather than a
  // plain pairwise swap), reassigning the existing set of zIndex values to
  // the new order so nothing outside this move changes.
  function moveLayer(draggedName, targetName, position) {
    if (draggedName === targetName) return;
    const list = layersRef.current;
    const draggedLayer = list.find((l) => l.name === draggedName);
    if (!draggedLayer) return;
    const zValues = list.map((l) => l.zIndex);

    const withoutDragged = list.filter((l) => l.name !== draggedName);
    let targetIdx = withoutDragged.findIndex((l) => l.name === targetName);
    if (targetIdx === -1) return;
    if (position === "below") targetIdx += 1;

    const newOrder = [...withoutDragged];
    newOrder.splice(targetIdx, 0, draggedLayer);

    const reindexed = newOrder.map((l, i) => ({ ...l, zIndex: zValues[i] }));
    layersRef.current = reindexed;
    setLayers(reindexed);

    textLayersRef.current = textLayersRef.current.map((t) => {
      const match = reindexed.find((l) => l.placeholder?.id === t.id);
      return match ? { ...t, zIndex: match.zIndex } : t;
    });
    setTextLayers([...textLayersRef.current]);

    scheduleRender();
  }

  function handleDragStart(e, name) { dragIdRef.current = name; e.dataTransfer.effectAllowed = "move"; }

  // Snap to "above" or "below" the hovered row depending on which half of
  // it the mouse is over, and surface that as dropIndicator so the row can
  // draw a line where the dragged layer will land.
  function handleDragOver(e, name) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!dragIdRef.current || dragIdRef.current === name) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const position = (e.clientY - rect.top) < rect.height / 2 ? "above" : "below";
    setDropIndicator((prev) =>
      prev && prev.name === name && prev.position === position ? prev : { name, position }
    );
  }

  function handleDrop(e, targetName) {
    e.preventDefault();
    const dragName = dragIdRef.current;
    const indicator = dropIndicator;
    dragIdRef.current = null;
    setDropIndicator(null);
    if (!dragName || !indicator || indicator.name !== targetName) return;
    moveLayer(dragName, indicator.name, indicator.position);
  }

  function handleDragEnd() {
    dragIdRef.current = null;
    setDropIndicator(null);
  }

  // ── Export — renders at full PSD resolution ──────────────────────────────
  async function performExport(format) {
    const tmpl = templateRef.current;
    if (!tmpl) return;
    setExporting(true);
    await new Promise((r) => setTimeout(r, 50));

    // Create an offscreen full-res canvas
    const fullCanvas    = document.createElement("canvas");
    const { canvasWidth, canvasHeight } = tmpl.meta;
    fullCanvas.width    = canvasWidth;
    fullCanvas.height   = canvasHeight;

    // Temporarily swap canvasRef to the full-res canvas, render, then swap back
    const originalCanvas     = canvasRef.current;
    canvasRef.current        = fullCanvas;
    renderCanvas(true);  // full = true → previewScale = 1
    canvasRef.current        = originalCanvas;

    const mimeType = format === "jpg" ? "image/jpeg" : "image/png";
    fullCanvas.toBlob(
      (blob) => {
        const url = URL.createObjectURL(blob);
        const a   = document.createElement("a");
        a.href = url; a.download = `presentation.${format}`; a.click();
        URL.revokeObjectURL(url);
        setExporting(false);
        // Re-render preview canvas
        renderCanvas();
      },
      mimeType,
      format === "jpg" ? 0.95 : undefined
    );
  }

  // Export is the gated action — you can open and customize a template
  // freely, but exporting the finished result requires the one-time
  // per-template purchase (see app/lib/mockPayment.js).
  function handleExport(format = "png") {
    if (!hasPurchased(templateId)) {
      pendingExportFormatRef.current = format;
      setShowPaywall(true);
      return;
    }
    performExport(format);
  }

  function handlePaymentSuccess() {
    markPurchased(templateId);
    setShowPaywall(false);
    const format = pendingExportFormatRef.current || "png";
    pendingExportFormatRef.current = null;
    performExport(format);
  }

  function handlePaymentCancel() {
    pendingExportFormatRef.current = null;
    setShowPaywall(false);
  }

  // ─── Early returns ────────────────────────────────────────────────────────
  if (loading) return <div style={S.centered}><p style={{ color: "#aaa", fontFamily: "system-ui" }}>Loading template...</p></div>;
  if (error)   return <div style={S.centered}><p style={{ color: "#f87171", fontFamily: "system-ui" }}>Error: {error}</p></div>;

  const ps_      = Math.min(1, PREVIEW_WIDTH / template.meta.canvasWidth);
  const previewW = Math.round(template.meta.canvasWidth  * ps_);
  const previewH = Math.round(template.meta.canvasHeight * ps_);
  // CSS display size = preview canvas size × CSS scale
  const displayW = Math.round(previewW * scale);
  const displayH = Math.round(previewH * scale);
  // Derived directly from template rather than kept in state — avoids
  // calling setState synchronously inside the image-loading effect.
  const totalLayers = flattenLayers(template.layers).filter((l) => l.imagePath).length;
  const allLoaded = totalLayers > 0 && loadedCount >= totalLayers;

  // Build combined layers list for sidebar
  // Text layers appear in the layers list too (by their layer entry)
  const sidebarLayers = layers;

  return (
    <div style={S.root}>
      <div style={S.topbar}>
        <div style={S.topbarLeft}>
          <span style={S.logo}>ArchPresent</span>
          <span style={S.templateName}>{template.meta.source}</span>
          {!allLoaded && totalLayers > 0 && (
            <span style={{ fontSize: 11, color: "#555", fontFamily: "monospace" }}>
              Loading {loadedCount}/{totalLayers}...
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ ...S.btn, background: "#2a1f0a", color: "#f59e0b", borderColor: "#4a3510" }} onClick={renderCanvas}>Apply</button>
          <button style={S.btn} onClick={() => handleExport("png")} disabled={exporting}>{exporting ? "Exporting..." : "Export PNG"}</button>
          <button style={{ ...S.btn, background: "#1d2d1d", color: "#4ade80", borderColor: "#2d4d2d" }} onClick={() => handleExport("jpg")} disabled={exporting}>Export JPG</button>
        </div>
      </div>

      <div style={S.body}>
        <div style={S.sidebar}>
          <div style={S.sidebarHeader}>
            Layers <span style={S.badge}>{sidebarLayers.length}</span>
            <span style={{ marginLeft: "auto", fontSize: 10, color: "#444", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>top → bottom</span>
          </div>
          <div style={{ overflowY: "auto", flex: 1, padding: "8px 10px" }}>
            {sidebarLayers.map((layer) => {
              const isText        = layer.placeholder?.type === "TEXT";
              const isPlaceholder = !!layer.placeholder;
              const txtState      = isText ? textLayers.find((t) => t.id === layer.placeholder.id) : null;
              const phState       = isPlaceholder && !isText ? placeholders.find((p) => p.id === layer.placeholder.id) : null;
              const layerIdx      = sidebarLayers.findIndex((l) => l.name === layer.name);
              const isFirst       = layerIdx === 0;
              const isLast        = layerIdx === sidebarLayers.length - 1;

              const dropPosition = dropIndicator?.name === layer.name ? dropIndicator.position : null;

              if (isText && txtState) {
                return (
                  <TextLayerRow
                    key={layer.name + layer.zIndex}
                    layer={layer}
                    txtState={txtState}
                    isFirst={isFirst}
                    isLast={isLast}
                    isSelected={selected === layer.name}
                    dropPosition={dropPosition}
                    onSelect={() => setSelected(selected === layer.name ? null : layer.name)}
                    onTextChange={handleTextChange}
                    onMoveUp={(name) => reorderPlaceholder(name, "up")}
                    onMoveDown={(name) => reorderPlaceholder(name, "down")}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onDragEnd={handleDragEnd}
                  />
                );
              }

              return (
                <LayerRow
                  key={layer.name + layer.zIndex}
                  layer={layer}
                  phState={phState}
                  isSelected={selected === layer.name}
                  isFirst={isFirst}
                  isLast={isLast}
                  dropPosition={dropPosition}
                  onSelect={() => setSelected(selected === layer.name ? null : layer.name)}
                  onUpload={handleUpload}
                  onRemove={handleRemove}
                  onFitMode={handleFitMode}
                  onMoveUp={(name) => reorderPlaceholder(name, "up")}
                  onMoveDown={(name) => reorderPlaceholder(name, "down")}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                />
              );
            })}
          </div>
        </div>

        <div style={S.canvasArea} ref={containerRef}>
          <div style={{ position: "relative", width: displayW, height: displayH, margin: "auto", boxShadow: "0 8px 40px #0008", flexShrink: 0 }}>
            <canvas
              ref={canvasRef}
              style={{ width: displayW, height: displayH, display: "block", cursor: "default" }}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              onClick={handleCanvasClick}
            />
            {placeholders.map((p) =>
              p.bounds.width > 0 && p.bounds.height > 0 && p.type !== "TEXT" ? (
                <PlaceholderOverlay key={p.id} placeholder={p} scale={ps_ * scale} />
              ) : null
            )}
          </div>
        </div>
      </div>
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f && pendingUploadIdRef.current) handleUpload(pendingUploadIdRef.current, f);
          e.target.value = "";
        }}
      />
      {showPaywall && (
        <PaywallModal
          templateId={templateId}
          onPay={handlePaymentSuccess}
          onCancel={handlePaymentCancel}
        />
      )}
    </div>
  );
}

const S = {
  root: { display: "flex", flexDirection: "column", height: "100vh", background: "#0a0a0a", color: "#e5e5e5", fontFamily: "system-ui, -apple-system, sans-serif", overflow: "hidden" },
  centered: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0a0a0a" },
  topbar: { height: 52, background: "#111", borderBottom: "1px solid #222", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", flexShrink: 0 },
  topbarLeft: { display: "flex", alignItems: "center", gap: 12 },
  logo: { fontSize: 15, fontWeight: 700, color: "#fff", letterSpacing: "0.02em" },
  templateName: { fontSize: 12, color: "#555", fontFamily: "monospace" },
  btn: { padding: "6px 16px", background: "#1a2a3a", color: "#60a5fa", border: "1px solid #1e3a5f", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "system-ui, sans-serif" },
  body: { display: "flex", flex: 1, overflow: "hidden" },
  sidebar: { width: 260, flexShrink: 0, background: "#0d0d0d", borderRight: "1px solid #1e1e1e", display: "flex", flexDirection: "column", overflow: "hidden" },
  sidebarHeader: { padding: "12px 14px", fontSize: 11, fontWeight: 700, color: "#666", letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: "1px solid #1e1e1e", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 },
  badge: { background: "#1a1a1a", color: "#555", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 8 },
  canvasArea: { flex: 1, overflow: "auto", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 16, background: "#0a0a0a" },
};
