"use client";

import { useState } from "react";
import Link from "next/link";
import AuthCard, { AUTH } from "../components/AuthCard";
import { useI18n } from "../i18n/I18nProvider";

// Ask for a password-reset link. The reply is the same whether or not the address
// has an account, so the page cannot be used to find out who is registered. The
// real email comes with tasks T-030 and T-070; the demo links straight to the page
// the email would open.
export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  function submit(e) {
    e.preventDefault();
    if (!email.trim()) { setError(t("forgot.needEmail")); return; }
    setError("");
    setSent(true);
  }

  return (
    <AuthCard title={t("forgot.title")} sub={sent ? undefined : t("forgot.sub")}>
      {sent ? (
        <>
          <p style={{ ...AUTH.note, marginTop: 4 }}>{t("forgot.sent")}</p>
          <Link href={`/reset-password?email=${encodeURIComponent(email.trim())}`} style={AUTH.button}>{t("forgot.demoOpen")}</Link>
        </>
      ) : (
        <form onSubmit={submit}>
          <label style={AUTH.label}>{t("field.email")}</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={AUTH.input} placeholder={t("ph.email")} />
          {error && <p style={AUTH.error}>{error}</p>}
          <button type="submit" style={AUTH.button}>{t("forgot.submit")}</button>
        </form>
      )}
      <p style={{ ...AUTH.note, textAlign: "center" }}><Link href="/login" style={AUTH.link}>{t("forgot.back")}</Link></p>
    </AuthCard>
  );
}
