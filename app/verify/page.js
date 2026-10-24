"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthCard, { AUTH } from "../components/AuthCard";
import { useSession } from "../lib/useSession";
import { setVerified } from "../lib/mockStore";
import { useI18n } from "../i18n/I18nProvider";

// Confirm the email address (Plan P-5.1: a buyer confirms by link before buying).
// The real link arrives by email (tasks T-030 and T-070); the demo has a button
// that does what following the link would do.
export default function VerifyPage() {
  const router = useRouter();
  const { ready, user } = useSession();
  const { t } = useI18n();
  const [again, setAgain] = useState(false);

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);
  if (!ready || !user) return null;

  if (user.verified) {
    return (
      <AuthCard title={t("verify.doneTitle")} sub={t("verify.doneText", { email: user.email })}>
        <Link href="/dashboard" style={AUTH.button}>{t("verify.continue")}</Link>
      </AuthCard>
    );
  }
  return (
    <AuthCard title={t("verify.title")} sub={t("verify.text", { email: user.email })}>
      <p style={AUTH.note}>{t("verify.why")}</p>
      <button type="button" style={AUTH.button} onClick={() => setVerified(user.id)}>{t("verify.demoConfirm")}</button>
      <button type="button" style={AUTH.ghost} onClick={() => setAgain(true)}>{t("verify.again")}</button>
      {again && <p style={{ ...AUTH.note, color: "var(--go)" }}>{t("verify.sentAgain")}</p>}
      <Link href="/dashboard" style={{ ...AUTH.ghost, border: "none" }}>{t("verify.later")}</Link>
    </AuthCard>
  );
}
