"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AppBar from "../components/AppBar";
import { UI } from "../lib/ui";
import { useSession } from "../lib/useSession";
import { bundleName, getBundles, listLedger } from "../lib/mockStore";
import { useI18n } from "../i18n/I18nProvider";
import { ledgerReason } from "../lib/ledgerText";

const KIND_BADGE = { topup: "go", purchase: "accent", adjustment: "warn" };

// The buyer's points: balance, the bundles on offer, how to top up, and every change.
export default function WalletClient() {
  const router = useRouter();
  const { ready, user, balance } = useSession();
  const { t, fmt } = useI18n();

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  if (!ready || !user) return null;
  const history = listLedger(user.id);

  return (
    <div style={UI.page}>
      <AppBar active="wallet" />
      <main style={UI.main}>
        <h1 style={UI.h1}>{t("wallet.title")}</h1>
        <p style={UI.sub}>{t("wallet.sub")}</p>

        <div style={{ ...UI.card, display: "inline-grid", gap: 4, minWidth: 220 }}>
          <span style={UI.small}>{t("wallet.balance")}</span>
          <b style={{ fontSize: "var(--fs-44)", color: "var(--ink)", lineHeight: 1.1 }}>{fmt.points(balance)}</b>
        </div>

        <h2 style={UI.h2}>{t("wallet.topupTitle")}</h2>
        <p style={{ ...UI.muted, marginBottom: 12 }}>{t("wallet.topupText")}</p>
        <div style={UI.grid}>
          {getBundles().map((b) => (
            <div key={b.id} style={{ ...UI.card, display: "grid", gap: 6 }}>
              <b style={{ color: "var(--ink)" }}>{bundleName(b, t)}</b>
              <span style={{ fontSize: "var(--fs-22)", color: "var(--ink)", fontWeight: 600 }}>{fmt.da(b.priceDa)}</span>
              <span style={UI.badge("go")}>{fmt.points(b.points)}</span>
              <span style={UI.small}>{t("wallet.perDa", { rate: (b.points / b.priceDa).toFixed(2) })}</span>
            </div>
          ))}
        </div>

        <h2 style={UI.h2}>{t("wallet.historyTitle")}</h2>
        {history.length === 0 ? (
          <p style={UI.muted}>{t("wallet.noChanges")}</p>
        ) : (
          <div style={UI.tableWrap}>
            <table style={UI.table}>
              <thead><tr>{["col.date", "col.type", "col.reason", "col.paid", "col.points"].map((h) => <th key={h} style={UI.th}>{t(h)}</th>)}</tr></thead>
              <tbody>
                {history.map((e) => (
                  <tr key={e.id}>
                    <td style={UI.td}>{fmt.date(e.createdAt)}</td>
                    <td style={UI.td}><span style={UI.badge(KIND_BADGE[e.kind])}>{t(`kind.${e.kind}`)}</span></td>
                    <td style={UI.td}>{ledgerReason(e, t)}</td>
                    <td style={UI.td}>{e.paymentMethod ? `${t(`pay.${e.paymentMethod}`)}${e.paymentReference ? ` · ${e.paymentReference}` : ""}` : "—"}</td>
                    <td style={{ ...UI.td, color: e.amount < 0 ? "var(--ink-body)" : "var(--go)", fontWeight: 600 }}>
                      {e.amount > 0 ? "+" : ""}{fmt.number(e.amount)}
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
