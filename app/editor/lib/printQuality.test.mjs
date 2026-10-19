// Run with:  node --test app/editor/lib/printQuality.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { photoScale, effectiveDpi, assessPhoto, minPixelsFor, DPI_GOOD, DPI_LOW } from "./printQuality.js";

test("a photo with the same pixels as the zone prints at the canvas resolution", () => {
  assert.equal(effectiveDpi({ imageWidth: 3000, imageHeight: 2000, zoneWidth: 3000, zoneHeight: 2000 }), 300);
});

test("a photo with half the pixels prints at half the resolution", () => {
  assert.equal(effectiveDpi({ imageWidth: 1500, imageHeight: 1000, zoneWidth: 3000, zoneHeight: 2000 }), 150);
});

test("fill covers the zone, so a tall photo in a wide zone is limited by its width", () => {
  const scale = photoScale({ imageWidth: 1000, imageHeight: 3000, zoneWidth: 3000, zoneHeight: 2000, fitMode: "fill" });
  assert.equal(scale, 3);
});

test("fit keeps the whole photo inside, so a tall photo is limited by its height", () => {
  const scale = photoScale({ imageWidth: 1000, imageHeight: 3000, zoneWidth: 3000, zoneHeight: 2000, fitMode: "fit" });
  assert.ok(Math.abs(scale - 2 / 3) < 1e-9);
});

test("printing larger than the canvas lowers the resolution", () => {
  const a1 = effectiveDpi({ imageWidth: 3000, imageHeight: 2000, zoneWidth: 3000, zoneHeight: 2000 });
  const a0 = effectiveDpi({ imageWidth: 3000, imageHeight: 2000, zoneWidth: 3000, zoneHeight: 2000, printScale: Math.SQRT2 });
  assert.ok(Math.abs(a0 - a1 / Math.SQRT2) < 1e-9);
});

test("levels follow the thresholds", () => {
  const at = (dpi) => assessPhoto({ imageWidth: dpi, imageHeight: dpi, zoneWidth: 300, zoneHeight: 300 });
  assert.equal(at(DPI_GOOD).level, "good");
  assert.equal(at(DPI_GOOD - 1).level, "low");
  assert.equal(at(DPI_LOW).level, "low");
  assert.equal(at(DPI_LOW - 1).level, "poor");
});

test("empty or zero sizes give no answer instead of a wrong one", () => {
  assert.equal(assessPhoto({ imageWidth: 0, imageHeight: 100, zoneWidth: 300, zoneHeight: 300 }), null);
  assert.equal(effectiveDpi({ imageWidth: 100, imageHeight: 100, zoneWidth: 0, zoneHeight: 300 }), null);
});

test("minPixelsFor returns a size that actually reaches the target", () => {
  const zone = { zoneWidth: 3000, zoneHeight: 2000, fitMode: "fill", imageWidth: 600, imageHeight: 400 };
  const need = minPixelsFor(zone);
  const dpi = effectiveDpi({ ...zone, imageWidth: need.width, imageHeight: need.height });
  assert.ok(dpi >= DPI_GOOD - 0.5, `got ${dpi}`);
});

test("real zones of the converted template", () => {
  const t = JSON.parse(fs.readFileSync(new URL("../../../public/templates/template/template.json", import.meta.url), "utf8"));
  const zones = t.placeholders.filter((p) => p.type !== "TEXT");
  assert.ok(zones.length > 0);
  for (const z of zones) {
    // a 12 megapixel photo, 4000 x 3000
    const r = assessPhoto({ imageWidth: 4000, imageHeight: 3000, zoneWidth: z.bounds.width, zoneHeight: z.bounds.height, fitMode: "fill" });
    console.log(`  ${z.id}: zone ${z.bounds.width} x ${z.bounds.height} px -> 4000 x 3000 photo prints at ${r.dpi} dpi (${r.level})`);
    assert.ok(r.dpi > 0);
  }
});
