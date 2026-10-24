import Link from "next/link";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { UI } from "./lib/ui";
import { getI18n } from "./i18n/server";

// Shown for any address that does not exist.
export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <div style={UI.page}>
      <Header />
      <main style={{ ...UI.main, textAlign: "center", paddingTop: 100 }}>
        <p style={{ ...UI.mono, fontSize: "var(--fs-18)", color: "var(--ink-subtle)" }}>404</p>
        <h1 style={UI.h1}>{t("notfound.title")}</h1>
        <p style={{ ...UI.sub, margin: "0 auto 24px" }}>{t("notfound.text")}</p>
        <Link href="/" style={UI.btnSolid}>{t("notfound.home")}</Link>
      </main>
      <Footer />
    </div>
  );
}
