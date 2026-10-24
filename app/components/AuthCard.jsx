"use client";

import Link from "next/link";
import LanguageSwitcher from "../i18n/LanguageSwitcher";

// The centered card the sign-in style pages share: the language switcher, the
// logo, then a card with a title and a line under it. (The sign-in and sign-up
// pages predate this and keep their own copy of these styles.)
export default function AuthCard({ title, sub, children }) {
  return (
    <div style={S.page}>
      <LanguageSwitcher />
      <Link href="/" style={S.logo}>ArchPresent</Link>
      <div style={S.card}>
        <h1 style={S.h1}>{title}</h1>
        {sub && <p style={S.sub}>{sub}</p>}
        {children}
      </div>
    </div>
  );
}

export const AUTH = {
  label: { display: "block", fontSize: "var(--fs-12)", color: "var(--ink-muted)", marginBottom: 6, marginTop: 14 },
  input: {
    width: "100%", background: "var(--bg)", color: "var(--ink-body)",
    border: "1px solid var(--line-strong)", borderRadius: "var(--r-md)", padding: "10px 12px",
    fontSize: "var(--fs-14)", boxSizing: "border-box", outline: "none",
  },
  error: { fontSize: "var(--fs-13)", color: "var(--danger)", marginTop: 12 },
  button: {
    width: "100%", marginTop: 18, padding: "11px 0", background: "var(--accent)",
    color: "var(--on-accent)", border: "none", borderRadius: "var(--r-md)", fontSize: "var(--fs-14)", fontWeight: 600, cursor: "pointer",
    display: "block", textAlign: "center",
  },
  ghost: {
    width: "100%", marginTop: 10, padding: "10px 0", background: "transparent", color: "var(--ink-muted)",
    border: "1px solid var(--line-strong)", borderRadius: "var(--r-md)", fontSize: "var(--fs-14)", cursor: "pointer",
    display: "block", textAlign: "center",
  },
  note: { fontSize: "var(--fs-13)", color: "var(--ink-muted)", marginTop: 14, lineHeight: 1.5 },
  link: { color: "var(--accent-ink)", fontWeight: 600 },
};

const S = {
  page: {
    minHeight: "100vh", background: "var(--bg)", color: "var(--ink-body)", fontFamily: "var(--font-sans)",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 32, padding: 24,
  },
  logo: { fontSize: "var(--fs-18)", fontWeight: 700, color: "var(--ink)", letterSpacing: "0.02em" },
  card: { width: "100%", maxWidth: 400, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)", padding: "32px 28px" },
  h1: { fontSize: "var(--fs-22)", fontWeight: 700, color: "var(--ink)", marginBottom: 4 },
  sub: { fontSize: "var(--fs-14)", color: "var(--ink-muted)", marginBottom: 8 },
};
