"use client";

// Placeholder client-side "auth" so the login/signup/dashboard UI has
// something real to demonstrate against — a name/email typed into a form
// gets stored in localStorage and read back on the dashboard.
//
// This is NOT real authentication: no server verification, no password
// checking or hashing, no sessions, nothing that couldn't be bypassed by
// opening devtools. It exists purely so the UI flow (sign up → dashboard
// → sign out → redirected to login) is demonstrable before the real auth
// architecture (from the planned architecture doc) replaces it wholesale.
//
// Demo only: an email that starts with "admin" signs in as an admin, which
// shows the admin pages. Real roles come from the backend (task T-010).
//
// The accounts themselves (role, confirmed email, disabled, deleted) live in
// lib/mockStore.js under the same key; this file reads them so an admin's
// change to a role or a disabled account takes effect for the person signed in.

const KEY = "archpresent_mock_user";
const USERS_KEY = "archpresent_users";

function knownUser(id) {
  try {
    const list = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
    return list.find((u) => u.id === id) || null;
  } catch {
    return null;
  }
}

export function getUser() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const u = JSON.parse(raw);
    const email = String(u.email || "").toLowerCase();
    const id = u.id || email;
    const known = knownUser(id);
    if (known && (known.disabled || known.deletedAt)) return null; // a disabled or deleted account is signed out
    return {
      id, name: known?.name ?? u.name, email,
      role: known?.role ?? u.role ?? "buyer",
      verified: known ? known.verified !== false : u.verified !== false,
    };
  } catch {
    return null;
  }
}

// Returns { ok: true }, or { error: "disabled" } for an account an admin switched off.
// A brand new account starts unconfirmed when `verified` is false (sign up).
export function mockSignIn(name, email, { verified = true } = {}) {
  const clean = String(email || "").trim().toLowerCase();
  const known = knownUser(clean);
  if (known?.disabled) return { error: "disabled" };
  const role = known ? known.role : clean.startsWith("admin") ? "admin" : "buyer";
  const confirmed = known ? known.verified !== false : verified;
  localStorage.setItem(KEY, JSON.stringify({ id: clean, name: known?.name || name, email: clean, role, verified: confirmed }));
  return { ok: true };
}

export function mockSignOut() {
  localStorage.removeItem(KEY);
}

// Changes the signed-in user's own record (name, confirmed email).
export function updateUser(patch) {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    localStorage.setItem(KEY, JSON.stringify({ ...JSON.parse(raw), ...patch }));
  } catch {
    // nothing to update
  }
}
