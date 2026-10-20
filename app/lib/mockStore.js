"use client";

// Placeholder data layer for the platform pages, kept in localStorage so the
// screens have something real to work against. It follows the draft backend
// model (docs/backend-model.json) and the rules of web/db/schema.sql, so
// replacing it with the real backend (tasks T-007, T-008, T-026) means
// re-implementing these functions against an API, not rewriting the pages.
//
// Same rules as the SQL: the points ledger is append only, a balance is the sum
// of a user's entries and is never stored, only an admin can add points or make
// an adjustment, a balance cannot go below zero, and buying a model twice
// charges once. None of this is secure: it all runs in the browser.

import { getUser } from "./mockAuth";

const KEYS = {
  users: "archpresent_users",
  ledger: "archpresent_ledger",
  purchases: "archpresent_purchases_v2",
  models: "archpresent_model_settings",
  jobs: "archpresent_jobs",
};

// Sample bundles. The rates are NOT decided (Plan Open 4); bigger bundles give
// more points per DA, as agreed.
export const BUNDLES = [
  { id: 1, name: "One tier 1 template", priceDa: 2500, points: 1000 },
  { id: 2, name: "Five models", priceDa: 12000, points: 5500 },
  { id: 3, name: "Twenty tier 3 models", priceDa: 50000, points: 24000 },
];

const DEMO_USERS = [
  { id: "admin@archpresent.test", name: "Admin (demo)", email: "admin@archpresent.test", role: "admin" },
  { id: "buyer1@example.com", name: "Amina B. (demo)", email: "buyer1@example.com", role: "buyer" },
  { id: "buyer2@example.com", name: "Karim L. (demo)", email: "buyer2@example.com", role: "buyer" },
];

const hasWindow = () => typeof window !== "undefined";

