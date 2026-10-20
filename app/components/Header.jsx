"use client";

import Link from "next/link";
import HeaderAccount from "./HeaderAccount";
import LanguageSwitcher from "../i18n/LanguageSwitcher";
import { useI18n } from "../i18n/I18nProvider";

// Site-wide marketing header — shared by the homepage and the models gallery.
// Not used on /editor, which has its own full-screen app chrome.
export default function Header() {
  const { t } = useI18n();
  return (
    <header style={S.header}>
      <div style={S.headerInner}>
        <Link href="/" style={S.logo}>ArchPresent</Link>
        <nav style={S.nav}>
          <Link href="/models" style={S.navLink}>{t("nav.models")}</Link>
          <Link href="/#features" style={S.navLink}>{t("nav.features")}</Link>
          <Link href="/#how-it-works" style={S.navLink}>{t("nav.how")}</Link>
        </nav>
        <div style={S.rightGroup}>
          <LanguageSwitcher />
          <HeaderAccount linkStyle={S.navLink} />
          <Link href="/editor" style={S.navCta}>{t("nav.openEditor")}</Link>
        </div>
      </div>
    </header>
  );
}

const S = {
  header: {
    position: "sticky", top: 0, zIndex: 10,
    background: "var(--surface)", backdropFilter: "blur(8px)",
    borderBottom: "1px solid var(--line)",
  },
  headerInner: {
    maxWidth: 1100, margin: "0 auto", padding: "16px 24px",
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20,
  },
  logo: { fontSize: "var(--fs-15)", fontWeight: 700, color: "var(--ink)", letterSpacing: "0.02em" },
  nav: { display: "flex", gap: 28, flex: 1, justifyContent: "center" },
  navLink: { fontSize: "var(--fs-14)", color: "var(--ink-muted)" },
  rightGroup: { display: "flex", alignItems: "center", gap: 20, flexShrink: 0 },
  navCta: {
    padding: "8px 18px", background: "var(--accent-bg)", color: "var(--accent-ink)",
    border: "1px solid var(--accent-line)", borderRadius: "var(--r-md)", fontSize: "var(--fs-14)", fontWeight: 600,
    flexShrink: 0,
  },
};
