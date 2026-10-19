"use client";

import Link from "next/link";
import { UI } from "../lib/ui";
import { useSession } from "../lib/useSession";
import { effectiveModel, hasPurchased } from "../lib/mockStore";
import { formatPoints, TIER_LABELS } from "../lib/format";

// The model cards. The model files give the first render (the same on the
// server and the client). Once the page is loaded in the browser, the admin's
// changes to price, tier and visibility are applied on top.
export default function ModelsClient({ models }) {
  const { ready, user } = useSession();
  const list = (ready ? models.map(effectiveModel) : models).filter((m) => m.published);

  return (
    <main style={UI.main}>
      <h1 style={UI.h1}>Models</h1>
      <p style={UI.sub}>
        A model is a presentation of several pages. Open one in the editor, fill in your photos and text,
        and buy it with points to remove the watermark and download every page at full resolution.
      </p>

      {list.length === 0 ? (
        <p style={UI.muted}>No models are published yet.</p>
      ) : (
        <div style={UI.grid}>
          {list.map((m) => {
            const owned = ready && user && hasPurchased(user.id, m.id);
            return (
              <div key={m.id} style={{ ...UI.card, padding: 0, overflow: "hidden" }}>
                <div style={S.thumb}>
                  <span style={{ ...UI.badge("accent"), position: "absolute", top: 10, left: 10 }}>{TIER_LABELS[m.tier] || m.tier}</span>
                  <span style={{ ...UI.badge(owned ? "go" : "go"), position: "absolute", top: 10, right: 10 }}>{owned ? "Owned" : formatPoints(m.pricePoints)}</span>
                  <span style={UI.mono}>{m.pages.length} pages</span>
                </div>
                <div style={{ padding: "14px 16px", display: "grid", gap: 8 }}>
                  <b style={{ color: "var(--ink)", fontSize: "var(--fs-15)" }}>{m.name}</b>
                  <span style={UI.small}>{m.pages.map((p) => p.name).join(" · ")}</span>
                  <Link href={`/editor?model=${m.id}`} style={{ ...UI.btnSoft, textAlign: "center" }}>
                    {owned ? "Open in editor" : "Preview in editor"}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p style={{ ...UI.small, marginTop: 24 }}>Prices are in points. Top up your balance in the wallet.</p>
    </main>
  );
}

const S = {
  thumb: {
    position: "relative", aspectRatio: "4 / 3", background: "var(--accent-bg)", color: "var(--ink-subtle)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
};
