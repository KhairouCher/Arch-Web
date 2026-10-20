// What a draft keeps, and how it goes back onto a page (Plan P-4.2, P-5.6; draft
// state in docs/backend-model.json). Edits only: text (content, font, size, color,
// alignment, position, box width), photo choices (fit or fill, offset, whether a
// photo is stored), and layer order. The photo files are stored apart from this
// state (lib/photoStore.js now, object storage with the backend).
//
// Pure functions, no browser APIs, so they are tested in draftState.test.mjs.

export const DRAFT_MONTHS = 1; // a draft is deleted this long after its last save

export function expiryOf(savedIso) {
  const d = new Date(savedIso);
  d.setMonth(d.getMonth() + DRAFT_MONTHS);
  return d.toISOString();
}

export function isExpired(draft, now = Date.now()) {
  return new Date(draft.expiresAt).getTime() < now;
}

const TEXT_FIELDS = ["content", "font", "size", "color", "bold", "italic", "alignment", "pos", "boxWidth"];

// A page's live editor state -> the small, plain object a draft stores.
export function serializePage({ placeholders, textLayers, layers }) {
  return {
    placeholders: placeholders.map((p) => ({
      id: p.id, fitMode: p.fitMode, offset: p.offset, hasPhoto: !!(p.userImage || p.previewUrl),
    })),
    textLayers: textLayers.map((t) => {
      const out = { id: t.id };
      for (const f of TEXT_FIELDS) out[f] = t[f];
      return out;
    }),
    layers: layers.map((l) => ({ name: l.name, zIndex: l.zIndex })),
  };
}

// A page's fresh state + what the draft saved -> the state to show. Anything the
// template no longer has (a renamed zone, say) is ignored. Photos are not restored
// here: the result says which zones had one (hasPhoto) and the caller loads them.
export function mergePage(fresh, saved) {
  if (!saved) return { ...fresh, photoIds: [] };
  const savedPh = new Map((saved.placeholders || []).map((p) => [p.id, p]));
  const savedTxt = new Map((saved.textLayers || []).map((t) => [t.id, t]));
  const savedZ = new Map((saved.layers || []).map((l) => [l.name, l.zIndex]));

  const photoIds = [];
  const placeholders = fresh.placeholders.map((p) => {
    const s = savedPh.get(p.id);
    if (!s) return p;
    if (s.hasPhoto) photoIds.push(p.id);
    return { ...p, fitMode: s.fitMode ?? p.fitMode, offset: s.offset ?? p.offset };
  });

  const layers = fresh.layers
    .map((l) => (savedZ.has(l.name) ? { ...l, zIndex: savedZ.get(l.name) } : l))
    .sort((a, b) => b.zIndex - a.zIndex);

  // Text layers carry their own copy of the stacking order (see moveLayer in the editor).
  const textLayers = fresh.textLayers.map((t) => {
    const s = savedTxt.get(t.id);
    const merged = s ? { ...t, ...Object.fromEntries(TEXT_FIELDS.filter((f) => s[f] !== undefined).map((f) => [f, s[f]])) } : t;
    const layer = layers.find((l) => l.placeholder?.id === t.id);
    return layer ? { ...merged, zIndex: layer.zIndex } : merged;
  });

  return { placeholders, textLayers, layers, photoIds };
}
