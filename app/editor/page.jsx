"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { PLACEHOLDER_COLORS, PREVIEW_WIDTH } from "./lib/constants";
import { flattenLayers, drawImageInBounds, buildFont, traceMaskContour, wrapText, getTextBounds, drawWatermark, textDirection, loadFonts } from "./lib/canvas";
import { getUser } from "../lib/mockAuth";
import { effectiveModel, hasPurchased, spendPoints } from "../lib/mockStore";
import { useSession } from "../lib/useSession";
import { getDraft, saveDraft, deleteDraft, purgeExpiredDrafts, draftId } from "../lib/mockDrafts";
import { photoKey, putPhoto, getPhoto, deletePhoto } from "../lib/photoStore";
import { serializePage, mergePage } from "./lib/draftState";
import { useI18n } from "../i18n/I18nProvider";
import LanguageSwitcher from "../i18n/LanguageSwitcher";
import PlaceholderOverlay from "./components/PlaceholderOverlay";
import TextLayerRow from "./components/TextLayerRow";
import LayerRow from "./components/LayerRow";
import BuyModal from "./components/BuyModal";

// A page as it starts: every zone empty, text at its default, layers in template order.
function freshPage(data) {
  const imgPhs = data.placeholders.filter((p) => p.type !== "TEXT");
  const txtPhs = data.placeholders.filter((p) => p.type === "TEXT");
  const initPhs = imgPhs.map((p) => ({ ...p, userImage: null, previewUrl: null, fitMode: "fill", offset: { x: 0, y: 0 } }));
  // Text layer state: position starts at the placeholder bounds
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
  const allLayers = flattenLayers(data.layers).sort((a, b) => b.zIndex - a.zIndex);
  return { initPhs, initTxt, allLayers };
}

