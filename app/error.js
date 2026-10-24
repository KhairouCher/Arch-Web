"use client";

import Link from "next/link";
import { UI } from "./lib/ui";
import { useI18n } from "./i18n/I18nProvider";

// Shown when a page fails while it runs. The buyer's draft is saved in the browser
// as they edit, so a reload loses at most the last moment of work.
export default function ErrorPage({ reset }) {
  const { t } = useI18n();
  return (
    <div style={UI.page}>
      <main style={{ ...UI.main, textAlign: "center", paddingTop: 100 }}>
        <h1 style={UI.h1}>{t("error.title")}</h1>
        <p style={{ ...UI.sub, margin: "0 auto 24px" }}>{t("error.text")}</p>
        <span style={UI.row}>
          <button type="button" style={UI.btnSolid} onClick={() => reset()}>{t("error.retry")}</button>
          <Link href="/" style={UI.btnGhost}>{t("notfound.home")}</Link>
        </span>
      </main>
    </div>
  );
}
