import Link from "next/link";
import AppBar from "../components/AppBar";
import AdminTabs from "../components/AdminTabs";
import AdminOnly from "../components/AdminOnly";
import { getTemplates } from "../lib/templates";
import { getI18n } from "../i18n/server";

// Internal template-management view — richer/more technical than the
// public /templates gallery (conversion timestamp, asset counts, disk
// size, raw JSON link). Reads public/templates/ directly off disk, same
// as the public gallery, so it never goes stale.
//
// NOTE: the admin-only gate (components/AdminOnly.jsx) is a demo: the role
// comes from the mock sign-in in the browser, so it protects nothing. Real
// roles and protected admin routes come with task T-010.

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

export default async function AdminPage() {
  const { t, fmt } = await getI18n();
  const templates = getTemplates();
  const totalSize = templates.reduce((sum, t) => sum + t.sizeBytes, 0);

  return (
    <div style={S.page}>
      <AppBar active="admin" />
      <AdminTabs active="templates" />

      <AdminOnly>
      <main style={S.main}>
        <div style={S.headRow}>
          <h1 style={S.h1}>{t("adminT.title")}</h1>
          <span style={S.summary}>{t("adminT.count", { count: templates.length })} · {t("adminT.total", { size: formatBytes(totalSize) })}</span>
        </div>

        {templates.length === 0 ? (
          <p style={S.empty}>{t("adminT.empty")} <code style={S.code}>web/public/templates/</code>.</p>
        ) : (
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>{t("adminT.colId")}</th>
                  <th style={S.th}>{t("adminT.colSource")}</th>
                  <th style={S.th}>{t("adminT.colConverted")}</th>
                  <th style={S.th}>{t("adminT.colCanvas")}</th>
                  <th style={S.th}>{t("adminT.colPlaceholders")}</th>
                  <th style={S.th}>{t("adminT.colAssets")}</th>
                  <th style={S.th}>{t("adminT.colSize")}</th>
                  <th style={S.th}></th>
                </tr>
              </thead>
              <tbody>
                {templates.map((tpl) => (
                  <tr key={tpl.id} style={S.tr}>
                    <td style={S.td}><span style={S.mono}>{tpl.id}</span></td>
                    <td style={S.td}>{tpl.source}</td>
                    <td style={S.td}>{fmt.date(tpl.convertedAt)}</td>
                    <td style={S.td}><span style={S.mono}>{tpl.width} × {tpl.height}</span></td>
                    <td style={S.td}>
                      <div style={S.badgeRow}>
                        <span style={S.badge}>{t("adminT.photo", { count: tpl.photos.length })}</span>
                        <span style={S.badge}>{t("adminT.text", { count: tpl.texts.length })}</span>
                      </div>
                    </td>
                    <td style={S.td}><span style={S.mono}>{t("adminT.layersClips", { layers: tpl.layerCount, clips: tpl.clipCount })}</span></td>
                    <td style={S.td}>{formatBytes(tpl.sizeBytes)}</td>
                    <td style={{ ...S.td, whiteSpace: "nowrap" }}>
                      <Link href={`/editor?template=${tpl.id}`} style={S.actionLink}>{t("adminT.open")}</Link>
                      <a href={`/templates/${tpl.id}/template.json`} target="_blank" rel="noopener noreferrer" style={S.actionLink}>{t("adminT.json")}</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
      </AdminOnly>
    </div>
  );
}

const S = {
  page: {
    minHeight: "100vh", background: "var(--bg)", color: "var(--ink-body)",
    fontFamily: "var(--font-sans)",
  },
  topbar: {
    height: 52, background: "var(--surface)", borderBottom: "1px solid var(--line-faint)",
    display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px",
  },
  brand: { fontSize: "var(--fs-15)", fontWeight: 700, color: "var(--ink)" },
    backLink: { fontSize: "var(--fs-13)", color: "var(--ink-muted)" },
  main: { maxWidth: 1200, margin: "0 auto", padding: "40px 24px 80px" },
  headRow: { display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 8 },
  h1: { fontSize: "var(--fs-22)", fontWeight: 700, color: "var(--ink)" },
  summary: { fontSize: "var(--fs-13)", color: "var(--ink-subtle)", fontFamily: "var(--font-mono)" },
  empty: { fontSize: "var(--fs-14)", color: "var(--ink-muted)" },
  code: {
    fontFamily: "var(--font-mono)", background: "var(--surface-raised)",
    padding: "2px 6px", borderRadius: "var(--r-md)", fontSize: "var(--fs-13)",
  },
  tableWrap: { overflowX: "auto", border: "1px solid var(--line)", borderRadius: "var(--r-lg)" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "var(--fs-13)" },
  th: {
    textAlign: "start", padding: "10px 14px", background: "var(--surface)",
    color: "var(--ink-subtle)", fontSize: "var(--fs-11)", fontWeight: 700, textTransform: "uppercase",
    letterSpacing: "0.05em", borderBottom: "1px solid var(--line)", whiteSpace: "nowrap",
  },
  tr: { borderBottom: "1px solid var(--line-faint)" },
  td: { padding: "12px 14px", color: "var(--ink-body)", verticalAlign: "middle" },
  mono: { fontFamily: "var(--font-mono)", fontSize: "var(--fs-12)", color: "var(--ink-muted)" },
  badgeRow: { display: "flex", gap: 6 },
  badge: {
    fontSize: "var(--fs-11)", padding: "2px 8px", borderRadius: "var(--r-lg)",
    background: "var(--surface-raised)", border: "1px solid var(--line-faint)", color: "var(--ink-muted)",
  },
  actionLink: {
    fontSize: "var(--fs-12)", color: "var(--accent-ink)", marginInlineEnd: 14, fontWeight: 600,
  },
};
