"use client";

import { useState } from "react";
import { UI } from "../../lib/ui";
import { useSession } from "../../lib/useSession";
import { BUNDLES, balanceOf, creditPoints, getUsers, listLedger } from "../../lib/mockStore";
import { formatDate, formatPoints } from "../../lib/format";

const KIND_BADGE = { topup: "go", purchase: "accent", adjustment: "warn" };

// Top up a buyer's points after an off-platform payment, or adjust a balance
// (a refund is a negative adjustment). Every change is recorded with who made it.
export default function AdminPointsClient() {
  const { user: admin } = useSession();
  const users = getUsers();
  const [form, setForm] = useState({ userId: "", kind: "topup", bundleId: "", amount: "", reason: "" });
  const [message, setMessage] = useState(null); // { kind: "go" | "danger", text }
  const ledger = listLedger().slice(0, 25);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const pickBundle = (id) => {
    const b = BUNDLES.find((x) => String(x.id) === id);
    set(b ? { bundleId: id, amount: String(b.points), reason: `Top-up: ${b.name}` } : { bundleId: "" });
  };

  function submit(e) {
    e.preventDefault();
    try {
      const amount = parseInt(form.amount, 10);
      creditPoints({
        adminId: admin.id, userId: form.userId, kind: form.kind, amount,
        reason: form.reason, bundleId: form.bundleId ? Number(form.bundleId) : null,
      });
      const who = users.find((u) => u.id === form.userId);
      setMessage({ kind: "go", text: `Done. ${who?.name || form.userId} now has ${formatPoints(balanceOf(form.userId))}.` });
      set({ amount: "", reason: "", bundleId: "" });
    } catch (err) {
      setMessage({ kind: "danger", text: err.message });
    }
  }

  return (
    <main style={UI.main}>
      <h1 style={UI.h1}>Points</h1>
      <p style={UI.sub}>After a buyer pays for a bundle off the platform, add their points here. A refund is a negative adjustment. The history cannot be edited.</p>

      <form onSubmit={submit} style={{ ...UI.card, display: "grid", gap: 12, maxWidth: 620 }}>
        <label style={UI.label}>Buyer
          <select style={UI.field} required value={form.userId} onChange={(e) => set({ userId: e.target.value })}>
            <option value="">Choose a user</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.email}) · {formatPoints(balanceOf(u.id))}</option>)}
          </select>
        </label>
        <div style={UI.row}>
          <label style={UI.label}>Type
            <select style={UI.field} value={form.kind} onChange={(e) => set({ kind: e.target.value, bundleId: "" })}>
              <option value="topup">Top-up (adds points)</option>
              <option value="adjustment">Adjustment (adds or removes)</option>
            </select>
          </label>
          {form.kind === "topup" && (
            <label style={UI.label}>Bundle
              <select style={UI.field} value={form.bundleId} onChange={(e) => pickBundle(e.target.value)}>
                <option value="">Custom amount</option>
                {BUNDLES.map((b) => <option key={b.id} value={b.id}>{b.name} ({formatPoints(b.points)})</option>)}
              </select>
            </label>
          )}
          <label style={UI.label}>Points
            <input style={{ ...UI.field, width: 120 }} required type="number" step="1" value={form.amount} onChange={(e) => set({ amount: e.target.value })} />
          </label>
        </div>
        <label style={UI.label}>Reason (required)
          <input style={UI.field} required value={form.reason} onChange={(e) => set({ reason: e.target.value })} placeholder="For example: paid 2,500.00 DA, bank transfer, receipt 114" />
        </label>
        <div style={UI.row}>
          <button type="submit" style={UI.btnSolid}>Save</button>
        </div>
        {message && <div style={UI.notice(message.kind)}>{message.text}</div>}
      </form>

      <h2 style={UI.h2}>Balances</h2>
      <div style={UI.tableWrap}>
        <table style={UI.table}>
          <thead><tr>{["User", "Email", "Role", "Balance"].map((h) => <th key={h} style={UI.th}>{h}</th>)}</tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={UI.td}><b style={{ color: "var(--ink)" }}>{u.name}</b></td>
                <td style={UI.td}>{u.email}</td>
                <td style={UI.td}><span style={UI.badge(u.role === "admin" ? "warn" : "accent")}>{u.role}</span></td>
                <td style={{ ...UI.td, fontWeight: 600 }}>{formatPoints(balanceOf(u.id))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={UI.h2}>Latest changes</h2>
      <div style={UI.tableWrap}>
        <table style={UI.table}>
          <thead><tr>{["#", "Date", "User", "Type", "Reason", "Points", "By"].map((h) => <th key={h} style={UI.th}>{h}</th>)}</tr></thead>
          <tbody>
            {ledger.map((e) => (
              <tr key={e.id}>
                <td style={{ ...UI.td, ...UI.mono }}>{e.id}</td>
                <td style={UI.td}>{formatDate(e.createdAt)}</td>
                <td style={UI.td}>{e.userId}</td>
                <td style={UI.td}><span style={UI.badge(KIND_BADGE[e.kind])}>{e.kind}</span></td>
                <td style={UI.td}>{e.reason}</td>
                <td style={{ ...UI.td, fontWeight: 600, color: e.amount < 0 ? "var(--ink-body)" : "var(--go)" }}>{e.amount > 0 ? "+" : ""}{e.amount.toLocaleString("en-US")}</td>
                <td style={UI.td}>{e.createdBy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
