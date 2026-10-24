"use client";

import Link from "next/link";
import { useState } from "react";
import { UI } from "../lib/ui";
import { useSession } from "../lib/useSession";
import { TIERS, fastPathPublish, getTemplateStates, getTemplateStatus, setTemplateStatus } from "../lib/mockStore";
import { useI18n } from "../i18n/I18nProvider";
import { errorText } from "../lib/errorText";

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

const STATUS_BADGE = { published: "go", in_review: "warn", rejected: "danger" };

// The templates on disk, each with its review status. A design is not visible to
// buyers until the client accepts it (Plan P-5.13): Approve publishes it, Reject
// keeps it out, and a model with an unpublished page cannot go live. Below it, the
// fast path (P-5.24): converter output converted on the developer's own PC becomes
// a published model at once, with no queue and no review.
export default function AdminTemplatesClient({ templates }) {
  const { user: admin } = useSession();
  const { t, fmt } = useI18n();
  const [msg, setMsg] = useState(null);
  const [fast, setFast] = useState({ name: "", template: "", tier: "architect", price: "1000" });
  const states = getTemplateStates();
  const totalSize = templates.reduce((s, x) => s + x.sizeBytes, 0);

  const run = (fn, done) => {
    try { fn(); setMsg(done ? { kind: "go", text: done } : null); return true; }
    catch (e) { setMsg({ kind: "danger", text: errorText(e, t) }); return false; }
  };

  return (
    <main style={{ ...UI.main, maxWidth: 1200 }}>
      <div style={{ ...UI.row, justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
        <h1 style={{ ...UI.h1, marginBottom: 0 }}>{t("adminT.title")}</h1>
        <span style={UI.mono}>{t("adminT.count", { count: templates.length })} · {t("adminT.total", { size: formatBytes(totalSize) })}</span>
      </div>
      <p style={UI.sub}>{t("adminT.sub")}</p>
      {msg && <div style={{ ...UI.notice(msg.kind), marginBottom: 16 }}>{msg.text}</div>}

      {templates.length === 0 ? (
        <p style={UI.muted}>{t("adminT.empty")} <code style={UI.mono}>web/public/templates/</code>.</p>
      ) : (
        <div style={UI.tableWrap}>
          <table style={UI.table}>
            <thead>
              <tr>{["adminT.colId", "adminT.colSource", "adminT.colConverted", "adminT.colCanvas", "adminT.colPlaceholders", "adminT.colSize", "adminQ.colStatus", ""].map((h) => <th key={h} style={UI.th}>{h && t(h)}</th>)}</tr>
            </thead>
            <tbody>
              {templates.map((tp) => {
                const status = getTemplateStatus(tp.id);
                return (
                  <tr key={tp.id}>
                    <td style={UI.td}><span style={UI.mono}>{tp.id}</span></td>
                    <td style={UI.td}>{tp.source}</td>
                    <td style={UI.td}>{fmt.date(tp.convertedAt)}</td>
                    <td style={UI.td}><span style={UI.mono}>{tp.width} × {tp.height}</span></td>
                    <td style={UI.td}>
                      <span style={UI.row}>
                        <span style={UI.badge("accent")}>{t("adminT.photo", { count: tp.photoCount })}</span>
                        <span style={UI.badge("accent")}>{t("adminT.text", { count: tp.textCount })}</span>
                      </span>
                      <div style={{ ...UI.small, marginTop: 4 }}>{t("adminT.layersClips", { layers: tp.layerCount, clips: tp.clipCount })}</div>
                    </td>
                    <td style={UI.td}>{formatBytes(tp.sizeBytes)}</td>
                    <td style={UI.td}>
                      <span style={UI.badge(STATUS_BADGE[status])}>{t(`tstatus.${status}`)}</span>
                      {states[tp.id]?.fastPath && <div style={UI.small}>{t("adminM.fastPath")}</div>}
                    </td>
                    <td style={{ ...UI.td, whiteSpace: "nowrap" }}>
                      <span style={UI.row}>
                        <Link href={`/editor?template=${tp.id}`} style={UI.btnGhost}>{t("adminT.open")}</Link>
                        {status !== "published" && <button style={UI.btnSoft} onClick={() => run(() => setTemplateStatus(admin.id, tp.id, "published"), t("adminT.approved", { id: tp.id }))}>{t("adminT.approve")}</button>}
                        {status !== "rejected" && <button style={UI.btnGhost} onClick={() => run(() => setTemplateStatus(admin.id, tp.id, "rejected"), t("adminT.rejected", { id: tp.id }))}>{t("adminT.reject")}</button>}
                        {status === "published" && <button style={UI.btnGhost} onClick={() => run(() => setTemplateStatus(admin.id, tp.id, "in_review"), t("adminT.sentBack", { id: tp.id }))}>{t("adminT.toReview")}</button>}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <h2 style={UI.h2}>{t("adminT.fastTitle")}</h2>
      <p style={{ ...UI.muted, marginBottom: 12, maxWidth: "70ch" }}>{t("adminT.fastText")}</p>
      <form
        style={{ ...UI.card, display: "grid", gap: 12, maxWidth: 620 }}
        onSubmit={(e) => {
          e.preventDefault();
          if (run(() => fastPathPublish(admin.id, { name: fast.name, template: fast.template, tier: fast.tier, pricePoints: parseInt(fast.price || "0", 10) }), t("adminT.fastDone"))) {
            setFast({ name: "", template: "", tier: "architect", price: "1000" });
          }
        }}
      >
        <label style={UI.label}>{t("adminT.fastFolder")}
          <select style={UI.field} required value={fast.template} onChange={(e) => setFast({ ...fast, template: e.target.value })}>
            <option value="">{t("adminM.chooseTemplate")}</option>
            {templates.map((tp) => <option key={tp.id} value={tp.id}>{tp.id} ({tp.source})</option>)}
          </select>
        </label>
        <label style={UI.label}>{t("adminM.modelName")}
          <input style={UI.field} required value={fast.name} onChange={(e) => setFast({ ...fast, name: e.target.value })} />
        </label>
        <div style={UI.row}>
          <label style={UI.label}>{t("adminM.colTier")}
            <select style={UI.field} value={fast.tier} onChange={(e) => setFast({ ...fast, tier: e.target.value })}>
              {TIERS.map((v) => <option key={v} value={v}>{t(`tier.${v}`)}</option>)}
            </select>
          </label>
          <label style={UI.label}>{t("adminM.colPrice")}
            <input style={{ ...UI.field, width: 120 }} type="number" min="0" step="100" value={fast.price} onChange={(e) => setFast({ ...fast, price: e.target.value })} />
          </label>
        </div>
        <div><button type="submit" style={UI.btnSolid}>{t("adminT.fastPublish")}</button></div>
      </form>
    </main>
  );
}
