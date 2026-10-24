"use client";

import { useState } from "react";
import { UI } from "../../lib/ui";
import { useSession } from "../../lib/useSession";
import { bundleName, getBundles, saveBundle } from "../../lib/mockStore";
import { useI18n } from "../../i18n/I18nProvider";
import { errorText } from "../../lib/errorText";

// The top-up bundles buyers see in the wallet (Plan P-5.26): the client sets each
// one's name, price in DA and points; bigger bundles should give more points per
// DA. A bundle is switched off, never deleted, because the history refers to it.
// The rates are not decided yet (Plan Open 4); the three here are samples.
export default function AdminBundlesClient() {
  const { user: admin } = useSession();
  const { t, fmt } = useI18n();
  const [msg, setMsg] = useState(null);
  const bundles = getBundles({ all: true });

  const run = (fn, done) => {
    try { fn(); setMsg(done ? { kind: "go", text: done } : null); return true; }
    catch (e) { setMsg({ kind: "danger", text: errorText(e, t) }); return false; }
  };

  return (
    <main style={UI.main}>
      <h1 style={UI.h1}>{t("adminB.title")}</h1>
      <p style={UI.sub}>{t("adminB.sub")}</p>
      {msg && <div style={{ ...UI.notice(msg.kind), marginBottom: 16 }}>{msg.text}</div>}

      <div style={UI.tableWrap}>
        <table style={UI.table}>
          <thead><tr>{["adminB.colName", "adminB.colPrice", "adminP.points", "adminB.colRate", "adminB.colActive", ""].map((h) => <th key={h} style={UI.th}>{h && t(h)}</th>)}</tr></thead>
          <tbody>
            {bundles.map((b) => <BundleRow key={`${b.id}-${b.priceDa}-${b.points}-${b.active}-${b.name || b.nameKey}`} bundle={b} adminId={admin?.id} run={run} t={t} fmt={fmt} />)}
          </tbody>
        </table>
      </div>

      <h2 style={UI.h2}>{t("adminB.addTitle")}</h2>
      <NewBundle adminId={admin?.id} run={run} t={t} />
      <p style={{ ...UI.small, marginTop: 12 }}>{t("adminB.note")}</p>
    </main>
  );
}

function BundleRow({ bundle, adminId, run, t, fmt }) {
  const original = bundleName(bundle, t);
  const [f, setF] = useState({ name: original, priceDa: String(bundle.priceDa), points: String(bundle.points), active: bundle.active });
  const rate = Number(f.priceDa) > 0 ? (Number(f.points) / Number(f.priceDa)).toFixed(2) : "—";
  const save = () => run(() => saveBundle(adminId, {
    id: bundle.id, active: f.active, priceDa: f.priceDa, points: parseInt(f.points, 10),
    // an unchanged default name stays translated in every language
    ...(bundle.nameKey && f.name === original ? { nameKey: bundle.nameKey } : { name: f.name }),
  }), t("adminB.saved"));
  return (
    <tr>
      <td style={UI.td}><input aria-label={t("adminB.colName")} style={{ ...UI.field, width: 220 }} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></td>
      <td style={UI.td}><input aria-label={t("adminB.colPrice")} type="number" min="0" step="100" style={{ ...UI.field, width: 120 }} value={f.priceDa} onChange={(e) => setF({ ...f, priceDa: e.target.value })} /></td>
      <td style={UI.td}><input aria-label={t("adminP.points")} type="number" min="0" step="100" style={{ ...UI.field, width: 110 }} value={f.points} onChange={(e) => setF({ ...f, points: e.target.value })} /></td>
      <td style={{ ...UI.td, ...UI.mono }}>{rate}</td>
      <td style={UI.td}><input type="checkbox" aria-label={t("adminB.colActive")} checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /></td>
      <td style={UI.td}><button style={UI.btnSoft} onClick={save}>{t("adminP.save")}</button> <span style={UI.small}>{fmt.da(Number(f.priceDa) || 0)}</span></td>
    </tr>
  );
}

function NewBundle({ adminId, run, t }) {
  const [f, setF] = useState({ name: "", priceDa: "", points: "" });
  return (
    <form
      style={{ ...UI.card, display: "grid", gap: 12, maxWidth: 560 }}
      onSubmit={(e) => { e.preventDefault(); if (run(() => saveBundle(adminId, { name: f.name, priceDa: f.priceDa, points: parseInt(f.points, 10), active: true }), t("adminB.created"))) setF({ name: "", priceDa: "", points: "" }); }}
    >
      <label style={UI.label}>{t("adminB.colName")}<input style={UI.field} required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
      <div style={UI.row}>
        <label style={UI.label}>{t("adminB.colPrice")}<input style={{ ...UI.field, width: 140 }} required type="number" min="0" step="100" value={f.priceDa} onChange={(e) => setF({ ...f, priceDa: e.target.value })} /></label>
        <label style={UI.label}>{t("adminP.points")}<input style={{ ...UI.field, width: 120 }} required type="number" min="0" step="100" value={f.points} onChange={(e) => setF({ ...f, points: e.target.value })} /></label>
      </div>
      <div><button type="submit" style={UI.btnSolid}>{t("adminB.add")}</button></div>
    </form>
  );
}
