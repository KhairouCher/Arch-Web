"use client";

import { useState } from "react";
import { UI } from "../../lib/ui";
import { useSession } from "../../lib/useSession";
import { PAYMENT_METHODS, balanceOf, bundleName, creditPoints, getBundles, getUserRecord, listActiveUsers, listLedger } from "../../lib/mockStore";
import { useI18n } from "../../i18n/I18nProvider";
import { ledgerReason } from "../../lib/ledgerText";

const KIND_BADGE = { topup: "go", purchase: "accent", adjustment: "warn" };

// Top up a buyer's points after an off-platform payment, or adjust a balance
// (a refund is a negative adjustment). Every change is recorded with who made it.
export default function AdminPointsClient() {
  const { user: admin } = useSession();
  const { t, fmt } = useI18n();
  const users = listActiveUsers();
  const bundles = getBundles();
  const [form, setForm] = useState({ userId: "", kind: "topup", bundleId: "", amount: "", reason: "", paymentMethod: "", paymentReference: "" });
  const [message, setMessage] = useState(null); // { kind: "go" | "danger", text }
  const ledger = listLedger().slice(0, 25);

  // A deleted account keeps only an emptied row (Plan P-5.1), so its history shows no name.
  const userLabel = (id) => { const r = getUserRecord(id); return r?.deletedAt ? t("admin.deletedUser") : r?.email || id; };
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const pickBundle = (id) => {
    const b = bundles.find((x) => String(x.id) === id);
    set(b ? { bundleId: id, amount: String(b.points), reason: t("adminP.reasonTopup", { bundle: bundleName(b, t) }) } : { bundleId: "" });
  };

  function submit(e) {
    e.preventDefault();
    try {
      const amount = parseInt(form.amount, 10);
      creditPoints({
        adminId: admin.id, userId: form.userId, kind: form.kind, amount,
        reason: form.reason, bundleId: form.bundleId ? Number(form.bundleId) : null,
        paymentMethod: form.paymentMethod || null, paymentReference: form.paymentReference,
      });
      const who = users.find((u) => u.id === form.userId);
      setMessage({ kind: "go", text: t("adminP.done", { name: who?.name || form.userId, points: fmt.points(balanceOf(form.userId)) }) });
      set({ amount: "", reason: "", bundleId: "", paymentMethod: "", paymentReference: "" });
    } catch (err) {
      setMessage({ kind: "danger", text: err.code ? t(`err.${err.code}`, err.params) : err.message });
    }
  }

  return (
    <main style={UI.main}>
      <h1 style={UI.h1}>{t("adminP.title")}</h1>
      <p style={UI.sub}>{t("adminP.sub")}</p>

      <form onSubmit={submit} style={{ ...UI.card, display: "grid", gap: 12, maxWidth: 620 }}>
        <label style={UI.label}>{t("adminP.buyer")}
          <select style={UI.field} required value={form.userId} onChange={(e) => set({ userId: e.target.value })}>
            <option value="">{t("adminP.chooseUser")}</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.email}) · {fmt.points(balanceOf(u.id))}</option>)}
          </select>
        </label>
        <div style={UI.row}>
          <label style={UI.label}>{t("adminP.type")}
            <select style={UI.field} value={form.kind} onChange={(e) => set({ kind: e.target.value, bundleId: "" })}>
              <option value="topup">{t("adminP.typeTopup")}</option>
              <option value="adjustment">{t("adminP.typeAdjust")}</option>
            </select>
          </label>
          {form.kind === "topup" && (
            <label style={UI.label}>{t("adminP.bundle")}
              <select style={UI.field} value={form.bundleId} onChange={(e) => pickBundle(e.target.value)}>
                <option value="">{t("adminP.custom")}</option>
                {bundles.map((b) => <option key={b.id} value={b.id}>{bundleName(b, t)} ({fmt.points(b.points)})</option>)}
              </select>
            </label>
          )}
          <label style={UI.label}>{t("adminP.points")}
            <input style={{ ...UI.field, width: 120 }} required type="number" step="1" value={form.amount} onChange={(e) => set({ amount: e.target.value })} />
          </label>
        </div>
        {form.kind === "topup" && (
          <div style={UI.row}>
            <label style={UI.label}>{t("adminP.paidBy")}
              <select style={UI.field} required value={form.paymentMethod} onChange={(e) => set({ paymentMethod: e.target.value })}>
                <option value="">{t("adminP.choosePayment")}</option>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{t(`pay.${m}`)}</option>)}
              </select>
            </label>
            <label style={UI.label}>{t("adminP.paymentRef")}
              <input style={{ ...UI.field, width: 200 }} value={form.paymentReference} onChange={(e) => set({ paymentReference: e.target.value })} placeholder={t("adminP.paymentRefPh")} />
            </label>
          </div>
        )}
        <label style={UI.label}>{t("adminP.reason")}
          <input style={UI.field} required value={form.reason} onChange={(e) => set({ reason: e.target.value })} placeholder={t("adminP.reasonPh")} />
        </label>
        <div style={UI.row}>
          <button type="submit" style={UI.btnSolid}>{t("adminP.save")}</button>
        </div>
        {message && <div style={UI.notice(message.kind)}>{message.text}</div>}
      </form>

      <h2 style={UI.h2}>{t("adminP.balances")}</h2>
      <div style={UI.tableWrap}>
        <table style={UI.table}>
          <thead><tr>{["adminP.colUser", "adminP.colEmail", "adminP.colRole", "adminP.colBalance"].map((h) => <th key={h} style={UI.th}>{t(h)}</th>)}</tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={UI.td}><b style={{ color: "var(--ink)" }}>{u.name}</b></td>
                <td style={UI.td}>{u.email}</td>
                <td style={UI.td}><span style={UI.badge(u.role === "admin" ? "warn" : "accent")}>{t(`role.${u.role}`)}</span></td>
                <td style={{ ...UI.td, fontWeight: 600 }}>{fmt.points(balanceOf(u.id))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={UI.h2}>{t("adminP.latest")}</h2>
      <div style={UI.tableWrap}>
        <table style={UI.table}>
          <thead><tr>{["#", "col.date", "adminP.colUser", "col.type", "col.reason", "col.paid", "col.points", "adminP.colBy"].map((h) => <th key={h} style={UI.th}>{h === "#" ? h : t(h)}</th>)}</tr></thead>
          <tbody>
            {ledger.map((e) => (
              <tr key={e.id}>
                <td style={{ ...UI.td, ...UI.mono }}>{e.id}</td>
                <td style={UI.td}>{fmt.date(e.createdAt)}</td>
                <td style={UI.td}>{userLabel(e.userId)}</td>
                <td style={UI.td}><span style={UI.badge(KIND_BADGE[e.kind])}>{t(`kind.${e.kind}`)}</span></td>
                <td style={UI.td}>{ledgerReason(e, t)}</td>
                <td style={UI.td}>{e.paymentMethod ? `${t(`pay.${e.paymentMethod}`)}${e.paymentReference ? ` · ${e.paymentReference}` : ""}` : "—"}</td>
                <td style={{ ...UI.td, fontWeight: 600, color: e.amount < 0 ? "var(--ink-body)" : "var(--go)" }}>{e.amount > 0 ? "+" : ""}{fmt.number(e.amount)}</td>
                <td style={UI.td}>{userLabel(e.createdBy)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
