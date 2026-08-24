import Link from "next/link";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { getTemplates } from "../lib/templates";
import { TEMPLATE_PRICE_USD } from "../lib/pricing";

export default function TemplatesPage() {
  const templates = getTemplates();

  return (
    <div style={S.page}>
      <Header />

      <main style={S.main}>
        <h1 style={S.h1}>Templates</h1>
        <p style={S.sub}>Pick a template to open it in the editor.</p>

        {templates.length === 0 ? (
          <p style={S.empty}>
            No templates yet — run the PSD conversion pipeline in{" "}
            <code style={S.code}>scripts/</code> to add one.
          </p>
        ) : (
          <div style={S.grid}>
            {templates.map((t) => (
              <Link key={t.id} href={`/editor?template=${t.id}`} style={S.card}>
                <div style={S.thumb}>
                  <span style={S.thumbLabel}>{t.width} × {t.height}</span>
                  <span style={S.priceBadge}>${TEMPLATE_PRICE_USD}</span>
                </div>
                <div style={S.cardBody}>
                  <h2 style={S.cardTitle}>{t.id}</h2>
                  <p style={S.cardMeta}>
                    {t.photos.length} photo{t.photos.length === 1 ? "" : "s"} · {t.texts.length} text field{t.texts.length === 1 ? "" : "s"}
                  </p>
                  <p style={S.cardSource}>from {t.source}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

const S = {
  page: {
    minHeight: "100vh",
    background: "#0a0a0a",
    color: "#e5e5e5",
    fontFamily: "var(--font-geist-sans), system-ui, -apple-system, sans-serif",
  },
  main: { maxWidth: 1100, margin: "0 auto", padding: "60px 24px 100px" },
  h1: { fontSize: 34, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em", marginBottom: 8 },
  sub: { fontSize: 15, color: "#999", marginBottom: 40 },
  empty: { fontSize: 14, color: "#999", lineHeight: 1.6 },
  code: {
    fontFamily: "var(--font-geist-mono), monospace", background: "#161616",
    padding: "2px 6px", borderRadius: 4, fontSize: 13,
  },
  grid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: 20,
  },
  card: {
    display: "block", background: "#111", border: "1px solid #1e1e1e",
    borderRadius: 10, overflow: "hidden",
  },
  thumb: {
    position: "relative", aspectRatio: "4 / 3",
    background: "linear-gradient(135deg, #1a2a3a, #16161e)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  thumbLabel: { fontSize: 12, color: "#556", fontFamily: "var(--font-geist-mono), monospace" },
  priceBadge: {
    position: "absolute", top: 10, right: 10,
    background: "rgba(10,10,10,0.85)", color: "#4ade80",
    fontSize: 12, fontWeight: 700, padding: "3px 9px", borderRadius: 12,
    border: "1px solid #2d4d2d",
  },
  cardBody: { padding: "14px 16px" },
  cardTitle: { fontSize: 15, fontWeight: 600, color: "#fff", marginBottom: 4 },
  cardMeta: { fontSize: 12, color: "#999", marginBottom: 2 },
  cardSource: { fontSize: 11, color: "#555" },
};
