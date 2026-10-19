"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppBar from "../components/AppBar";
import { UI } from "../lib/ui";
import { useSession } from "../lib/useSession";
import { effectiveModel, listLedger, listPurchases } from "../lib/mockStore";
import { formatDate, formatPoints, TIER_LABELS } from "../lib/format";

// The buyer's home: balance, the models they own, recent changes to their
// points, and the models on offer. Drafts will appear here once the editor
// saves them (task T-022).
export default function DashboardClient({ models }) {
  const router = useRouter();
  const { ready, user, balance } = useSession();

  useEffect(() => {
    // Signed-out visitors are sent to sign in rather than shown an empty page.
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  if (!ready || !user) return null;

  const purchases = listPurchases(user.id);
  const recent = listLedger(user.id).slice(0, 5);
  const available = models.map(effectiveModel).filter((m) => m.published);

  return (
    <div style={UI.page}>
      <AppBar active="dashboard" />
      <main style={UI.main}>
        <h1 style={UI.h1}>Welcome, {user.name}</h1>
        <p style={UI.sub}>Pick a model to start a new presentation, or continue with one you own.</p>

        <div style={UI.grid}>
          <div style={{ ...UI.card, display: "grid", gap: 6 }}>
            <span style={UI.small}>Points balance</span>
            <b style={{ fontSize: "var(--fs-30)", color: "var(--ink)" }}>{formatPoints(balance)}</b>
            <Link href="/wallet" style={{ ...UI.btnSoft, textAlign: "center" }}>Top up</Link>
          </div>
          <div style={{ ...UI.card, display: "grid", gap: 6 }}>
            <span style={UI.small}>Models you own</span>
            <b style={{ fontSize: "var(--fs-30)", color: "var(--ink)" }}>{purchases.length}</b>
            <Link href="/models" style={{ ...UI.btnGhost, textAlign: "center" }}>Browse models</Link>
          </div>
          <div style={{ ...UI.card, display: "grid", gap: 6 }}>
            <span style={UI.small}>Drafts</span>
            <b style={{ fontSize: "var(--fs-30)", color: "var(--ink)" }}>0</b>
            <span style={UI.small}>Drafts are kept for one month. Autosave comes with the backend.</span>
          </div>
        </div>

        <h2 style={UI.h2}>Your models</h2>
        {purchases.length === 0 ? (
          <p style={UI.muted}>You have not bought a model yet. Preview any model for free: pages carry a watermark until you buy it.</p>
        ) : (
          <div style={UI.tableWrap}>
            <table style={UI.table}>
              <thead><tr>{["Model", "Bought", "Points", ""].map((h) => <th key={h} style={UI.th}>{h}</th>)}</tr></thead>
              <tbody>
                {purchases.map((p) => (
                  <tr key={p.id}>
                    <td style={UI.td}><b style={{ color: "var(--ink)" }}>{p.modelName}</b></td>
                    <td style={UI.td}>{formatDate(p.createdAt)}</td>
                    <td style={UI.td}>{p.pointsSpent.toLocaleString("en-US")}</td>
                    <td style={UI.td}><Link href={`/editor?model=${p.modelId}`} style={UI.btnSoft}>Open</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h2 style={UI.h2}>Available models</h2>
        <div style={UI.grid}>
          {available.map((m) => (
            <Link key={m.id} href={`/editor?model=${m.id}`} style={{ ...UI.card, display: "grid", gap: 6 }}>
              <span style={UI.badge("accent")}>{TIER_LABELS[m.tier] || m.tier}</span>
              <b style={{ color: "var(--ink)" }}>{m.name}</b>
              <span style={UI.small}>{m.pages.length} pages · {formatPoints(m.pricePoints)}</span>
            </Link>
          ))}
        </div>

        <h2 style={UI.h2}>Recent points activity</h2>
        {recent.length === 0 ? (
          <p style={UI.muted}>Nothing yet.</p>
        ) : (
          <div style={UI.tableWrap}>
            <table style={UI.table}>
              <tbody>
                {recent.map((e) => (
                  <tr key={e.id}>
                    <td style={UI.td}>{formatDate(e.createdAt)}</td>
                    <td style={UI.td}>{e.reason}</td>
                    <td style={{ ...UI.td, fontWeight: 600, color: e.amount < 0 ? "var(--ink-body)" : "var(--go)" }}>{e.amount > 0 ? "+" : ""}{e.amount.toLocaleString("en-US")}</td>
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
