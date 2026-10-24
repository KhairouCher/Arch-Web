"use client";

import { useState } from "react";
import { UI } from "../../lib/ui";
import { useSession } from "../../lib/useSession";
import { TIERS, adminSetModel, allModels, createModel, deleteCustomModel, getCustomModel, getTemplateStatus } from "../../lib/mockStore";
import { useI18n } from "../../i18n/I18nProvider";
import { errorText } from "../../lib/errorText";

const emptyPage = () => ({ name: "", template: "" });

// The model manager (Plan P-5.14): the client sets every model's tier and price in
// points, decides which are visible to buyers, and builds a model from pages:
// choose the templates, name each page, put them in order. One name per model and
// per page (no per-language names). A model goes live only when every page's
// template is published. Changes stay in this browser (placeholder).
export default function AdminModelsClient({ models, templates }) {
  const { user: admin } = useSession();
  const { t } = useI18n();
  const [msg, setMsg] = useState(null);       // { kind, text }
  const [editing, setEditing] = useState(null); // { id, name, pages } while a model's pages are open
  const [creating, setCreating] = useState({ name: "", tier: "architect", price: "1000", pages: [emptyPage()] });
  const list = allModels(models);

  const run = (fn, done) => {
    try { fn(); setMsg(done ? { kind: "go", text: done } : null); return true; }
    catch (e) { setMsg({ kind: "danger", text: errorText(e, t) }); return false; }
  };
  const asModel = (m) => ({ id: m.id, name: m.name, tier: m.tier, pricePoints: m.pricePoints, published: m.publishedSetting, pages: m.pages });

  return (
    <main style={UI.main}>
      <h1 style={UI.h1}>{t("adminM.title")}</h1>
      <p style={UI.sub}>{t("adminM.sub")}</p>
      {msg && <div style={{ ...UI.notice(msg.kind), marginBottom: 16 }}>{msg.text}</div>}

      <div style={UI.tableWrap}>
        <table style={UI.table}>
          <thead><tr>{["adminM.colModel", "adminM.colPages", "adminM.colTier", "adminM.colPrice", "adminM.colVisible", ""].map((h) => <th key={h} style={UI.th}>{h && t(h)}</th>)}</tr></thead>
          <tbody>
            {list.map((m) => (
              <tr key={m.id}>
                <td style={UI.td}>
                  <b style={{ color: "var(--ink)" }}>{m.name}</b>
                  <div style={UI.small}>{m.id}{m.fastPath ? ` · ${t("adminM.fastPath")}` : ""}</div>
                </td>
                <td style={UI.td}>{m.pages.map((p) => p.name).join(", ")}</td>
                <td style={UI.td}>
                  <select aria-label={t("adminM.tierOf", { name: m.name })} style={UI.field} value={m.tier} onChange={(e) => run(() => adminSetModel(admin.id, asModel(m), { tier: e.target.value }))}>
                    {TIERS.map((v) => <option key={v} value={v}>{t(`tier.${v}`)}</option>)}
                  </select>
                </td>
                <td style={UI.td}>
                  <input
                    key={m.pricePoints} aria-label={t("adminM.priceOf", { name: m.name })} type="number" min="0" step="100" style={{ ...UI.field, width: 110 }}
                    defaultValue={m.pricePoints}
                    onBlur={(e) => { const v = Math.max(0, parseInt(e.target.value || "0", 10)); if (v !== m.pricePoints) run(() => adminSetModel(admin.id, asModel(m), { pricePoints: v })); }}
                  />
                </td>
                <td style={UI.td}>
                  <label style={{ ...UI.row, cursor: "pointer" }}>
                    <input type="checkbox" checked={m.publishedSetting} onChange={(e) => run(() => adminSetModel(admin.id, asModel(m), { published: e.target.checked }))} />
                    <span style={UI.muted}>{m.publishedSetting ? t("adminM.published") : t("adminM.hidden")}</span>
                  </label>
                  {m.publishedSetting && !m.pagesReady && <div style={{ ...UI.small, color: "var(--warn)" }}>{t("adminM.pagesNotReady")}</div>}
                </td>
                <td style={UI.td}>
                  <span style={UI.row}>
                    <button style={UI.btnSoft} onClick={() => setEditing(editing?.id === m.id ? null : { id: m.id, name: m.name, pages: m.pages.map((p) => ({ ...p })) })}>{t("adminM.editPages")}</button>
                    {getCustomModel(m.id) && (
                      <button style={UI.btnGhost} onClick={() => { if (window.confirm(t("adminM.confirmDelete", { name: m.name }))) run(() => deleteCustomModel(admin.id, m.id), t("adminM.deleted")); }}>{t("draft.delete")}</button>
                    )}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <section style={{ ...UI.card, marginTop: 16, display: "grid", gap: 12, maxWidth: 720 }}>
          <h2 style={{ ...UI.h2, margin: 0 }}>{t("adminM.editing", { name: editing.name })}</h2>
          <label style={UI.label}>{t("adminM.modelName")}
            <input style={UI.field} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
          </label>
          <PagesEditor pages={editing.pages} templates={templates} onChange={(pages) => setEditing({ ...editing, pages })} t={t} />
          <div style={UI.row}>
            <button style={UI.btnSolid} onClick={() => { const m = list.find((x) => x.id === editing.id); if (run(() => adminSetModel(admin.id, asModel(m), { name: editing.name, pages: editing.pages }), t("adminM.saved"))) setEditing(null); }}>{t("adminP.save")}</button>
            <button style={UI.btnGhost} onClick={() => setEditing(null)}>{t("buy.cancel")}</button>
          </div>
        </section>
      )}

      <h2 style={UI.h2}>{t("adminM.createTitle")}</h2>
      <form
        style={{ ...UI.card, display: "grid", gap: 12, maxWidth: 720 }}
        onSubmit={(e) => {
          e.preventDefault();
          if (run(() => createModel(admin.id, { name: creating.name, tier: creating.tier, pricePoints: parseInt(creating.price || "0", 10), pages: creating.pages }), t("adminM.created"))) {
            setCreating({ name: "", tier: "architect", price: "1000", pages: [emptyPage()] });
          }
        }}
      >
        <label style={UI.label}>{t("adminM.modelName")}
          <input style={UI.field} required value={creating.name} onChange={(e) => setCreating({ ...creating, name: e.target.value })} />
        </label>
        <div style={UI.row}>
          <label style={UI.label}>{t("adminM.colTier")}
            <select style={UI.field} value={creating.tier} onChange={(e) => setCreating({ ...creating, tier: e.target.value })}>
              {TIERS.map((v) => <option key={v} value={v}>{t(`tier.${v}`)}</option>)}
            </select>
          </label>
          <label style={UI.label}>{t("adminM.colPrice")}
            <input style={{ ...UI.field, width: 120 }} type="number" min="0" step="100" value={creating.price} onChange={(e) => setCreating({ ...creating, price: e.target.value })} />
          </label>
        </div>
        <PagesEditor pages={creating.pages} templates={templates} onChange={(pages) => setCreating({ ...creating, pages })} t={t} />
        <div><button type="submit" style={UI.btnSolid}>{t("adminM.create")}</button></div>
        <p style={UI.small}>{t("adminM.createNote")}</p>
      </form>
      <p style={{ ...UI.small, marginTop: 12 }}>{t("adminM.note")}</p>
    </main>
  );
}

// The pages of a model: a name and a template each, in order.
function PagesEditor({ pages, templates, onChange, t }) {
  const set = (i, patch) => onChange(pages.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const move = (i, d) => { const j = i + d; if (j < 0 || j >= pages.length) return; const next = [...pages]; [next[i], next[j]] = [next[j], next[i]]; onChange(next); };
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <span style={UI.label}>{t("adminM.pagesLabel")}</span>
      {pages.map((p, i) => (
        <div key={i} style={UI.row}>
          <span style={{ ...UI.mono, width: 22 }}>{i + 1}</span>
          <input aria-label={t("adminM.pageName", { n: i + 1 })} style={{ ...UI.field, width: 180 }} placeholder={t("adminM.pageName", { n: i + 1 })} value={p.name} onChange={(e) => set(i, { name: e.target.value })} />
          <select aria-label={t("adminM.pageTemplate", { n: i + 1 })} style={UI.field} value={p.template} onChange={(e) => set(i, { template: e.target.value })}>
            <option value="">{t("adminM.chooseTemplate")}</option>
            {templates.map((tp) => {
              const st = getTemplateStatus(tp.id);
              return <option key={tp.id} value={tp.id}>{tp.id}{st !== "published" ? ` (${t(`tstatus.${st}`)})` : ""}</option>;
            })}
          </select>
          <button type="button" style={UI.btnGhost} aria-label={t("layer.moveUp")} onClick={() => move(i, -1)}>↑</button>
          <button type="button" style={UI.btnGhost} aria-label={t("layer.moveDown")} onClick={() => move(i, 1)}>↓</button>
          <button type="button" style={UI.btnGhost} aria-label={t("adminM.removePage")} disabled={pages.length === 1} onClick={() => onChange(pages.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}
      <div><button type="button" style={UI.btnSoft} onClick={() => onChange([...pages, emptyPage()])}>{t("adminM.addPage")}</button></div>
    </div>
  );
}
