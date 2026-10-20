import Link from "next/link";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { getI18n } from "./i18n/server";

const FEATURE_KEYS = ["f1", "f2", "f3", "f4"];
const STEP_KEYS = [["s1", "01"], ["s2", "02"], ["s3", "03"]];

export default async function Home() {
  const { t } = await getI18n();
  return (
    <div style={S.page}>
      <Header />

      <main>
        <section style={S.hero}>
          <div style={S.heroInner}>
            <h1 style={S.h1}>{t("home.h1a")}<br />{t("home.h1b")}</h1>
            <p style={S.heroSub}>{t("home.sub")}</p>
            <div style={S.heroCtas}>
              <Link href="/editor" style={S.primaryBtn}>{t("home.openEditor")}</Link>
              <a href="#how-it-works" style={S.secondaryBtn}>{t("home.seeHow")}</a>
            </div>
          </div>
        </section>

        <section id="features" style={S.section}>
          <h2 style={S.h2}>{t("home.whatTitle")}</h2>
          <div style={S.featureGrid}>
            {FEATURE_KEYS.map((k) => (
              <div key={k} style={S.featureCard}>
                <h3 style={S.featureTitle}>{t(`home.${k}.title`)}</h3>
                <p style={S.featureBody}>{t(`home.${k}.body`)}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" style={{ ...S.section, background: "var(--surface-sunken)" }}>
          <h2 style={S.h2}>{t("home.howTitle")}</h2>
          <div style={S.stepGrid}>
            {STEP_KEYS.map(([k, n]) => (
              <div key={k} style={S.step}>
                <span style={S.stepNumber}>{n}</span>
                <h3 style={S.featureTitle}>{t(`home.${k}.title`)}</h3>
                <p style={S.featureBody}>{t(`home.${k}.body`)}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={S.ctaSection}>
          <h2 style={S.h2}>{t("home.readyTitle")}</h2>
          <p style={S.heroSub}>{t("home.readySub")}</p>
          <Link href="/editor" style={S.primaryBtn}>{t("home.openEditor")}</Link>
        </section>
      </main>

      <Footer />
    </div>
  );
}

const S = {
  page: {
    minHeight: "100vh",
    background: "var(--bg)",
    color: "var(--ink-body)",
    fontFamily: "var(--font-sans)",
  },
  hero: { padding: "100px 24px 80px", textAlign: "center" },
  heroInner: { maxWidth: 720, margin: "0 auto" },
  h1: {
    fontSize: "var(--fs-44)", fontWeight: 700, color: "var(--ink)", lineHeight: 1.15,
    letterSpacing: "-0.02em", marginBottom: 20,
  },
  heroSub: { fontSize: "var(--fs-18)", color: "var(--ink-muted)", lineHeight: 1.6, marginBottom: 32 },
  heroCtas: { display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" },
  primaryBtn: {
    padding: "12px 26px", background: "var(--accent)", color: "var(--on-accent)",
    borderRadius: "var(--r-lg)", fontSize: "var(--fs-15)", fontWeight: 600, display: "inline-block",
  },
  secondaryBtn: {
    padding: "12px 26px", background: "transparent", color: "var(--ink-body)",
    border: "1px solid var(--line-strong)", borderRadius: "var(--r-lg)", fontSize: "var(--fs-15)", fontWeight: 600,
    display: "inline-block",
  },
  section: { padding: "80px 24px", maxWidth: 1100, margin: "0 auto" },
  h2: {
    fontSize: "var(--fs-30)", fontWeight: 700, color: "var(--ink)", textAlign: "center",
    marginBottom: 48, letterSpacing: "-0.01em",
  },
  featureGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 24,
  },
  featureCard: {
    padding: 24, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)",
  },
  featureTitle: { fontSize: "var(--fs-15)", fontWeight: 600, color: "var(--ink)", marginBottom: 8 },
  featureBody: { fontSize: "var(--fs-14)", color: "var(--ink-muted)", lineHeight: 1.6 },
  stepGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 32, maxWidth: 1100, margin: "0 auto", padding: "0 24px",
  },
  step: { textAlign: "start" },
  stepNumber: {
    display: "block", fontSize: "var(--fs-13)", fontWeight: 700, color: "var(--accent)",
    fontFamily: "var(--font-mono)", marginBottom: 10,
  },
  ctaSection: { padding: "100px 24px", textAlign: "center", maxWidth: 720, margin: "0 auto" },
};
