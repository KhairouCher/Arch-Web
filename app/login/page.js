"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { mockSignIn } from "../lib/mockAuth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) {
      setError("Enter an email and password.");
      return;
    }
    // No real auth yet — see app/lib/mockAuth.js.
    mockSignIn(email.split("@")[0], email);
    router.push("/dashboard");
  }

  return (
    <div style={S.page}>
      <Link href="/" style={S.logo}>ArchPresent</Link>

      <div style={S.card}>
        <h1 style={S.h1}>Sign in</h1>
        <p style={S.sub}>Welcome back.</p>

        <form onSubmit={handleSubmit}>
          <label style={S.label}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={S.input}
            placeholder="you@example.com"
          />

          <label style={S.label}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={S.input}
            placeholder="••••••••"
          />

          {error && <p style={S.error}>{error}</p>}

          <button type="submit" style={S.submitBtn}>Sign In</button>
        </form>

        <p style={S.switchText}>
          Don&apos;t have an account? <Link href="/signup" style={S.switchLink}>Sign up</Link>
        </p>
      </div>
    </div>
  );
}

const S = {
  page: {
    minHeight: "100vh", background: "#0a0a0a", color: "#e5e5e5",
    fontFamily: "var(--font-geist-sans), system-ui, -apple-system, sans-serif",
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", gap: 32, padding: 24,
  },
  logo: { fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: "0.02em" },
  card: {
    width: "100%", maxWidth: 380, background: "#111", border: "1px solid #1e1e1e",
    borderRadius: 12, padding: "32px 28px",
  },
  h1: { fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 4 },
  sub: { fontSize: 14, color: "#999", marginBottom: 24 },
  label: { display: "block", fontSize: 12, color: "#999", marginBottom: 6, marginTop: 14 },
  input: {
    width: "100%", background: "#0a0a0a", color: "#e5e5e5",
    border: "1px solid #333", borderRadius: 6, padding: "10px 12px",
    fontSize: 14, boxSizing: "border-box", outline: "none",
  },
  error: { fontSize: 13, color: "#f87171", marginTop: 12 },
  submitBtn: {
    width: "100%", marginTop: 22, padding: "11px 0", background: "#3b82f6",
    color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600,
    cursor: "pointer",
  },
  switchText: { fontSize: 13, color: "#999", marginTop: 20, textAlign: "center" },
  switchLink: { color: "#60a5fa", fontWeight: 600 },
};
