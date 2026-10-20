"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { UI } from "../lib/ui";
import { mockSignOut } from "../lib/mockAuth";
import { useSession } from "../lib/useSession";
import { useI18n } from "../i18n/I18nProvider";
import LanguageSwitcher from "../i18n/LanguageSwitcher";

// Top bar for the signed-in platform pages: where you are, your balance, sign out.
export default function AppBar({ active }) {
  const router = useRouter();
  const { ready, user, balance } = useSession();
  const { t, fmt } = useI18n();

  const link = (href, label, key) => (
    <Link key={key} href={href} style={{ ...S.link, ...(active === key ? S.linkOn : null) }}>{label}</Link>
  );

  return (
    <div style={S.bar}>
      <Link href="/" style={S.brand}>ArchPresent</Link>
      <nav style={S.nav}>
        {link("/models", t("nav.models"), "models")}
        {user && link("/dashboard", t("nav.dashboard"), "dashboard")}
        {user && link("/wallet", t("nav.wallet"), "wallet")}
        {user?.role === "admin" && link("/admin", t("nav.admin"), "admin")}
      </nav>
      <span style={{ flex: 1 }} />
      <LanguageSwitcher />
      {ready && user && (
        <>
          <Link href="/wallet" style={UI.badge("go")}>{fmt.points(balance)}</Link>
          <span style={UI.muted}>{user.email}</span>
          <button style={UI.btnGhost} onClick={() => { mockSignOut(); router.push("/login"); }}>{t("nav.signOut")}</button>
        </>
      )}
      {ready && !user && <Link href="/login" style={UI.btnSoft}>{t("nav.signIn")}</Link>}
    </div>
  );
}

const S = {
  bar: {
    display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", minHeight: "var(--layout-topbar)",
    padding: "8px 24px", background: "var(--surface)", borderBottom: "1px solid var(--line)",
  },
  brand: { fontSize: "var(--fs-15)", fontWeight: 700, color: "var(--ink)" },
  nav: { display: "flex", gap: 18 },
  link: { fontSize: "var(--fs-14)", color: "var(--ink-muted)" },
  linkOn: { color: "var(--ink)", fontWeight: 600 },
};
