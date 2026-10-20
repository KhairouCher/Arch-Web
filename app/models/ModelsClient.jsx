"use client";

import Link from "next/link";
import { UI } from "../lib/ui";
import { useSession } from "../lib/useSession";
import { effectiveModel, hasPurchased } from "../lib/mockStore";
import { useI18n } from "../i18n/I18nProvider";

// The model cards. The model files give the first render (the same on the
// server and the client). Once the page is loaded in the browser, the admin's
// changes to price, tier and visibility are applied on top.
export default function ModelsClient({ models }) {
  const { ready, user } = useSession();
  const { t, fmt } = useI18n();
  const list = (ready ? models.map(effectiveModel) : models).filter((m) => m.published);

  return (
    <main style={UI.main}>
      <h1 style={UI.h1}>{t("models.title")}</h1>
      <p style={UI.sub}>{t("models.sub")}</p>

      {list.length === 0 ? (
        <p style={UI.muted}>{t("models.none")}</p>
      ) : (
        <div style={UI.grid}>
          {list.map((m) => {
            const owned = ready && user && hasPurchased(user.id, m.id);
            return (
              <div key={m.id} style={{ ...UI.card, padding: 0, overflow: "hidden" }}>
                <div style={S.thumb}>
                  <span style={{ ...UI.badge("accent"), position: "absolute", top: 10, insetInlineStart: 10 }}>{t(`tier.${m.tier}`)}</span>
                  <span style={{ ...UI.badge(owned ? "go" : "go"), position: "absolute", top: 10, insetInlineEnd: 10 }}>{owned ? t("models.owned") : fmt.points(m.pricePoints)}</span>
                  <span style={UI.mono}>{t("models.pages", { count: m.pages.length })}</span>
                </div>
                <div style={{ padding: "14px 16px", display: "grid", gap: 8 }}>
                  <b style={{ color: "var(--ink)", fontSize: "var(--fs-15)" }}>{m.name}</b>
                  <span style={UI.small}>{m.pages.map((p) => p.name).join(" · ")}</span>
                  <Link href={`/editor?model=${m.id}`} style={{ ...UI.btnSoft, textAlign: "center" }}>
                    {owned ? t("models.open") : t("models.preview")}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p style={{ ...UI.small, marginTop: 24 }}>{t("models.note")}</p>
    </main>
  );
}

const S = {
  thumb: {
    position: "relative", aspectRatio: "4 / 3", background: "var(--accent-bg)", color: "var(--ink-subtle)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
};
