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

const KEY = "archpresent_mock_user";

export function getUser() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function mockSignIn(name, email) {
  localStorage.setItem(KEY, JSON.stringify({ name, email }));
}

export function mockSignOut() {
  localStorage.removeItem(KEY);
}