function read(key, fallback) {
  if (!hasWindow()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event("archpresent:store"));
}
// First-use demo data is written without the change event: it happens while a
// page is rendering, and an event then would update other components mid-render.
function seed(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
// Errors carry a code (and parameters) so the pages can show them in the
// current language; the English message is only for logs.
function fail(message, code, params) {
  const e = new Error(message);
  if (code) e.code = code;
  if (params) e.params = params;
  return e;
}

// ── Users ────────────────────────────────────────────────────────────────────

export function getUsers() {
  if (!hasWindow()) return [];
  const stored = read(KEYS.users, null);
  const users = stored ? [...stored] : [];
  let changed = !stored;
  const current = getUser();
  for (const u of [...DEMO_USERS, ...(current ? [current] : [])]) {
    if (!users.some((x) => x.id === u.id)) { users.push(u); changed = true; }
  }
  if (changed) seed(KEYS.users, users);
  return users;
}

// ── Points ledger ────────────────────────────────────────────────────────────

function seedLedger() {
  const seeded = [{
    id: 1, userId: "buyer1@example.com", kind: "topup", amount: 20000,
    reason: "Sample top-up (demo data)", reasonKey: "ledger.demoTopup", bundleId: null, modelId: null,
    createdBy: "admin@archpresent.test", createdAt: new Date().toISOString(),
  }];
  seed(KEYS.ledger, seeded);
  return seeded;
}
function ledger() {
  return read(KEYS.ledger, null) || (hasWindow() ? seedLedger() : []);
}

export function listLedger(userId) {
  const all = ledger();
  return (userId ? all.filter((e) => e.userId === userId) : all).slice().reverse();
}

export function balanceOf(userId) {
  return ledger().filter((e) => e.userId === userId).reduce((s, e) => s + e.amount, 0);
}

function appendLedger(entry) {
  const all = ledger();
  const row = { id: (all.length ? all[all.length - 1].id : 0) + 1, createdAt: new Date().toISOString(), bundleId: null, modelId: null, ...entry };
  write(KEYS.ledger, [...all, row]);
  return row;
}

// Admin adds points after an off-platform payment, or adjusts a balance (a
// refund is a negative adjustment). Same checks as credit_points in the SQL.
export function creditPoints({ adminId, userId, kind, amount, reason, bundleId = null }) {
  const users = getUsers();
  const admin = users.find((u) => u.id === adminId);
  if (!admin || admin.role !== "admin") throw fail("Only an admin can change a points balance.", "onlyAdmin");
  if (kind !== "topup" && kind !== "adjustment") throw fail("Use topup or adjustment.", "badKind");
  if (!users.some((u) => u.id === userId)) throw fail("Unknown user.", "unknownUser");
  if (!Number.isInteger(amount) || amount === 0) throw fail("Enter a whole number of points, not zero.", "badAmount");
  if (kind === "topup" && amount < 0) throw fail("A top-up must add points. Use an adjustment to remove them.", "topupNegative");
  if (!String(reason || "").trim()) throw fail("A reason is required.", "reasonRequired");
  const next = balanceOf(userId) + amount;
  if (next < 0) throw fail(`This change would make the balance negative (${next}).`, "negativeBalance", { balance: next });
  return appendLedger({ userId, kind, amount, reason: String(reason).trim(), bundleId, createdBy: adminId });
}

// ── Purchases ────────────────────────────────────────────────────────────────

export function listPurchases(userId) {
  return read(KEYS.purchases, []).filter((p) => p.userId === userId).slice().reverse();
}
export function getPurchase(userId, modelId) {
  if (!userId) return null;
  return read(KEYS.purchases, []).find((p) => p.userId === userId && p.modelId === modelId) || null;
}
export function hasPurchased(userId, modelId) {
  return !!getPurchase(userId, modelId);
}

// The buyer presses Buy. Checks the balance and writes the ledger row and the
// purchase together (spend_points in the SQL). Buying twice charges once.
export function spendPoints(userId, model) {
  const existing = getPurchase(userId, model.id);
  if (existing) return existing;
  if (!getUsers().some((u) => u.id === userId)) throw fail("Unknown user.", "unknownUser");
  const price = model.pricePoints;
  const balance = balanceOf(userId);
  if (balance < price) throw fail(`Not enough points: ${price} needed, ${balance} available.`, "insufficient", { price, balance });
  const entry = appendLedger({ userId, kind: "purchase", amount: -price, reason: `Bought model ${model.name}`, reasonKey: "ledger.bought", reasonParams: { model: model.name }, modelId: model.id, createdBy: userId });
  const purchase = {
    id: `P-${entry.id}`, userId, modelId: model.id, modelName: model.name, pointsSpent: price,
    ledgerId: entry.id, createdAt: entry.createdAt,
  };
  write(KEYS.purchases, [...read(KEYS.purchases, []), purchase]);
  return purchase;
}

// ── Model settings (what the admin sets) ─────────────────────────────────────

export function getModelOverrides() {
  return read(KEYS.models, {});
}
export function setModelOverride(modelId, patch) {
  const all = getModelOverrides();
  write(KEYS.models, { ...all, [modelId]: { ...(all[modelId] || {}), ...patch } });
}
// A model as the buyers see it: the file's own values, then the admin's changes.
export function effectiveModel(model) {
  return { ...model, ...(getModelOverrides()[model.id] || {}) };
}

// ── Conversion queue (admin) ─────────────────────────────────────────────────

function seedJobs() {
  const now = Date.now();
  const jobs = [
    { id: "J-1", source: "13.psd", requestedBy: "admin@archpresent.test", status: "running", estimatedSeconds: 900, queuedAt: new Date(now - 6 * 60000).toISOString() },
    { id: "J-2", source: "12.psd", requestedBy: "admin@archpresent.test", status: "queued", estimatedSeconds: 900, queuedAt: new Date(now - 4 * 60000).toISOString() },
    { id: "J-3", source: "10.psd", requestedBy: "admin@archpresent.test", status: "queued", estimatedSeconds: 900, queuedAt: new Date(now - 2 * 60000).toISOString() },
  ];
  seed(KEYS.jobs, jobs);
  return jobs;
}
export function listJobs() {
  return read(KEYS.jobs, null) || (hasWindow() ? seedJobs() : []);
}
// Seconds until a job queued now would finish: all work queued or running, plus its own.
export function expectedSecondsForNewJob(own = 900) {
  return listJobs().filter((j) => j.status === "queued" || j.status === "running").reduce((s, j) => s + j.estimatedSeconds, 0) + own;
}
export function addJob(source, requestedBy) {
  const jobs = listJobs();
  const job = { id: `J-${jobs.length + 1}`, source, requestedBy, status: "queued", estimatedSeconds: 900, queuedAt: new Date().toISOString() };
  write(KEYS.jobs, [...jobs, job]);
  return job;
}
export function setJobStatus(id, status) {
  write(KEYS.jobs, listJobs().map((j) => (j.id === id ? { ...j, status } : j)));
}
