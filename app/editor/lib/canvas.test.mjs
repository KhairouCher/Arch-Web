// Run with:  node --test app/editor/lib/canvas.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { textDirection } from "./canvas.js";

test("Latin text is left to right", () => {
  assert.equal(textDirection("VUE 3D"), "ltr");
  assert.equal(textDirection("projet : étude et suivi"), "ltr");
});

test("Arabic text is right to left", () => {
  assert.equal(textDirection("مرحبا بكم"), "rtl");
  assert.equal(textDirection("الخطة"), "rtl");
});

test("the first strong letter decides, so leading digits and punctuation are skipped", () => {
  assert.equal(textDirection("2026 مشروع"), "rtl");
  assert.equal(textDirection("(12) villa"), "ltr");
  assert.equal(textDirection("«مشروع» ArchPresent"), "rtl");
});

test("text with no letters, or empty text, defaults to left to right", () => {
  assert.equal(textDirection("12345 - ."), "ltr");
  assert.equal(textDirection(""), "ltr");
  assert.equal(textDirection(undefined), "ltr");
});
