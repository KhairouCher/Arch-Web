"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AppBar from "../components/AppBar";
import { UI } from "../lib/ui";
import { useSession } from "../lib/useSession";
import { BUNDLES, listLedger } from "../lib/mockStore";
import { formatDa, formatDate, formatPoints } from "../lib/format";

const KIND_BADGE = { topup: "go", purchase: "accent", adjustment: "warn" };

// The buyer's points: balance, the bundles on offer, how to top up, and every change.
export default function WalletClient() {
  const router = useRouter();
  const { ready, user, balance } = useSession();

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  if (!ready || !user) return null;
  const history = listLedger(user.id);

  return (
    <div style={UI.page}>
      <AppBar active="wallet" />
      <main style={UI.main}>
        <h1 style={UI.h1}>Wallet</h1>
        <p style={UI.sub}>Points pay for models. They do not expire.</p>

        <div style={{ ...UI.card, display: "inline-grid", gap: 4, minWidth: 220 }}>
          <span style={UI.small}>Your balance</span>
          <b style={{ fontSize: "var(--fs-44)", color: "var(--ink)", lineHeight: 1.1 }}>{formatPoints(balance)}</b>
        </div>

        <h2 style={UI.h2}>Top up</h2>
        <p style={{ ...UI.muted, marginBottom: 12 }}>
          Choose a bundle, pay the client directly, and an admin adds the points to your account. You will see them here.
          Bigger bundles give more points per DA. The prices below are sample rates and are not final.
        </p>
        <div style={UI.grid}>
          {BUNDLES.map((b) => (
            <div key={b.id} style={{ ...UI.card, display: "grid", gap: 6 }}>
              <b style={{ color: "var(--ink)" }}>{b.name}</b>
              <span style={{ fontSize: "var(--fs-22)", color: "var(--ink)", fontWeight: 600 }}>{formatDa(b.priceDa)}</span>
              <span style={UI.badge("go")}>{formatPoints(b.points)}</span>
              <span style={UI.small}>{(b.points / b.priceDa).toFixed(2)} points per DA</span>
            </div>
          ))}
        </div>

        <h2 style={UI.h2}>History</h2>
        {history.length === 0 ? (
          <p style={UI.muted}>No changes yet.</p>
        ) : (
          <div style={UI.tableWrap}>
            <table style={UI.table}>
              <thead><tr>{["Date", "Type", "Reason", "Points"].map((h) => <th key={h} style={UI.th}>{h}</th>)}</tr></thead>
              <tbody>
                {history.map((e) => (
                  <tr key={e.id}>
                    <td style={UI.td}>{formatDate(e.createdAt)}</td>
                    <td style={UI.td}><span style={UI.badge(KIND_BADGE[e.kind])}>{e.kind}</span></td>
                    <td style={UI.td}>{e.reason}</td>
                    <td style={{ ...UI.td, color: e.amount < 0 ? "var(--ink-body)" : "var(--go)", fontWeight: 600 }}>
                      {e.amount > 0 ? "+" : ""}{e.amount.toLocaleString("en-US")}
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
