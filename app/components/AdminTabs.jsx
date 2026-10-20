"use client";

import Link from "next/link";
import { useI18n } from "../i18n/I18nProvider";

// Tab row shared by the admin pages.
const TABS = [
  ["templates", "/admin"],
  ["models", "/admin/models"],
  ["points", "/admin/points"],
  ["queue", "/admin/queue"],
];

export default function AdminTabs({ active }) {
  const { t } = useI18n();
  return (
    <div style={S.row}>
      {TABS.map(([key, href]) => (
        <Link key={key} href={href} style={{ ...S.tab, ...(active === key ? S.on : null) }}>{t(`admin.tab.${key}`)}</Link>
      ))}
    </div>
  );
}

const S = {
  row: { display: "flex", flexWrap: "wrap", gap: 4, padding: "0 24px", background: "var(--surface)", borderBottom: "1px solid var(--line)" },
  tab: { padding: "10px 14px", fontSize: "var(--fs-13)", color: "var(--ink-muted)", borderBottom: "2px solid transparent" },
  on: { color: "var(--ink)", fontWeight: 600, borderBottomColor: "var(--accent)" },
};
