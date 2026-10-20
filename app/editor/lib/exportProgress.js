// Progress and expected time of an export (Plan P-5.10: a paid export should
// finish in at most 1 minute; task T-025). The browser export has three stages:
// loading the full-size images, rendering the page at full resolution, and
// encoding the file. Loading is counted image by image; rendering and encoding
// block the page and cannot report progress inside, so they count as one step
// each. Pure functions, tested in exportProgress.test.mjs.

// Where each stage sits on the bar (0 to 1).
export const STAGES = { loading: [0, 0.6], rendering: [0.6, 0.85], encoding: [0.85, 1], done: [1, 1] };

export function fractionOf(stage, done = 0, total = 0) {
  const [from, to] = STAGES[stage] || STAGES.loading;
  if (stage === "loading" && total > 0) return from + (to - from) * Math.min(done / total, 1);
  return from;
}

// The speed assumed before any export has run on this browser. A placeholder: it
// was about 100 ms per megapixel on the development machine, and slower machines
// and connections correct it after the first export.
export const DEFAULT_MS_PER_MP = 150;

// Seconds left, or null while there is nothing to go on yet. Given the expected
// total (expectedMs) it takes the smaller of what the stage reached suggests and
// what the clock suggests, so the number keeps falling while rendering blocks the
// bar. Without an expected total it extrapolates from the work done so far.
export function remainingSeconds({ elapsedMs, fraction, expectedMs }) {
  if (fraction >= 1) return 0;
  if (expectedMs) {
    const byStage = expectedMs * (1 - fraction);
    const byClock = expectedMs - elapsedMs;
    return Math.max(1, Math.round(Math.min(byStage, byClock) / 1000));
  }
  if (fraction >= 0.1 && elapsedMs > 0) return Math.max(1, Math.round((elapsedMs * (1 - fraction)) / fraction / 1000));
  return null;
}

// The speed of past exports, as milliseconds per megapixel of the page, so the
// next export on a page of another size can be estimated. Averaged with the last
// one so a single slow run does not dominate.
export function rememberSpeed(previousMsPerMp, ms, megapixels) {
  if (!(ms > 0) || !(megapixels > 0)) return previousMsPerMp || null;
  const sample = ms / megapixels;
  return Math.round(previousMsPerMp ? (previousMsPerMp + sample) / 2 : sample);
}

export function expectedTotalMs(msPerMp, megapixels) {
  return msPerMp && megapixels ? Math.round(msPerMp * megapixels) : null;
}

const KEY = "archpresent_export_speed_v1";

export function loadSpeed() {
  try {
    const v = Number(localStorage.getItem(KEY));
    return v > 0 ? v : null;
  } catch {
    return null;
  }
}

export function saveSpeed(msPerMp) {
  try {
    if (msPerMp) localStorage.setItem(KEY, String(msPerMp));
  } catch {
    // no storage: the estimate just starts from nothing next time
  }
}
