"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { mockSignIn } from "../lib/mockAuth";
import { useI18n } from "../i18n/I18nProvider";
import LanguageSwitcher from "../i18n/LanguageSwitcher";

export default function SignupPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [error, setError]       = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!name || !email || !password) {
      setError(t("err.fillAll"));
      return;
    }
    if (password !== confirm) {
      setError(t("err.pwMismatch"));
      return;
    }
    // No real auth yet — see app/lib/mockAuth.js.
    mockSignIn(name, email);
    router.push("/dashboard");
  }

  return (
    <div style={S.page}>
      <LanguageSwitcher />
      <Link href="/" style={S.logo}>ArchPresent</Link>

      <div style={S.card}>
        <h1 style={S.h1}>{t("signup.title")}</h1>
        <p style={S.sub}>{t("signup.sub")}</p>

        <form onSubmit={handleSubmit}>
          <label style={S.label}>{t("field.name")}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={S.input}
            placeholder={t("ph.name")}
          />

          <label style={S.label}>{t("field.email")}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={S.input}
            placeholder={t("ph.email")}
          />

          <label style={S.label}>{t("field.password")}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={S.input}
            placeholder="••••••••"
          />

          <label style={S.label}>{t("field.confirm")}</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            style={S.input}
            placeholder="••••••••"
          />

          {error && <p style={S.error}>{error}</p>}

          <button type="submit" style={S.submitBtn}>{t("signup.submit")}</button>
        </form>

        <p style={S.switchText}>
          {t("signup.haveAccount")} <Link href="/login" style={S.switchLink}>{t("login.title")}</Link>
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
