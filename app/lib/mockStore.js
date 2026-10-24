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

import { getUser, updateUser } from "./mockAuth";
import { deleteDraft, listDrafts } from "./mockDrafts";

const KEYS = {
  users: "archpresent_users",
  ledger: "archpresent_ledger",
  purchases: "archpresent_purchases_v2",
  models: "archpresent_model_settings",
  customModels: "archpresent_custom_models",
  templates: "archpresent_template_status",
  bundles: "archpresent_bundles",
  receipts: "archpresent_receipts",
  audit: "archpresent_audit",
  jobs: "archpresent_jobs",
};

// How a top-up can be paid (Backend Model, PaymentMethod). "online" is added by the
// payment service later and is not offered here.
export const PAYMENT_METHODS = ["cash", "bank_transfer", "ccp", "baridimob_edahabia", "other"];
export const TIERS = ["student", "architect", "bureau"];

// Sample bundles. The rates are NOT decided (Plan Open 4); bigger bundles give
// more points per DA, as agreed. The admin can change them (Plan P-5.26); a bundle
// that carries a nameKey is shown in the reader's language until it is renamed.
const DEFAULT_BUNDLES = [
  { id: 1, nameKey: "bundle.1", priceDa: 2500, points: 1000, active: true },
  { id: 2, nameKey: "bundle.2", priceDa: 12000, points: 5500, active: true },
  { id: 3, nameKey: "bundle.3", priceDa: 50000, points: 24000, active: true },
];

