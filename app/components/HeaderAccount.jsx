"use client";

import Link from "next/link";
import { UI } from "../lib/ui";
import { useSession } from "../lib/useSession";
import { useI18n } from "../i18n/I18nProvider";

// The account part of the marketing header: "Sign in" when signed out, the
// points balance and a Dashboard link when signed in. The signed-in user lives in
// the browser (useSession), so this is a client piece. It shows nothing until
// the session has loaded, which avoids a "Sign in" flash for someone who is
// already signed in.
export default function HeaderAccount({ linkStyle }) {
  const { ready, user, balance } = useSession();
  const { t, fmt } = useI18n();
  if (!ready) return null;
  if (!user) return <Link href="/login" style={linkStyle}>{t("nav.signIn")}</Link>;
  return (
    <>
      <Link href="/wallet" style={UI.badge("go")}>{fmt.points(balance)}</Link>
      <Link href="/dashboard" style={linkStyle}>{t("nav.dashboard")}</Link>
    </>
  );
}
