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
    minHeight: "100vh", background: "var(--bg)", color: "var(--ink-body)",
    fontFamily: "var(--font-sans)",
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", gap: 32, padding: 24,
  },
  logo: { fontSize: "var(--fs-18)", fontWeight: 700, color: "var(--ink)", letterSpacing: "0.02em" },
  card: {
    width: "100%", maxWidth: 380, background: "var(--surface)", border: "1px solid var(--line)",
    borderRadius: "var(--r-lg)", padding: "32px 28px",
  },
  h1: { fontSize: "var(--fs-22)", fontWeight: 700, color: "var(--ink)", marginBottom: 4 },
  sub: { fontSize: "var(--fs-14)", color: "var(--ink-muted)", marginBottom: 24 },
  label: { display: "block", fontSize: "var(--fs-12)", color: "var(--ink-muted)", marginBottom: 6, marginTop: 14 },
  input: {
    width: "100%", background: "var(--bg)", color: "var(--ink-body)",
    border: "1px solid var(--line-strong)", borderRadius: "var(--r-md)", padding: "10px 12px",
    fontSize: "var(--fs-14)", boxSizing: "border-box", outline: "none",
  },
  error: { fontSize: "var(--fs-13)", color: "var(--danger)", marginTop: 12 },
  submitBtn: {
    width: "100%", marginTop: 22, padding: "11px 0", background: "var(--accent)",
    color: "var(--on-accent)", border: "none", borderRadius: "var(--r-md)", fontSize: "var(--fs-14)", fontWeight: 600,
    cursor: "pointer",
  },
  switchText: { fontSize: "var(--fs-13)", color: "var(--ink-muted)", marginTop: 20, textAlign: "center" },
  switchLink: { color: "var(--accent-ink)", fontWeight: 600 },
};