// Puts a saved draft's edits for this page onto the fresh page, and loads the
// photos it stored (from IndexedDB). Falls back to the fresh page on any problem,
// so a damaged draft never blocks the editor.
async function restoreFromDraft(fresh, draft, index) {
  const savedPage = draft?.state?.pages?.[String(index)];
  if (!savedPage) return fresh;
  try {
    const merged = mergePage({ placeholders: fresh.initPhs, textLayers: fresh.initTxt, layers: fresh.allLayers }, savedPage);
    const initPhs = await Promise.all(merged.placeholders.map(async (p) => {
      if (!merged.photoIds.includes(p.id)) return p;
      const blob = await getPhoto(photoKey(draft.id, index, p.id));
      if (!blob) return p;
      const url = URL.createObjectURL(blob);
      const img = await new Promise((resolve) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = () => resolve(null); i.src = url; });
      return img ? { ...p, userImage: img, previewUrl: url } : p;
    }));
    return { initPhs, initTxt: merged.textLayers, allLayers: merged.layers };
  } catch {
    return fresh;
  }
}

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
  const [showPaywall,  setShowPaywall]  = useState(false);  // the buy dialog
  const [buyError,     setBuyError]     = useState(null);
  const [visited,      setVisited]      = useState(() => new Set()); // page indexes the buyer has looked at
  const [model,        setModel]        = useState(null);  // { id, name, tier, pricePoints, pages: [{ name, template }] }
  const [pageIndex,    setPageIndex]    = useState(0);
  const [saveStatus,   setSaveStatus]   = useState(null);  // null | { kind: "saving" | "saved" | "restored" | "guest", at?, expiresAt? }
  const { user, balance } = useSession();
  const { t, dir, fmt } = useI18n();
  const modelIdRef = useRef("template");
  const modelNameRef = useRef("");
  const draftRef = useRef(null);        // the saved draft this session started from, then the latest save
  const dirtyRef = useRef(false);       // edits not saved yet
  const saveTimerRef = useRef(null);

  const loadTokenRef      = useRef(0);   // ignores stale page loads when the user clicks arrows quickly
  const displayedIndexRef = useRef(0);   // page currently on screen
  const pendingIndexRef   = useRef(0);   // page being navigated to
  const pageStateRef      = useRef({});  // pageIndex -> { placeholders, textLayers, layers }, so edits survive navigation

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

  // ── Draft autosave (browser-only placeholder, lib/mockDrafts.js) ───────────
  // Edits are saved about 1.5 s after the last change, and at once when the tab is
  // hidden or closed, so a power or internet cut loses at most a moment of work.
  // Only signed-in users have drafts. Pages not visited yet keep what the draft had.
  const saveNow = useCallback(() => {
    clearTimeout(saveTimerRef.current);
    if (!dirtyRef.current) return;
    const buyer = getUser();
    if (!buyer) return;
    dirtyRef.current = false;
    const pages = { ...(draftRef.current?.state?.pages || {}) };
    const live = {
      ...pageStateRef.current,
      [displayedIndexRef.current]: { placeholders: placeholdersRef.current, textLayers: textLayersRef.current, layers: layersRef.current },
    };
    for (const [i, st] of Object.entries(live)) pages[i] = serializePage(st);
    const saved = saveDraft(buyer.id, { id: modelIdRef.current, name: modelNameRef.current }, { pages, pageIndex: displayedIndexRef.current });
    draftRef.current = saved;
    setSaveStatus({ kind: "saved", at: saved.savedAt, expiresAt: saved.expiresAt });
  }, []);

  const markDirty = useCallback(() => {
    if (!getUser()) { setSaveStatus((s) => (s?.kind === "guest" ? s : { kind: "guest" })); return; }
    dirtyRef.current = true;
    setSaveStatus((s) => (s?.kind === "saving" ? s : { kind: "saving" }));
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(saveNow, 1500);
  }, [saveNow]);

  useEffect(() => {
    const flush = () => saveNow();
    const onHide = () => { if (document.visibilityState === "hidden") saveNow(); };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onHide);
      saveNow();
    };
  }, [saveNow]);

  useEffect(() => { placeholdersRef.current = placeholders; }, [placeholders]);
  useEffect(() => { textLayersRef.current   = textLayers;   }, [textLayers]);
  useEffect(() => { layersRef.current       = layers;       }, [layers]);

  // Repaint once the fonts the text layers use have loaded. Keyed on the set of
  // fonts, not on the text, so typing does not re-run it.
  const fontKey = [...new Set(textLayers.map((t) => t.font))].sort().join("|");
  useEffect(() => {
    if (!fontKey) return;
    let live = true;
    loadFonts(fontKey.split("|")).then(() => { if (live) scheduleRender(); });
    return () => { live = false; };
  }, [fontKey, scheduleRender]);

  // ── Load a model page (template.json + editor state) ──────────────────────
  // Swaps the whole editor over to pages[index]. The outgoing page's edits are
  // stashed in pageStateRef first and restored if the user comes back to it.
  // The swap (state + caches + title) happens only after the fetch resolves,
  // so the canvas and the title change together.
  const loadPage = useCallback(async (pages, index) => {
    const token = ++loadTokenRef.current;
    const page  = pages[index];
    const base  = `/templates/${page.template}`;

    const res = await fetch(`${base}/template.json`);
    if (!res.ok) throw new Error(`template "${page.template}" not found`);
    const data = await res.json();
    if (token !== loadTokenRef.current) return;

    // A page not seen yet in this session starts fresh, with the saved draft's edits
    // and photos on it. Loaded before the swap so the canvas and title change together.
    let restored = null;
    if (!pageStateRef.current[index]) {
      restored = await restoreFromDraft(freshPage(data), draftRef.current, index);
      if (token !== loadTokenRef.current) return;
    }

    if (templateRef.current) {
      pageStateRef.current[displayedIndexRef.current] = {
        placeholders: placeholdersRef.current,
        textLayers:   textLayersRef.current,
        layers:       layersRef.current,
      };
    }

    // Image caches are keyed by relative path, which different templates can share.
    layerImgsRef.current  = {};
    clipImgsRef.current   = {};
    clipContourRef.current = {};
    shadowImgsRef.current = {};
    setLoadedCount(0);
    setSelected(null);

    templateBaseRef.current = base;
    templateRef.current     = data;
    displayedIndexRef.current = index;
    pendingIndexRef.current   = index;
    setTemplate(data);
    setPageIndex(index);
    setVisited((prev) => new Set(prev).add(index));

    const saved = pageStateRef.current[index];
    let initPhs, initTxt, allLayers;
    if (saved) {
      initPhs   = saved.placeholders;
      initTxt   = saved.textLayers;
      allLayers = saved.layers;
    } else {
      ({ initPhs, initTxt, allLayers } = restored);
    }

    placeholdersRef.current = initPhs;
    setPlaceholders(initPhs);
    textLayersRef.current = initTxt;
    setTextLayers(initTxt);
    layersRef.current = allLayers;
    setLayers(allLayers);

    setLoading(false);
  }, []);

  // ── Resolve the model, then load its first page ───────────────────────────
  // /editor?model=<id> reads public/models/<id>.json. The older
  // /editor?template=<id> still works and is treated as a one-page model.
  useEffect(() => {
    const params     = new URLSearchParams(window.location.search);
    const modelId    = params.get("model");
    const templateParam = params.get("template") || "template";

    const manifest = modelId
      ? fetch(`/models/${modelId}.json`).then((r) => {
          if (!r.ok) throw new Error(`model "${modelId}" not found`);
          return r.json();
        })
      : Promise.resolve({ name: templateParam, pages: [{ name: "Page 1", template: templateParam }] });

    manifest
      .then((m) => {
        if (!m.pages?.length) throw new Error("model has no pages");
        // The model's id is its file name, or "template-<id>" for the one-page link.
        const id = modelId || `template-${templateParam}`;
        modelIdRef.current = id;
        modelNameRef.current = m.name;
        setModel({ id, tier: "architect", pricePoints: 1000, ...m });

        // The signed-in user's saved draft of this model, if there is one (drafts
        // older than a month are deleted first). It opens on the page they left.
        const buyer = getUser();
        purgeExpiredDrafts();
        draftRef.current = buyer ? getDraft(buyer.id, id) : null;
        if (!buyer) setSaveStatus({ kind: "guest" });
        let start = 0;
        if (draftRef.current) {
          setSaveStatus({ kind: "restored", at: draftRef.current.savedAt, expiresAt: draftRef.current.expiresAt });
          const seen = Object.keys(draftRef.current.state?.pages || {}).map(Number);
          setVisited(new Set(seen));
          start = Math.min(Math.max(draftRef.current.state?.pageIndex || 0, 0), m.pages.length - 1);
        }
        return loadPage(m.pages, start);
      })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [loadPage]);

  function goToPage(delta) {
    if (!model) return;
    const next = pendingIndexRef.current + delta;
    if (next < 0 || next >= model.pages.length) return;
    pendingIndexRef.current = next;
    loadPage(model.pages, next).catch((err) => setError(err.message));
  }
  const goToIndex = (i) => goToPage(i - pendingIndexRef.current);

  // ── Load images ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!template) return;
    const base   = templateBaseRef.current;
    // The editor only draws a ~1800 px preview, so it loads the small copies the
    // converter wrote to previews/. Templates converted before that existed have
    // no meta.previews and load the full-size files as before.
    const root   = template.meta.previews ? `${base}/${template.meta.previews.path}` : base;
    const toLoad = flattenLayers(template.layers).filter((l) => l.imagePath).sort((a, b) => a.zIndex - b.zIndex);
    let cancelled = false;

    async function load() {
      for (const layer of toLoad) {
        if (cancelled) break;
        await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => { if (cancelled) { resolve(); return; } layerImgsRef.current[layer.imagePath] = img; setLoadedCount((n) => n + 1); scheduleRender(); resolve(); };
          img.onerror = () => resolve();
          img.src = `${root}/${layer.imagePath}`;
        });
      }
    }

    const clipPaths = [...new Set(template.placeholders.map((p) => p.clipPath).filter(Boolean))];
    clipPaths.forEach((cp) => {
      const img = new Image();
      img.onload  = () => {
        if (cancelled) return;
        clipImgsRef.current[cp] = img;
        clipContourRef.current[cp] = traceMaskContour(img, template.meta.canvasWidth, template.meta.canvasHeight);
        scheduleRender();
      };
      img.onerror = () => {};
      img.src = `${root}/${cp}`;
    });

    const shadowPaths = [...new Set(template.placeholders.map((p) => p.shadowPath).filter(Boolean))];
    shadowPaths.forEach((sp) => {
      const img = new Image();
      img.onload  = () => { if (cancelled) return; shadowImgsRef.current[sp] = img; scheduleRender(); };
      img.onerror = () => {};
      img.src = `${root}/${sp}`;
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
        ctx.direction    = textDirection(t.content);
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

    // Models the signed-in buyer has not bought stay watermarked on every
    // render. Exports only ever run for a bought model (see handleExport), so
    // this check alone keeps the watermark off real downloads without a
    // separate "is this an export" flag.
    const buyer = getUser();
    if (!(buyer && hasPurchased(buyer.id, modelIdRef.current))) {
      drawWatermark(ctx, canvasWidth, canvasHeight);
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
        setSelected(layer ? layer.name : null); // selects the row; also hides any text box
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
    if (panningRef.current && dragMovedRef.current) markDirty(); // a photo or text was moved or resized
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
        setSelected(layer.name);
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
    markDirty();
  }

  // ── Image upload/remove/fit ───────────────────────────────────────────────
  function handleUpload(placeholderId, file) {
    const existing = placeholdersRef.current.find((p) => p.id === placeholderId);
    if (existing?.previewUrl) URL.revokeObjectURL(existing.previewUrl);
    const previewUrl = URL.createObjectURL(file);
    const img        = new Image();
    // Keep the photo with the draft so it survives a refresh or a cut.
    const buyer = getUser();
    if (buyer) putPhoto(photoKey(draftId(buyer.id, modelIdRef.current), displayedIndexRef.current, placeholderId), file);
    img.onload = () => {
      placeholdersRef.current = placeholdersRef.current.map((p) =>
        p.id === placeholderId ? { ...p, previewUrl, userImage: img, offset: { x: 0, y: 0 } } : p
      );
      setPlaceholders([...placeholdersRef.current]);
      scheduleRender();
      markDirty();
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
    const buyer = getUser();
    if (buyer) deletePhoto(photoKey(draftId(buyer.id, modelIdRef.current), displayedIndexRef.current, placeholderId));
    markDirty();
  }

  function handleFitMode(placeholderId, fitMode) {
    placeholdersRef.current = placeholdersRef.current.map((p) =>
      p.id === placeholderId ? { ...p, fitMode } : p
    );
    setPlaceholders([...placeholdersRef.current]);
    scheduleRender();
    markDirty();
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
    markDirty();
  }

  function reorderPlaceholder(name, direction) {
    // Only editable layers are listed, so step to the neighbouring editable
    // one (static layers between them keep their own z-index).
    const list = layersRef.current.filter((l) => l.placeholder);
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
    markDirty();
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

  // The export must use the full-size layers, but the editor only holds the
  // small previews. Loads the full-size set on demand, for the export only.
  // (Until the server renders exports, T-023, this peak memory is unavoidable.)
  async function loadFullImages(tmpl) {
    const base = templateBaseRef.current;
    const load = (p) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = `${base}/${p}`;
    });
    const layers = {}, clips = {}, shadows = {};
    for (const l of flattenLayers(tmpl.layers)) if (l.imagePath && !layers[l.imagePath]) layers[l.imagePath] = await load(l.imagePath);
    for (const p of tmpl.placeholders) {
      if (p.clipPath   && !clips[p.clipPath])     clips[p.clipPath]     = await load(p.clipPath);
      if (p.shadowPath && !shadows[p.shadowPath]) shadows[p.shadowPath] = await load(p.shadowPath);
    }
    return { layers, clips, shadows };
  }

  // ── Export — renders at full PSD resolution ──────────────────────────────
  async function performExport(format) {
    const tmpl = templateRef.current;
    if (!tmpl) return;
    setExporting(true);
    await loadFonts(textLayersRef.current.map((t) => t.font));
    await new Promise((r) => setTimeout(r, 50));

    // Create an offscreen full-res canvas
    const fullCanvas    = document.createElement("canvas");
    const { canvasWidth, canvasHeight } = tmpl.meta;
    fullCanvas.width    = canvasWidth;
    fullCanvas.height   = canvasHeight;

    // Templates with previews: swap in the full-size images for this render only.
    const previewImgs = tmpl.meta.previews
      ? { layers: layerImgsRef.current, clips: clipImgsRef.current, shadows: shadowImgsRef.current }
      : null;
    if (previewImgs) {
      const full = await loadFullImages(tmpl);
      layerImgsRef.current = full.layers; clipImgsRef.current = full.clips; shadowImgsRef.current = full.shadows;
    }

    // Temporarily swap canvasRef to the full-res canvas, render, then swap back
    const originalCanvas     = canvasRef.current;
    canvasRef.current        = fullCanvas;
    try {
      renderCanvas(true);  // full = true → previewScale = 1
    } finally {
      canvasRef.current      = originalCanvas;
      if (previewImgs) {
        layerImgsRef.current = previewImgs.layers; clipImgsRef.current = previewImgs.clips; shadowImgsRef.current = previewImgs.shadows;
      }
    }

    const mimeType = format === "jpg" ? "image/jpeg" : "image/png";
    fullCanvas.toBlob(
      (blob) => {
        const url = URL.createObjectURL(blob);
        const a   = document.createElement("a");
        a.href = url; a.download = `presentation.${format}`; a.click();
        URL.revokeObjectURL(url);
        setExporting(false);
        // Re-render the preview canvas
        renderCanvas();
      },
      mimeType,
      format === "jpg" ? 0.95 : undefined
    );
  }

  // Throws the saved draft away and reopens the model from scratch.
  function startOver() {
    if (!window.confirm(t("draft.confirmStartOver"))) return;
    const buyer = getUser();
    clearTimeout(saveTimerRef.current);
    dirtyRef.current = false;
    if (buyer) deleteDraft(draftId(buyer.id, modelIdRef.current));
    draftRef.current = null;
    window.location.reload();
  }

  // Export is the gated action: anyone can open and customize a model, but
  // exporting needs it bought with points (see lib/mockStore.js).
  function handleExport(format = "png") {
    const buyer = getUser();
    const modelId = modelIdRef.current;
    if (buyer && hasPurchased(buyer.id, modelId)) {
      performExport(format);
      return;
    }
    pendingExportFormatRef.current = format;
    setBuyError(null);
    setShowPaywall(true);
  }

  // The buyer pressed Buy: spend the points, then run the export they asked for.
  function handleBuy() {
    const buyer = getUser();
    if (!buyer || !model) return;
    try {
      spendPoints(buyer.id, effectiveModel(model));
    } catch (e) {
      setBuyError(e.code ? t(`err.${e.code}`, e.params) : e.message);
      return;
    }
    setBuyError(null);
    setShowPaywall(false);
    scheduleRender(); // the watermark comes off
    const format = pendingExportFormatRef.current || "png";
    pendingExportFormatRef.current = null;
    performExport(format);
  }

  function handleBuyCancel() {
    pendingExportFormatRef.current = null;
    setShowPaywall(false);
  }

  // ─── Early returns ────────────────────────────────────────────────────────
  if (loading) return <div style={S.centered}><p style={{ color: "var(--ink-muted)", fontFamily: "var(--font-sans)" }}>{t("editor.loading")}</p></div>;
  if (error)   return <div style={S.centered}><p style={{ color: "var(--danger)", fontFamily: "var(--font-sans)" }}>{t("editor.error", { message: error })}</p></div>;

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
  const hasPages  = model.pages.length > 1;

  // Build combined layers list for sidebar
  // Text layers appear in the layers list too (by their layer entry)
  const sidebarLayers = layers.filter((l) => l.placeholder); // only what the buyer can edit

  return (
    <div style={S.root}>
      <div style={S.topbar}>
        <div style={S.topbarLeft}>
          <span style={S.logo}>ArchPresent</span>
          <h1 style={S.modelTitle} title={template.meta.source}>
            {model.name}
            <span style={S.pageTitle}> ({model.pages[pageIndex]?.name})</span>
          </h1>
          {saveStatus && (
            <span style={S.saveStatus} title={saveStatus.expiresAt ? t("draft.keptUntil", { date: fmt.day(saveStatus.expiresAt) }) : undefined}>
              {saveStatus.kind === "saving" && t("draft.saving")}
              {saveStatus.kind === "saved" && t("draft.saved", { when: fmt.date(saveStatus.at) })}
              {saveStatus.kind === "restored" && (
                <>
                  {t("draft.restored", { when: fmt.date(saveStatus.at) })}{" "}
                  <button type="button" style={S.linkBtn} onClick={startOver}>{t("draft.startOver")}</button>
                </>
              )}
              {saveStatus.kind === "guest" && (
                <>{t("draft.guest")} <a href="/login" style={S.linkBtn}>{t("nav.signIn")}</a></>
              )}
            </span>
          )}
          {!allLoaded && totalLayers > 0 && (
            <span style={{ fontSize: "var(--fs-11)", color: "var(--ink-subtle)", fontFamily: "var(--font-mono)" }}>
              {t("editor.loadingLayers", { done: loadedCount, total: totalLayers })}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <LanguageSwitcher />
          <button style={{ ...S.btn, background: "var(--warn-bg)", color: "var(--warn)", borderColor: "var(--warn-line)" }} onClick={renderCanvas}>{t("editor.apply")}</button>
          <button style={S.btn} onClick={() => handleExport("png")} disabled={exporting}>{exporting ? t("editor.exporting") : t("editor.exportPng")}</button>
          <button style={{ ...S.btn, background: "var(--go-bg)", color: "var(--go)", borderColor: "var(--go-line)" }} onClick={() => handleExport("jpg")} disabled={exporting}>{t("editor.exportJpg")}</button>
        </div>
      </div>

      <div style={S.body}>
        <div style={S.sidebar}>
          <div style={S.sidebarHeader}>
            {t("editor.layers")} <span style={S.badge}>{sidebarLayers.length}</span>
            <span style={{ marginInlineStart: "auto", fontSize: "var(--fs-10)", color: "var(--ink-faint)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>{t("editor.topToBottom")}</span>
          </div>
          <div style={{ overflowY: "auto", flex: 1, padding: "8px 10px" }}>
            {sidebarLayers.length === 0 && (
              <p style={{ margin: 0, fontSize: "var(--fs-12)", color: "var(--ink-subtle)" }}>{t("editor.nothing")}</p>
            )}
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

        <div style={S.canvasColumn}>
          <div style={S.stage}>
            {hasPages && (
              <button
                aria-label={t("editor.prev")}
                style={{ ...S.navArrow, borderInlineEnd: "1px solid var(--line)", ...(pageIndex === 0 ? S.navArrowDisabled : null) }}
                disabled={pageIndex === 0}
                onClick={() => goToPage(-1)}
              >{dir === "rtl" ? "›" : "‹"}</button>
            )}

            <div style={S.canvasArea} ref={containerRef}>
              <div style={{ position: "relative", width: displayW, height: displayH, margin: "auto", boxShadow: "var(--shadow-canvas)", flexShrink: 0 }}>
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

            {hasPages && (
              <button
                aria-label={t("editor.next")}
                style={{ ...S.navArrow, borderInlineStart: "1px solid var(--line)", ...(pageIndex === model.pages.length - 1 ? S.navArrowDisabled : null) }}
                disabled={pageIndex === model.pages.length - 1}
                onClick={() => goToPage(1)}
              >{dir === "rtl" ? "‹" : "›"}</button>
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
      {showPaywall && model && (
        <BuyModal
          model={effectiveModel(model)}
          pages={model.pages}
          visited={visited}
          user={user}
          balance={balance}
          error={buyError}
          onGoToPage={(i) => { setShowPaywall(false); goToIndex(i); }}
          onBuy={handleBuy}
          onCancel={handleBuyCancel}
        />
      )}
    </div>
  );
}

const S = {
  root: { display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg)", color: "var(--ink-body)", fontFamily: "var(--font-sans)", overflow: "hidden" },
  centered: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg)" },
  topbar: { height: 52, background: "var(--surface)", borderBottom: "1px solid var(--line-faint)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", flexShrink: 0 },
  topbarLeft: { display: "flex", alignItems: "center", gap: 16, minWidth: 0 },
  logo: { fontSize: "var(--fs-15)", fontWeight: 700, color: "var(--ink)", letterSpacing: "0.02em" },
  btn: { padding: "6px 16px", background: "var(--accent-bg)", color: "var(--accent-ink)", border: "1px solid var(--accent-line)", borderRadius: "var(--r-md)", fontSize: "var(--fs-13)", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" },
  saveStatus: { fontSize: "var(--fs-12)", color: "var(--ink-subtle)", whiteSpace: "nowrap" },
  linkBtn: { background: "none", border: "none", padding: 0, color: "var(--accent-ink)", fontSize: "var(--fs-12)", fontFamily: "var(--font-sans)", cursor: "pointer", textDecoration: "underline" },
  body: { display: "flex", flex: 1, overflow: "hidden" },
  sidebar: { order: 2, width: 260, flexShrink: 0, background: "var(--surface-sunken)", borderInlineStart: "1px solid var(--line)", display: "flex", flexDirection: "column", overflow: "hidden" },
  sidebarHeader: { padding: "12px 14px", fontSize: "var(--fs-11)", fontWeight: 700, color: "var(--ink-subtle)", letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 },
  badge: { background: "var(--surface-hover)", color: "var(--ink-subtle)", fontSize: "var(--fs-10)", fontWeight: 700, padding: "1px 6px", borderRadius: "var(--r-lg)" },
  canvasColumn: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" },
  modelTitle: { margin: 0, fontSize: "var(--fs-18)", fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  pageTitle: { fontWeight: 500, color: "var(--ink-muted)" },
  stage: { flex: 1, minHeight: 0, display: "flex" },
  navArrow: { width: 56, flexShrink: 0, background: "var(--surface-sunken)", border: "none", color: "var(--ink-body)", fontSize: "var(--fs-44)", lineHeight: 1, cursor: "pointer", fontFamily: "var(--font-sans)" },
  navArrowDisabled: { color: "var(--ink-faint)", cursor: "default" },
  canvasArea: { flex: 1, overflow: "auto", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 16, background: "var(--bg)" },
};
