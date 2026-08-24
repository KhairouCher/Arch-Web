import Link from "next/link";
import Header from "./components/Header";
import Footer from "./components/Footer";

const FEATURES = [
  {
    title: "Upload your templates",
    body: "Turn a Photoshop presentation template into a fully interactive web template — once, not every time you need a new deck.",
  },
  {
    title: "Swap photos & text instantly",
    body: "Drop in new photos and edit captions right in the browser. No Photoshop required to customize a presentation.",
  },
  {
    title: "Pixel-accurate placement",
    body: "Photos snap into the exact shapes your designer created — masks, shadows, and layer order all preserved.",
  },
  {
    title: "Export in full resolution",
    body: "Download a print-ready PNG or JPG the moment you're happy with it, at the template's original resolution.",
  },
];

const STEPS = [
  { n: "01", title: "Convert", body: "Run a Photoshop template through the converter once to make it editable on the web." },
  { n: "02", title: "Customize", body: "Swap photos, edit text, and reorder layers directly in the browser." },
  { n: "03", title: "Export", body: "Download the finished presentation in full resolution, ready to share." },
];

export default function Home() {
  return (
    <div style={S.page}>
      <Header />

      <main>
        <section style={S.hero}>
          <div style={S.heroInner}>
            <h1 style={S.h1}>Presentation templates,<br />ready to edit online.</h1>
            <p style={S.heroSub}>
              Convert a Photoshop presentation template once, then let anyone
              on the team swap photos and text and export a finished
              presentation — no design software needed.
            </p>
            <div style={S.heroCtas}>
              <Link href="/editor" style={S.primaryBtn}>Open Editor</Link>
              <a href="#how-it-works" style={S.secondaryBtn}>See how it works</a>
            </div>
          </div>
        </section>

        <section id="features" style={S.section}>
          <h2 style={S.h2}>What it does</h2>
          <div style={S.featureGrid}>
            {FEATURES.map((f) => (
              <div key={f.title} style={S.featureCard}>
                <h3 style={S.featureTitle}>{f.title}</h3>
                <p style={S.featureBody}>{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" style={{ ...S.section, background: "#0d0d0d" }}>
          <h2 style={S.h2}>How it works</h2>
          <div style={S.stepGrid}>
            {STEPS.map((s) => (
              <div key={s.n} style={S.step}>
                <span style={S.stepNumber}>{s.n}</span>
                <h3 style={S.featureTitle}>{s.title}</h3>
                <p style={S.featureBody}>{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={S.ctaSection}>
          <h2 style={S.h2}>Ready to try it?</h2>
          <p style={S.heroSub}>Open the editor and see a live template in action.</p>
          <Link href="/editor" style={S.primaryBtn}>Open Editor</Link>
        </section>
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
  hero: { padding: "100px 24px 80px", textAlign: "center" },
  heroInner: { maxWidth: 720, margin: "0 auto" },
  h1: {
    fontSize: 48, fontWeight: 700, color: "#fff", lineHeight: 1.15,
    letterSpacing: "-0.02em", marginBottom: 20,
  },
  heroSub: { fontSize: 17, color: "#999", lineHeight: 1.6, marginBottom: 32 },
  heroCtas: { display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" },
  primaryBtn: {
    padding: "12px 26px", background: "#3b82f6", color: "#fff",
    borderRadius: 8, fontSize: 15, fontWeight: 600, display: "inline-block",
  },
  secondaryBtn: {
    padding: "12px 26px", background: "transparent", color: "#e5e5e5",
    border: "1px solid #333", borderRadius: 8, fontSize: 15, fontWeight: 600,
    display: "inline-block",
  },
  section: { padding: "80px 24px", maxWidth: 1100, margin: "0 auto" },
  h2: {
    fontSize: 30, fontWeight: 700, color: "#fff", textAlign: "center",
    marginBottom: 48, letterSpacing: "-0.01em",
  },
  featureGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 24,
  },
  featureCard: {
    padding: 24, background: "#111", border: "1px solid #1e1e1e", borderRadius: 10,
  },
  featureTitle: { fontSize: 16, fontWeight: 600, color: "#fff", marginBottom: 8 },
  featureBody: { fontSize: 14, color: "#999", lineHeight: 1.6 },
  stepGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 32, maxWidth: 1100, margin: "0 auto", padding: "0 24px",
  },
  step: { textAlign: "left" },
  stepNumber: {
    display: "block", fontSize: 13, fontWeight: 700, color: "#3b82f6",
    fontFamily: "var(--font-geist-mono), monospace", marginBottom: 10,
  },
  ctaSection: { padding: "100px 24px", textAlign: "center", maxWidth: 720, margin: "0 auto" },
};
