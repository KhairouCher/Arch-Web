import test from "node:test";
import assert from "node:assert/strict";
import { expiryOf, isExpired, serializePage, mergePage } from "./draftState.js";

const fresh = () => ({
  placeholders: [
    { id: "front", fitMode: "fill", offset: { x: 0, y: 0 }, userImage: null, previewUrl: null, bounds: { x: 1 } },
    { id: "side", fitMode: "fill", offset: { x: 0, y: 0 }, userImage: null, previewUrl: null },
  ],
  textLayers: [
    { id: "title", zIndex: 5, content: "VUE 3D", font: "Arial", size: 86, color: "#000000", bold: false, italic: false, alignment: "left", pos: { x: 10, y: 20 }, boxWidth: 400, bounds: { x: 1 } },
  ],
  layers: [
    { name: "a", zIndex: 9 },
    { name: "title", zIndex: 5, placeholder: { id: "title" } },
    { name: "b", zIndex: 1 },
  ],
});

test("a draft expires one month after its last save", () => {
  assert.equal(expiryOf("2026-10-20T10:00:00.000Z"), "2026-11-20T10:00:00.000Z");
  assert.equal(expiryOf("2026-01-31T10:00:00.000Z").slice(0, 7), "2026-03"); // Jan 31 + 1 month rolls into March, never earlier
});

test("isExpired compares with the expiry date", () => {
  const d = { expiresAt: "2026-11-20T10:00:00.000Z" };
  assert.equal(isExpired(d, Date.parse("2026-11-20T09:59:00.000Z")), false);
  assert.equal(isExpired(d, Date.parse("2026-11-20T10:01:00.000Z")), true);
});

test("serializePage keeps edits only, not images or bounds", () => {
  const f = fresh();
  f.placeholders[0].userImage = {}; // has a photo
  f.placeholders[0].offset = { x: 5, y: 6 };
  f.textLayers[0].content = "Villa";
  const s = serializePage(f);
  assert.deepEqual(s.placeholders[0], { id: "front", fitMode: "fill", offset: { x: 5, y: 6 }, hasPhoto: true });
  assert.equal(s.placeholders[1].hasPhoto, false);
  assert.equal(s.textLayers[0].content, "Villa");
  assert.equal("bounds" in s.textLayers[0], false);
  assert.deepEqual(s.layers[0], { name: "a", zIndex: 9 });
  assert.doesNotThrow(() => JSON.stringify(s));
});

test("mergePage puts a saved page back on a fresh one", () => {
  const f = fresh();
  const edited = fresh();
  edited.placeholders[0].userImage = {};
  edited.placeholders[0].fitMode = "fit";
  edited.placeholders[0].offset = { x: 7, y: 8 };
  edited.textLayers[0].content = "Villa";
  edited.textLayers[0].pos = { x: 99, y: 98 };
  edited.layers = [{ name: "a", zIndex: 1 }, { name: "title", zIndex: 5, placeholder: { id: "title" } }, { name: "b", zIndex: 9 }];
  const merged = mergePage(f, JSON.parse(JSON.stringify(serializePage(edited))));
  assert.equal(merged.placeholders[0].fitMode, "fit");
  assert.deepEqual(merged.placeholders[0].offset, { x: 7, y: 8 });
  assert.deepEqual(merged.photoIds, ["front"]);
  assert.equal(merged.textLayers[0].content, "Villa");
  assert.deepEqual(merged.textLayers[0].pos, { x: 99, y: 98 });
  assert.equal(merged.textLayers[0].bounds.x, 1); // template data is kept
  assert.deepEqual(merged.layers.map((l) => l.name), ["b", "title", "a"]); // highest first
});

test("mergePage ignores zones and layers the template no longer has", () => {
  const f = fresh();
  const saved = {
    placeholders: [{ id: "gone", fitMode: "fit", offset: { x: 1, y: 1 }, hasPhoto: true }],
    textLayers: [{ id: "gone", content: "x" }],
    layers: [{ name: "gone", zIndex: 99 }],
  };
  const merged = mergePage(f, saved);
  assert.deepEqual(merged.placeholders, f.placeholders);
  assert.deepEqual(merged.photoIds, []);
  assert.equal(merged.textLayers[0].content, "VUE 3D");
  assert.deepEqual(merged.layers.map((l) => l.name), ["a", "title", "b"]);
});

test("mergePage with no saved page returns the fresh one", () => {
  const f = fresh();
  const merged = mergePage(f, null);
  assert.deepEqual(merged.photoIds, []);
  assert.equal(merged.placeholders.length, 2);
});
