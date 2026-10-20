"use client";

import { UI } from "../../lib/ui";
import { useSession } from "../../lib/useSession";
import { effectiveModel, setModelOverride } from "../../lib/mockStore";
import { useI18n } from "../../i18n/I18nProvider";

// The client sets every model's tier and price (in points) and decides which
// are visible to buyers. Changes are kept in this browser only (placeholder).
export default function AdminModelsClient({ models }) {
  useSession(); // re-render when stored settings change
  const { t } = useI18n();
  const list = models.map(effectiveModel);

  return (
    <main style={UI.main}>
      <h1 style={UI.h1}>{t("adminM.title")}</h1>
      <p style={UI.sub}>{t("adminM.sub")}</p>
      <div style={UI.tableWrap}>
        <table style={UI.table}>
          <thead><tr>{["adminM.colModel", "adminM.colPages", "adminM.colTier", "adminM.colPrice", "adminM.colVisible"].map((h) => <th key={h} style={UI.th}>{t(h)}</th>)}</tr></thead>
          <tbody>
            {list.map((m) => (
              <tr key={m.id}>
                <td style={UI.td}>
                  <b style={{ color: "var(--ink)" }}>{m.name}</b>
                  <div style={UI.small}>{m.id}</div>
                </td>
                <td style={UI.td}>{m.pages.map((p) => p.name).join(", ")}</td>
                <td style={UI.td}>
                  <select aria-label={t("adminM.tierOf", { name: m.name })} style={UI.field} value={m.tier} onChange={(e) => setModelOverride(m.id, { tier: e.target.value })}>
                    {["student", "architect", "bureau"].map((v) => <option key={v} value={v}>{t(`tier.${v}`)}</option>)}
                  </select>
                </td>
                <td style={UI.td}>
                  <input
                    aria-label={t("adminM.priceOf", { name: m.name })} type="number" min="0" step="100" style={{ ...UI.field, width: 110 }}
                    value={m.pricePoints}
                    onChange={(e) => setModelOverride(m.id, { pricePoints: Math.max(0, parseInt(e.target.value || "0", 10)) })}
                  />
                </td>
                <td style={UI.td}>
                  <label style={{ ...UI.row, cursor: "pointer" }}>
                    <input type="checkbox" checked={m.published} onChange={(e) => setModelOverride(m.id, { published: e.target.checked })} />
                    <span style={UI.muted}>{m.published ? t("adminM.published") : t("adminM.hidden")}</span>
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ ...UI.small, marginTop: 12 }}>
        {t("adminM.note")}
      </p>
    </main>
  );
}
