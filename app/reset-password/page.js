"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AuthCard, { AUTH } from "../components/AuthCard";
import { useI18n } from "../i18n/I18nProvider";

// Choose a new password from the link in the email. The placeholder accounts keep
// no passwords, so nothing is saved; the real change comes with accounts (T-010).
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}

function ResetForm() {
  const { t } = useI18n();
  const params = useSearchParams();
  const email = params.get("email") || "";
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function submit(e) {
    e.preventDefault();
    if (pw.length < 8) { setError(t("err.pwShort")); return; }
    if (pw !== confirm) { setError(t("err.pwMismatch")); return; }
    setError("");
    setDone(true);
  }

  if (done) {
    return (
      <AuthCard title={t("reset.doneTitle")} sub={t("reset.doneText")}>
        <Link href="/login" style={AUTH.button}>{t("login.title")}</Link>
      </AuthCard>
    );
  }
  return (
    <AuthCard title={t("reset.title")} sub={email ? t("reset.for", { email }) : undefined}>
      <form onSubmit={submit}>
        <label style={AUTH.label}>{t("field.newPassword")}</label>
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} style={AUTH.input} placeholder="••••••••" autoComplete="new-password" />
        <label style={AUTH.label}>{t("field.confirm")}</label>
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} style={AUTH.input} placeholder="••••••••" autoComplete="new-password" />
        {error && <p style={AUTH.error}>{error}</p>}
        <button type="submit" style={AUTH.button}>{t("reset.submit")}</button>
      </form>
    </AuthCard>
  );
}
