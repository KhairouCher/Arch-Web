import Link from "next/link";
import AppBar from "../components/AppBar";
import AdminTabs from "../components/AdminTabs";
import AdminOnly from "../components/AdminOnly";
import { getTemplates } from "../lib/templates";

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

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function AdminPage() {
  const templates = getTemplates();
  const totalSize = templates.reduce((sum, t) => sum + t.sizeBytes, 0);

  return (
    <div style={S.page}>
      <AppBar active="admin" />
      <AdminTabs active="templates" />

      <AdminOnly>
      <main style={S.main}>
        <div style={S.headRow}>
          <h1 style={S.h1}>Templates</h1>
          <span style={S.summary}>{templates.length} template{templates.length === 1 ? "" : "s"} · {formatBytes(totalSize)} total</span>
        </div>

        {templates.length === 0 ? (
          <p style={S.empty}>No templates found in <code style={S.code}>web/public/templates/</code>.</p>
        ) : (
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>ID</th>
                  <th style={S.th}>Source</th>
                  <th style={S.th}>Converted</th>
                  <th style={S.th}>Canvas</th>
                  <th style={S.th}>Placeholders</th>
                  <th style={S.th}>Assets</th>
                  <th style={S.th}>Size</th>
                  <th style={S.th}></th>
                </tr>
              </thead>
              <tbody>
                {templates.map((t) => (
                  <tr key={t.id} style={S.tr}>
                    <td style={S.td}><span style={S.mono}>{t.id}</span></td>
                    <td style={S.td}>{t.source}</td>
                    <td style={S.td}>{formatDate(t.convertedAt)}</td>
                    <td style={S.td}><span style={S.mono}>{t.width} × {t.height}</span></td>
                    <td style={S.td}>
                      <div style={S.badgeRow}>
                        <span style={S.badge}>{t.photos.length} photo</span>
                        <span style={S.badge}>{t.texts.length} text</span>
                      </div>
                    </td>
                    <td style={S.td}><span style={S.mono}>{t.layerCount} layers · {t.clipCount} clips</span></td>
                    <td style={S.td}>{formatBytes(t.sizeBytes)}</td>
                    <td style={{ ...S.td, whiteSpace: "nowrap" }}>
                      <Link href={`/editor?template=${t.id}`} style={S.actionLink}>Open</Link>
                      <a href={`/templates/${t.id}/template.json`} target="_blank" rel="noopener noreferrer" style={S.actionLink}>JSON</a>
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
  brandTag: { color: "var(--ink-subtle)", fontWeight: 500, marginLeft: 6 },
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
    textAlign: "left", padding: "10px 14px", background: "var(--surface)",
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
    fontSize: "var(--fs-12)", color: "var(--accent-ink)", marginRight: 14, fontWeight: 600,
  },
};
