// Checks that French, Arabic and English have the same keys, that text with
// {placeholders} keeps them in every language, and that the translate and format
// helpers behave: plural forms, and prices in DA always with .00.
import test from "node:test";
import assert from "node:assert/strict";
import en from "./messages/en.js";
import fr from "./messages/fr.js";
import ar from "./messages/ar.js";
import { makeT, makeFmt } from "./translate.js";

const PLURAL = /\.(zero|one|two|few|many|other)$/;
const base = (k) => k.replace(PLURAL, "");
const baseKeys = (m) => new Set(Object.keys(m).map(base));
const params = (s) => new Set([...String(s).matchAll(/\{(\w+)\}/g)].map((x) => x[1]));

test("every language has the same keys", () => {
  const ref = baseKeys(en);
  for (const [name, m] of [["fr", fr], ["ar", ar]]) {
    const have = baseKeys(m);
    const missing = [...ref].filter((k) => !have.has(k));
    const extra = [...have].filter((k) => !ref.has(k));
    assert.deepEqual(missing, [], `${name} is missing keys`);
    assert.deepEqual(extra, [], `${name} has keys English does not`);
  }
});

test("plain messages keep their {placeholders}", () => {
  for (const [key, text] of Object.entries(en)) {
    if (PLURAL.test(key)) continue;
    for (const [name, m] of [["fr", fr], ["ar", ar]]) {
      assert.deepEqual([...params(m[key])].sort(), [...params(text)].sort(), `${name} "${key}"`);
    }
  }
});

test("no message is empty", () => {
  for (const [name, m] of [["en", en], ["fr", fr], ["ar", ar]]) {
    for (const [k, v] of Object.entries(m)) {
      if (k === "buy.unseen.zero") continue; // never shown: the Buy button needs every page seen
      assert.ok(String(v).trim().length > 0, `${name} "${k}" is empty`);
    }
  }
});

test("plurals: English and French have one and other, Arabic has the full set", () => {
  const tEn = makeT("en", en), tFr = makeT("fr", fr), tAr = makeT("ar", ar);
  assert.equal(tEn("models.pages", { count: 1 }), "1 page");
  assert.equal(tEn("models.pages", { count: 3 }), "3 pages");
  assert.equal(tFr("models.pages", { count: 0 }), "0 page");
  assert.equal(tAr("models.pages", { count: 1 }), "صفحة واحدة");
  assert.equal(tAr("models.pages", { count: 2 }), "صفحتان");
  assert.equal(tAr("models.pages", { count: 3 }), "3 صفحات");
  assert.equal(tAr("models.pages", { count: 11 }), "11 صفحة");
});

test("a missing key shows the key", () => {
  assert.equal(makeT("en", en)("no.such.key"), "no.such.key");
});

test("prices in DA always have .00, in every language", () => {
  for (const [lang, m] of [["fr", fr], ["ar", ar], ["en", en]]) {
    const fmt = makeFmt(lang, makeT(lang, m));
    assert.equal(fmt.da(12000), "12000.00 DA");
    assert.equal(fmt.da(2500), "2500.00 DA");
    assert.equal(fmt.da(99.5), "99.50 DA");
  }
});

test("numbers use Western digits in Arabic too", () => {
  const fmt = makeFmt("ar", makeT("ar", ar));
  assert.match(fmt.number(20000), /^[0-9  ,.\s]+$/);
  assert.match(fmt.points(20000), /^20.?000/);
});
