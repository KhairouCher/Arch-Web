import Link from "next/link";

// Tab row shared by the admin pages.
const TABS = [
  ["templates", "/admin", "Templates"],
  ["models", "/admin/models", "Models"],
  ["points", "/admin/points", "Points"],
  ["queue", "/admin/queue", "Conversion queue"],
];

export default function AdminTabs({ active }) {
  return (
    <div style={S.row}>
      {TABS.map(([key, href, label]) => (
        <Link key={key} href={href} style={{ ...S.tab, ...(active === key ? S.on : null) }}>{label}</Link>
      ))}
    </div>
  );
}

const S = {
  row: { display: "flex", flexWrap: "wrap", gap: 4, padding: "0 24px", background: "var(--surface)", borderBottom: "1px solid var(--line)" },
  tab: { padding: "10px 14px", fontSize: "var(--fs-13)", color: "var(--ink-muted)", borderBottom: "2px solid transparent" },
  on: { color: "var(--ink)", fontWeight: 600, borderBottomColor: "var(--accent)" },
};
