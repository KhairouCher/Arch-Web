import Link from "next/link";
import { getTemplates } from "../lib/templates";

// Internal template-management view — richer/more technical than the
// public /templates gallery (conversion timestamp, asset counts, disk
// size, raw JSON link). Reads public/templates/ directly off disk, same
// as the public gallery, so it never goes stale.
//
// NOTE: this route has no auth in front of it yet — there's no user
// system in this app at all. Anyone with the URL can reach it. Fine for
// now (prototype, single-machine use), but don't treat this as a real
// admin panel until it's actually gated.

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
      <div style={S.topbar}>
        <span style={S.brand}>ArchPresent <span style={S.brandTag}>Admin</span></span>
        <Link href="/" style={S.backLink}>← Back to site</Link>
      </div>

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
    </div>
  );
}

const S = {
  page: {
    minHeight: "100vh", background: "#0a0a0a", color: "#e5e5e5",
    fontFamily: "var(--font-geist-sans), system-ui, -apple-system, sans-serif",
  },
  topbar: {
    height: 52, background: "#111", borderBottom: "1px solid #222",
    display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px",
  },
  brand: { fontSize: 15, fontWeight: 700, color: "#fff" },
  brandTag: { color: "#666", fontWeight: 500, marginLeft: 6 },
  backLink: { fontSize: 13, color: "#999" },
  main: { maxWidth: 1200, margin: "0 auto", padding: "40px 24px 80px" },
  headRow: { display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 8 },
  h1: { fontSize: 24, fontWeight: 700, color: "#fff" },
  summary: { fontSize: 13, color: "#666", fontFamily: "var(--font-geist-mono), monospace" },
  empty: { fontSize: 14, color: "#999" },
  code: {
    fontFamily: "var(--font-geist-mono), monospace", background: "#161616",
    padding: "2px 6px", borderRadius: 4, fontSize: 13,
  },
  tableWrap: { overflowX: "auto", border: "1px solid #1e1e1e", borderRadius: 8 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: {
    textAlign: "left", padding: "10px 14px", background: "#111",
    color: "#666", fontSize: 11, fontWeight: 700, textTransform: "uppercase",
    letterSpacing: "0.05em", borderBottom: "1px solid #1e1e1e", whiteSpace: "nowrap",
  },
  tr: { borderBottom: "1px solid #1a1a1a" },
  td: { padding: "12px 14px", color: "#ccc", verticalAlign: "middle" },
  mono: { fontFamily: "var(--font-geist-mono), monospace", fontSize: 12, color: "#999" },
  badgeRow: { display: "flex", gap: 6 },
  badge: {
    fontSize: 11, padding: "2px 8px", borderRadius: 10,
    background: "#161616", border: "1px solid #262626", color: "#999",
  },
  actionLink: {
    fontSize: 12, color: "#60a5fa", marginRight: 14, fontWeight: 600,
  },
};