const DEMO_USERS = [
  { id: "admin@archpresent.test", name: "Admin (demo)", email: "admin@archpresent.test", role: "admin", verified: true },
  { id: "buyer1@example.com", name: "Amina B. (demo)", email: "buyer1@example.com", role: "buyer", verified: true },
  { id: "buyer2@example.com", name: "Karim L. (demo)", email: "buyer2@example.com", role: "buyer", verified: true },
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
function requireAdmin(adminId) {
  const admin = getUsers().find((u) => u.id === adminId && !u.deletedAt);
  if (!admin || admin.role !== "admin") throw fail("Only an admin can do this.", "onlyAdmin");
  return admin;
}

// ── Audit log ────────────────────────────────────────────────────────────────
// What admins did apart from points (the ledger covers points): approvals,
// publishing, role changes. Append only, as in the SQL.

export function appendAudit(actorId, action, targetType, targetId, detail = "") {
  const all = read(KEYS.audit, []);
  const row = { id: (all.length ? all[all.length - 1].id : 0) + 1, actorId, action, targetType, targetId: String(targetId), detail, createdAt: new Date().toISOString() };
  write(KEYS.audit, [...all, row]);
  return row;
}
export function listAudit() {
  return read(KEYS.audit, []).slice().reverse();
}

// ── Users ────────────────────────────────────────────────────────────────────

export function getUsers() {
  if (!hasWindow()) return [];
  const stored = read(KEYS.users, null);
  const users = stored ? [...stored] : [];
  let changed = !stored;
  const current = getUser();
  for (const u of [...DEMO_USERS, ...(current ? [current] : [])]) {
    if (!users.some((x) => x.id === u.id)) { users.push({ verified: true, ...u }); changed = true; }
  }
  if (changed) seed(KEYS.users, users);
  return users;
}
// The accounts that still exist (a deleted account only keeps an emptied row).
export function listActiveUsers() {
  return getUsers().filter((u) => !u.deletedAt);
}
export function getUserRecord(id) {
  return getUsers().find((u) => u.id === id) || null;
}
function patchUser(id, patch) {
  write(KEYS.users, getUsers().map((u) => (u.id === id ? { ...u, ...patch } : u)));
}

export function isVerified(userId) {
  const u = getUserRecord(userId);
  return !!u && u.verified !== false;
}
// The buyer followed the confirmation link (placeholder: a button in the demo).
export function setVerified(userId) {
  patchUser(userId, { verified: true });
  if (getUser()?.id === userId) updateUser({ verified: true });
}

export function setUserRole(adminId, userId, role) {
  requireAdmin(adminId);
  if (role !== "buyer" && role !== "admin") throw fail("Unknown role.", "badRole");
  if (adminId === userId && role !== "admin") throw fail("You cannot remove your own admin role.", "selfRole");
  if (!getUserRecord(userId)) throw fail("Unknown user.", "unknownUser");
  patchUser(userId, { role });
  appendAudit(adminId, "role_changed", "user", userId, role);
}
export function setUserDisabled(adminId, userId, disabled) {
  requireAdmin(adminId);
  if (adminId === userId) throw fail("You cannot switch off your own account.", "selfDisable");
  if (!getUserRecord(userId)) throw fail("Unknown user.", "unknownUser");
  patchUser(userId, { disabled: !!disabled });
  appendAudit(adminId, disabled ? "user_disabled" : "user_enabled", "user", userId);
}

// The person deletes their own account (Plan P-5.1). Their drafts, photos,
// purchases and receipts go; the points history stays, without personal details.
// The mock gives the emptied account a new id and moves its ledger rows onto it, so
// the same email can sign up again (the real ids are random, so nothing moves).
export function deleteAccount(userId) {
  const user = getUserRecord(userId);
  if (!user || user.deletedAt) throw fail("Unknown user.", "unknownUser");
  if (user.role === "admin" && listActiveUsers().filter((u) => u.role === "admin").length <= 1) {
    throw fail("The last admin cannot delete their account.", "lastAdmin");
  }
  listDrafts(userId).forEach((d) => deleteDraft(d.id));
  const newId = `deleted:${getUsers().filter((u) => u.deletedAt).length + 1}`;
  write(KEYS.purchases, read(KEYS.purchases, []).filter((p) => p.userId !== userId));
  write(KEYS.receipts, read(KEYS.receipts, []).filter((r) => r.userId !== userId));
  write(KEYS.ledger, ledger().map((e) => (e.userId === userId ? { ...e, userId: newId } : e)));
  write(KEYS.users, getUsers().map((u) => (u.id === userId
    ? { id: newId, name: "", email: "", role: "buyer", verified: false, disabled: false, deletedAt: new Date().toISOString() }
    : u)));
}

// ── Points ledger ────────────────────────────────────────────────────────────

function seedLedger() {
  const seeded = [{
    id: 1, userId: "buyer1@example.com", kind: "topup", amount: 20000,
    reason: "Sample top-up (demo data)", reasonKey: "ledger.demoTopup", paymentMethod: "cash", paymentReference: "", bundleId: null, modelId: null,
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
// refund is a negative adjustment). Same checks as credit_points in the SQL: a
// top-up must say how it was paid.
export function creditPoints({ adminId, userId, kind, amount, reason, bundleId = null, paymentMethod = null, paymentReference = "" }) {
  const users = getUsers();
  const admin = users.find((u) => u.id === adminId);
  if (!admin || admin.role !== "admin") throw fail("Only an admin can change a points balance.", "onlyAdmin");
  if (kind !== "topup" && kind !== "adjustment") throw fail("Use topup or adjustment.", "badKind");
  if (!users.some((u) => u.id === userId && !u.deletedAt)) throw fail("Unknown user.", "unknownUser");
  if (!Number.isInteger(amount) || amount === 0) throw fail("Enter a whole number of points, not zero.", "badAmount");
  if (kind === "topup" && amount < 0) throw fail("A top-up must add points. Use an adjustment to remove them.", "topupNegative");
  if (kind === "topup" && !PAYMENT_METHODS.includes(paymentMethod)) throw fail("A top-up must record how it was paid.", "paymentRequired");
  if (!String(reason || "").trim()) throw fail("A reason is required.", "reasonRequired");
  const next = balanceOf(userId) + amount;
  if (next < 0) throw fail(`This change would make the balance negative (${next}).`, "negativeBalance", { balance: next });
  const row = appendLedger({
    userId, kind, amount, reason: String(reason).trim(), bundleId, createdBy: adminId,
    paymentMethod: kind === "topup" ? paymentMethod : null,
    paymentReference: kind === "topup" ? String(paymentReference || "").trim() : "",
  });
  if (kind === "topup") addReceipt(userId, "topup", row.id);
  return row;
}

// ── Top-up bundles (Plan P-5.26: set by Said) ────────────────────────────────

export function getBundles({ all = false } = {}) {
  const stored = read(KEYS.bundles, null) || (hasWindow() ? (seed(KEYS.bundles, DEFAULT_BUNDLES), DEFAULT_BUNDLES) : DEFAULT_BUNDLES);
  return all ? stored : stored.filter((b) => b.active);
}
export const bundleName = (b, t) => (b.nameKey ? t(b.nameKey) : b.name);

// Create or change a bundle. A bundle is never deleted, because ledger rows point
// at it; it is switched off instead.
export function saveBundle(adminId, bundle) {
  requireAdmin(adminId);
  const priceDa = Number(bundle.priceDa);
  const points = Number(bundle.points);
  const named = bundle.nameKey || String(bundle.name || "").trim();
  if (!named || !(priceDa > 0) || !Number.isInteger(points) || points <= 0) throw fail("Enter a name, a price above zero and a whole number of points.", "badBundle");
  const all = getBundles({ all: true });
  const row = {
    id: bundle.id || Math.max(0, ...all.map((b) => b.id)) + 1,
    ...(bundle.nameKey ? { nameKey: bundle.nameKey } : { name: String(bundle.name).trim() }),
    priceDa: Math.round(priceDa * 100) / 100, points, active: bundle.active !== false,
  };
  write(KEYS.bundles, bundle.id ? all.map((b) => (b.id === bundle.id ? row : b)) : [...all, row]);
  appendAudit(adminId, bundle.id ? "bundle_changed" : "bundle_created", "bundle", row.id, `${row.priceDa} DA / ${row.points} pts${row.active ? "" : " (off)"}`);
  return row;
}

// ── Email receipts (a record of each email, so a missing one can be sent again) ──
// The mock sends nothing. Backend Model class EmailReceipt.

function addReceipt(userId, kind, ledgerId) {
  const all = read(KEYS.receipts, []);
  const row = { id: (all.length ? all[all.length - 1].id : 0) + 1, userId, kind, ledgerId, status: "sent", sentAt: new Date().toISOString(), resends: 0 };
  write(KEYS.receipts, [...all, row]);
  return row;
}
export function listReceipts() {
  return read(KEYS.receipts, []).slice().reverse();
}
export function resendReceipt(adminId, receiptId) {
  requireAdmin(adminId);
  write(KEYS.receipts, read(KEYS.receipts, []).map((r) => (r.id === receiptId ? { ...r, status: "sent", sentAt: new Date().toISOString(), resends: r.resends + 1 } : r)));
  appendAudit(adminId, "receipt_resent", "receipt", receiptId);
}

// ── Purchases ────────────────────────────────────────────────────────────────

export function listPurchases(userId) {
  return read(KEYS.purchases, []).filter((p) => p.userId === userId).slice().reverse();
}
export function listAllPurchases() {
  return read(KEYS.purchases, []).slice().reverse();
}
export function getPurchase(userId, modelId) {
  if (!userId) return null;
  return read(KEYS.purchases, []).find((p) => p.userId === userId && p.modelId === modelId) || null;
}
export function hasPurchased(userId, modelId) {
  return !!getPurchase(userId, modelId);
}

// The buyer presses Buy. Checks the email is confirmed and the balance, and writes
// the ledger row and the purchase together (spend_points in the SQL). Buying twice
// charges once.
export function spendPoints(userId, model) {
  const existing = getPurchase(userId, model.id);
  if (existing) return existing;
  if (!getUsers().some((u) => u.id === userId && !u.deletedAt)) throw fail("Unknown user.", "unknownUser");
  if (!isVerified(userId)) throw fail("Confirm your email address before buying.", "unverified");
  const price = model.pricePoints;
  const balance = balanceOf(userId);
  if (balance < price) throw fail(`Not enough points: ${price} needed, ${balance} available.`, "insufficient", { price, balance });
  const entry = appendLedger({ userId, kind: "purchase", amount: -price, reason: `Bought model ${model.name}`, reasonKey: "ledger.bought", reasonParams: { model: model.name }, modelId: model.id, createdBy: userId });
  const purchase = {
    id: `P-${entry.id}`, userId, modelId: model.id, modelName: model.name, pointsSpent: price,
    ledgerId: entry.id, createdAt: entry.createdAt,
  };
  write(KEYS.purchases, [...read(KEYS.purchases, []), purchase]);
  addReceipt(userId, "purchase", entry.id);
  return purchase;
}

// ── Template review (Plan P-5.13) ────────────────────────────────────────────
// A template reaches buyers only when it is published. Templates on disk start as
// published; an admin can send one back to review or reject it.

export const TEMPLATE_STATUSES = ["in_review", "published", "rejected"];
export function getTemplateStates() {
  return read(KEYS.templates, {});
}
export function getTemplateStatus(templateId) {
  return getTemplateStates()[templateId]?.status || "published";
}
export function setTemplateStatus(adminId, templateId, status) {
  requireAdmin(adminId);
  if (!TEMPLATE_STATUSES.includes(status)) throw fail("Unknown status.", "badStatus");
  const all = getTemplateStates();
  write(KEYS.templates, { ...all, [templateId]: { ...(all[templateId] || {}), status } });
  appendAudit(adminId, status === "published" ? "template_approved" : status === "rejected" ? "template_rejected" : "template_sent_to_review", "template", templateId);
}

// ── Models: the files, the admin's settings, and models the admin creates ────

export function getModelOverrides() {
  return read(KEYS.models, {});
}
function setModelOverride(modelId, patch) {
  const all = getModelOverrides();
  write(KEYS.models, { ...all, [modelId]: { ...(all[modelId] || {}), ...patch } });
}
export function getCustomModels() {
  return read(KEYS.customModels, []);
}
export function getCustomModel(id) {
  return getCustomModels().find((m) => m.id === id) || null;
}
const pagesPublished = (m) => (m.pages || []).length > 0 && m.pages.every((p) => getTemplateStatus(p.template) === "published");

// A model as the buyers see it: the file's own values, then the admin's changes.
// `publishedSetting` is the switch the admin set; `published` is what buyers get,
// which also needs every page's template to be published (Plan P-5.14).
export function effectiveModel(model) {
  const m = { ...model, ...(getModelOverrides()[model.id] || {}) };
  const ready = pagesPublished(m);
  return { ...m, pagesReady: ready, publishedSetting: !!m.published, published: !!m.published && ready };
}
// Every model: the files first, then the ones created in the admin.
export function allModels(fileModels) {
  return [...fileModels, ...getCustomModels()].map(effectiveModel);
}

// Admin changes to a model's tier, price, name, pages or visibility. File models
// are changed through overrides; models created here are changed in place.
export function adminSetModel(adminId, model, patch) {
  requireAdmin(adminId);
  const next = { ...model, ...patch };
  if (Object.prototype.hasOwnProperty.call(patch, "name") && !String(patch.name).trim()) throw fail("A model needs a name.", "badModel");
  if (patch.pages && (!patch.pages.length || patch.pages.some((p) => !String(p.name || "").trim() || !p.template))) throw fail("Every page needs a name and a template.", "badModel");
  if (patch.published && !pagesPublished(next)) throw fail("A model can be published only when every page's template is published.", "pagesNotPublished");
  const clean = {};
  for (const k of ["name", "tier", "pricePoints", "published", "pages"]) if (Object.prototype.hasOwnProperty.call(patch, k)) clean[k] = patch[k];
  if (getCustomModel(model.id)) write(KEYS.customModels, getCustomModels().map((m) => (m.id === model.id ? { ...m, ...clean } : m)));
  else setModelOverride(model.id, clean);
  appendAudit(adminId, "model_changed", "model", model.id, Object.keys(clean).join(", "));
}

export function createModel(adminId, { name, tier = "architect", pricePoints = 1000, pages, published = false, fastPath = false }) {
  requireAdmin(adminId);
  if (!String(name || "").trim() || !pages?.length || pages.some((p) => !String(p.name || "").trim() || !p.template)) throw fail("A model needs a name and pages with a template each.", "badModel");
  if (!TIERS.includes(tier) || !Number.isInteger(pricePoints) || pricePoints < 0) throw fail("Choose a tier and a price in points.", "badModel");
  const model = { id: `custom-${Date.now().toString(36)}`, name: String(name).trim(), tier, pricePoints, published: false, pages: pages.map((p) => ({ name: String(p.name).trim(), template: p.template })), createdAt: new Date().toISOString(), ...(fastPath ? { fastPath: true } : {}) };
  if (published && !pagesPublished(model)) throw fail("A model can be published only when every page's template is published.", "pagesNotPublished");
  write(KEYS.customModels, [...getCustomModels(), { ...model, published }]);
  appendAudit(adminId, fastPath ? "model_fast_path" : "model_created", "model", model.id, model.name);
  return { ...model, published };
}
export function deleteCustomModel(adminId, modelId) {
  requireAdmin(adminId);
  if (!getCustomModel(modelId)) throw fail("Only models created here can be deleted.", "badModel");
  write(KEYS.customModels, getCustomModels().filter((m) => m.id !== modelId));
  appendAudit(adminId, "model_deleted", "model", modelId);
}

// Fast path (Plan P-5.24): converter output Khairou converted himself becomes a
// published model at once, with no queue wait and no review.
export function fastPathPublish(adminId, { name, template, tier, pricePoints }) {
  requireAdmin(adminId);
  if (!template) throw fail("Choose the template folder.", "badModel");
  const all = getTemplateStates();
  write(KEYS.templates, { ...all, [template]: { ...(all[template] || {}), status: "published", fastPath: true } });
  return createModel(adminId, { name, tier, pricePoints, pages: [{ name: "Page 1", template }], published: true, fastPath: true });
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
// A failed job keeps the validator's report (placeholder text in the demo: the real
// converter lists the layer names that broke the naming rule, scripts/validate_names.py).
export function setJobStatus(id, status) {
  write(KEYS.jobs, listJobs().map((j) => (j.id === id ? { ...j, status, errorKey: status === "failed" ? "adminQ.validatorSample" : undefined } : j)));
}
