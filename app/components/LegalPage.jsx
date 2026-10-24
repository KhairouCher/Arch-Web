import Header from "./Header";
import Footer from "./Footer";
import { UI } from "../lib/ui";
import { getI18n } from "../i18n/server";

// A text page of the site (privacy policy, terms, contact). The words live in the
// message files under "<prefix>.title", "<prefix>.intro" and "<prefix>.s1.title",
// "<prefix>.s1.body", and so on. All of it is a DRAFT until the client has read and
// approved it (task T-073), and the page says so.
export default async function LegalPage({ prefix, sections }) {
  const { t } = await getI18n();
  return (
    <div style={UI.page}>
      <Header />
      <main style={{ ...UI.main, maxWidth: 760 }}>
        <h1 style={UI.h1}>{t(`${prefix}.title`)}</h1>
        <div style={{ ...UI.notice("warn"), marginBottom: 20 }}>{t("legal.draft")}</div>
        <p style={UI.sub}>{t(`${prefix}.intro`)}</p>
        {Array.from({ length: sections }, (_, i) => i + 1).map((n) => (
          <section key={n}>
            <h2 style={UI.h2}>{t(`${prefix}.s${n}.title`)}</h2>
            <p style={{ lineHeight: 1.7, maxWidth: "70ch" }}>{t(`${prefix}.s${n}.body`)}</p>
          </section>
        ))}
      </main>
      <Footer />
    </div>
  );
}
