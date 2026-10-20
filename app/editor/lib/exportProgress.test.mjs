import test from "node:test";
import assert from "node:assert/strict";
import { fractionOf, remainingSeconds, rememberSpeed, expectedTotalMs } from "./exportProgress.js";

test("loading moves the bar image by image, up to 60%", () => {
  assert.equal(fractionOf("loading", 0, 10), 0);
  assert.equal(fractionOf("loading", 5, 10), 0.3);
  assert.equal(fractionOf("loading", 10, 10), 0.6);
  assert.equal(fractionOf("loading", 99, 10), 0.6); // never past its stage
});

test("rendering, encoding and done sit at the start of their stage", () => {
  assert.equal(fractionOf("rendering"), 0.6);
  assert.equal(fractionOf("encoding"), 0.85);
  assert.equal(fractionOf("done"), 1);
});

test("stages only move forward", () => {
  const order = [fractionOf("loading", 10, 10), fractionOf("rendering"), fractionOf("encoding"), fractionOf("done")];
  assert.deepEqual([...order].sort((a, b) => a - b), order);
});

test("remaining time counts down from the expected total", () => {
  assert.equal(remainingSeconds({ elapsedMs: 0, fraction: 0, expectedMs: 20000 }), 20);
  assert.equal(remainingSeconds({ elapsedMs: 5000, fraction: 0.5, expectedMs: 20000 }), 10);
  assert.equal(remainingSeconds({ elapsedMs: 1000, fraction: 0.99, expectedMs: 20000 }), 1);
});

test("it keeps falling while a blocking stage holds the bar still", () => {
  // the bar is stuck at 60% (rendering), 16 s of an expected 20 s have passed
  assert.equal(remainingSeconds({ elapsedMs: 16000, fraction: 0.6, expectedMs: 20000 }), 4);
  // past the expected total it never shows 0 or a negative number before done
  assert.equal(remainingSeconds({ elapsedMs: 30000, fraction: 0.6, expectedMs: 20000 }), 1);
});

test("without an expected total it waits, then extrapolates", () => {
  assert.equal(remainingSeconds({ elapsedMs: 500, fraction: 0.05, expectedMs: null }), null);
  assert.equal(remainingSeconds({ elapsedMs: 6000, fraction: 0.3, expectedMs: null }), 14); // 6 s for 30% -> 14 s left
});

test("nothing is left when the work is done", () => {
  assert.equal(remainingSeconds({ elapsedMs: 9000, fraction: 1, expectedMs: 20000 }), 0);
});

test("the speed is remembered per megapixel and averaged", () => {
  assert.equal(rememberSpeed(null, 10000, 50), 200);   // 10 s for 50 MP
  assert.equal(rememberSpeed(200, 20000, 50), 300);    // averaged with 400
  assert.equal(rememberSpeed(200, 0, 50), 200);        // a bad sample is ignored
  assert.equal(expectedTotalMs(200, 70), 14000);       // a 70 MP page
  assert.equal(expectedTotalMs(null, 70), null);
});
