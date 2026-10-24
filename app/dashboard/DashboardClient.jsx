"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppBar from "../components/AppBar";
import { UI } from "../lib/ui";
import { useSession } from "../lib/useSession";
import { allModels, listLedger, listPurchases } from "../lib/mockStore";
import { useI18n } from "../i18n/I18nProvider";
import { ledgerReason } from "../lib/ledgerText";
import { deleteDraft, listDrafts, purgeExpiredDrafts } from "../lib/mockDrafts";

// The buyer's home: balance, the models they own, recent changes to their
// points, and the models on offer. Drafts will appear here once the editor
// saves them (task T-022).
export default function DashboardClient({ models }) {
  const router = useRouter();
  const { ready, user, balance } = useSession();
  const { t, fmt } = useI18n();

  useEffect(() => {
    // Signed-out visitors are sent to sign in rather than shown an empty page.
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  if (!ready || !user) return null;

  purgeExpiredDrafts();
  const drafts = listDrafts(user.id);
  const purchases = listPurchases(user.id);
  const recent = listLedger(user.id).slice(0, 5);
  const available = allModels(models).filter((m) => m.published);

  return (
    <div style={UI.page}>
      <AppBar active="dashboard" />
      <main style={UI.main}>
        <h1 style={UI.h1}>{t("dash.welcome", { name: user.name })}</h1>
        <p style={UI.sub}>{t("dash.sub")}</p>

        <div style={UI.grid}>
          <div style={{ ...UI.card, display: "grid", gap: 6 }}>
            <span style={UI.small}>{t("dash.balance")}</span>
            <b style={{ fontSize: "var(--fs-30)", color: "var(--ink)" }}>{fmt.points(balance)}</b>
            <Link href="/wallet" style={{ ...UI.btnSoft, textAlign: "center" }}>{t("dash.topUp")}</Link>
          </div>
          <div style={{ ...UI.card, display: "grid", gap: 6 }}>
            <span style={UI.small}>{t("dash.owned")}</span>
            <b style={{ fontSize: "var(--fs-30)", color: "var(--ink)" }}>{purchases.length}</b>
            <Link href="/models" style={{ ...UI.btnGhost, textAlign: "center" }}>{t("dash.browse")}</Link>
          </div>
          <div style={{ ...UI.card, display: "grid", gap: 6 }}>
            <span style={UI.small}>{t("dash.drafts")}</span>
            <b style={{ fontSize: "var(--fs-30)", color: "var(--ink)" }}>{drafts.length}</b>
            <span style={UI.small}>{t("dash.draftsNote")}</span>
          </div>
        </div>

        <h2 style={UI.h2}>{t("dash.yourDrafts")}</h2>
        {drafts.length === 0 ? (
          <p style={UI.muted}>{t("dash.noDrafts")}</p>
        ) : (
          <div style={UI.tableWrap}>
            <table style={UI.table}>
              <thead><tr>{["dash.colModel", "draft.colSaved", "draft.colDeleted", ""].map((h) => <th key={h} style={UI.th}>{h && t(h)}</th>)}</tr></thead>
              <tbody>
                {drafts.map((d) => (
                  <tr key={d.id}>
                    <td style={UI.td}><b style={{ color: "var(--ink)" }}>{d.modelName}</b></td>
                    <td style={UI.td}>{fmt.date(d.savedAt)}</td>
                    <td style={UI.td}>{fmt.day(d.expiresAt)}</td>
                    <td style={UI.td}>
                      <span style={UI.row}>
                        <Link href={`/editor?model=${d.modelId}`} style={UI.btnSoft}>{t("dash.open")}</Link>
                        <button style={UI.btnGhost} onClick={() => { if (window.confirm(t("draft.confirmDelete"))) deleteDraft(d.id); }}>{t("draft.delete")}</button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h2 style={UI.h2}>{t("dash.yourModels")}</h2>
        {purchases.length === 0 ? (
          <p style={UI.muted}>{t("dash.noneBought")}</p>
        ) : (
          <div style={UI.tableWrap}>
            <table style={UI.table}>
              <thead><tr>{["dash.colModel", "dash.colBought", "dash.colPoints", ""].map((h) => <th key={h} style={UI.th}>{h && t(h)}</th>)}</tr></thead>
              <tbody>
                {purchases.map((p) => (
                  <tr key={p.id}>
                    <td style={UI.td}><b style={{ color: "var(--ink)" }}>{p.modelName}</b></td>
                    <td style={UI.td}>{fmt.date(p.createdAt)}</td>
                    <td style={UI.td}>{fmt.number(p.pointsSpent)}</td>
                    <td style={UI.td}><Link href={`/editor?model=${p.modelId}`} style={UI.btnSoft}>{t("dash.open")}</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h2 style={UI.h2}>{t("dash.available")}</h2>
        <div style={UI.grid}>
          {available.map((m) => (
            <Link key={m.id} href={`/editor?model=${m.id}`} style={{ ...UI.card, display: "grid", gap: 6 }}>
              <span style={UI.badge("accent")}>{t(`tier.${m.tier}`)}</span>
              <b style={{ color: "var(--ink)" }}>{m.name}</b>
              <span style={UI.small}>{t("dash.pagesAndPrice", { pages: t("models.pages", { count: m.pages.length }), price: fmt.points(m.pricePoints) })}</span>
            </Link>
          ))}
        </div>

        <h2 style={UI.h2}>{t("dash.recent")}</h2>
        {recent.length === 0 ? (
          <p style={UI.muted}>{t("dash.nothing")}</p>
        ) : (
          <div style={UI.tableWrap}>
            <table style={UI.table}>
              <tbody>
                {recent.map((e) => (
                  <tr key={e.id}>
                    <td style={UI.td}>{fmt.date(e.createdAt)}</td>
                    <td style={UI.td}>{ledgerReason(e, t)}</td>
                    <td style={{ ...UI.td, fontWeight: 600, color: e.amount < 0 ? "var(--ink-body)" : "var(--go)" }}>{e.amount > 0 ? "+" : ""}{fmt.number(e.amount)}</td>
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
