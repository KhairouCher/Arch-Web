"use client";

import Link from "next/link";
import { UI } from "../lib/ui";
import { useSession } from "../lib/useSession";
import { useI18n } from "../i18n/I18nProvider";

// Shows the admin pages only to an admin. Demo gate: the role comes from the
// mock sign-in (lib/mockAuth.js), so it protects nothing. Real roles and
// protected routes come with task T-010.
export default function AdminOnly({ children }) {
  const { ready, user } = useSession();
  const { t } = useI18n();
  if (!ready) return null;
  if (user?.role === "admin") return children;
  return (
    <main style={UI.main}>
      <div style={UI.notice("warn")}>{user ? t("adminOnly.signedIn") : t("adminOnly.signedOut")}</div>
      <p style={{ marginTop: 16 }}><Link href="/login" style={UI.btnSoft}>{t("adminOnly.go")}</Link></p>
    </main>
  );
}
