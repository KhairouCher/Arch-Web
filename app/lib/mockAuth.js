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

const KEY = "archpresent_mock_user";

export function getUser() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const u = JSON.parse(raw);
    const email = String(u.email || "").toLowerCase();
    return { id: u.id || email, name: u.name, email, role: u.role || "buyer" };
  } catch {
    return null;
  }
}

export function mockSignIn(name, email) {
  const clean = String(email || "").trim().toLowerCase();
  const role = clean.startsWith("admin") ? "admin" : "buyer";
  localStorage.setItem(KEY, JSON.stringify({ id: clean, name, email: clean, role }));
}

export function mockSignOut() {
  localStorage.removeItem(KEY);
}
