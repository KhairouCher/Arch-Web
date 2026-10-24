"use client";

import Link from "next/link";
import { useI18n } from "../i18n/I18nProvider";

// Site-wide marketing footer — shared by the homepage and the models gallery.
// Not used on /editor.
export default function Footer() {
  const { t } = useI18n();
  return (
    <footer style={S.footer}>
      <span style={S.logo}>ArchPresent</span>
      <nav style={S.links}>
        <Link href="/privacy" style={S.footerText}>{t("footer.privacy")}</Link>
        <Link href="/terms" style={S.footerText}>{t("footer.terms")}</Link>
        <Link href="/contact" style={S.footerText}>{t("footer.contact")}</Link>
      </nav>
      <span style={S.footerText}>{t("footer.rights", { year: new Date().getFullYear() })}</span>
    </footer>
  );
}

const S = {
  footer: {
    borderTop: "1px solid var(--line)", padding: "28px 24px",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    maxWidth: 1100, margin: "0 auto", flexWrap: "wrap", gap: 12,
  },
  logo: { fontSize: "var(--fs-15)", fontWeight: 700, color: "var(--ink)", letterSpacing: "0.02em" },
  links: { display: "flex", gap: 20, flexWrap: "wrap" },
  footerText: { fontSize: "var(--fs-13)", color: "var(--ink-subtle)" },
};
