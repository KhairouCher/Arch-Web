"use client";

import { UI } from "../../lib/ui";
import { useSession } from "../../lib/useSession";
import { effectiveModel, setModelOverride } from "../../lib/mockStore";
import { TIER_LABELS } from "../../lib/format";

// The client sets every model's tier and price (in points) and decides which
// are visible to buyers. Changes are kept in this browser only (placeholder).
export default function AdminModelsClient({ models }) {
  useSession(); // re-render when stored settings change
  const list = models.map(effectiveModel);

  return (
    <main style={UI.main}>
      <h1 style={UI.h1}>Models</h1>
      <p style={UI.sub}>Set the tier and the price in points of each model, and choose which ones buyers can see.</p>
      <div style={UI.tableWrap}>
        <table style={UI.table}>
          <thead><tr>{["Model", "Pages", "Tier", "Price (points)", "Visible"].map((h) => <th key={h} style={UI.th}>{h}</th>)}</tr></thead>
          <tbody>
            {list.map((m) => (
              <tr key={m.id}>
                <td style={UI.td}>
                  <b style={{ color: "var(--ink)" }}>{m.name}</b>
                  <div style={UI.small}>{m.id}</div>
                </td>
                <td style={UI.td}>{m.pages.map((p) => p.name).join(", ")}</td>
                <td style={UI.td}>
                  <select aria-label={`Tier of ${m.name}`} style={UI.field} value={m.tier} onChange={(e) => setModelOverride(m.id, { tier: e.target.value })}>
                    {Object.entries(TIER_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </td>
                <td style={UI.td}>
                  <input
                    aria-label={`Price of ${m.name}`} type="number" min="0" step="100" style={{ ...UI.field, width: 110 }}
                    value={m.pricePoints}
                    onChange={(e) => setModelOverride(m.id, { pricePoints: Math.max(0, parseInt(e.target.value || "0", 10)) })}
                  />
                </td>
                <td style={UI.td}>
                  <label style={{ ...UI.row, cursor: "pointer" }}>
                    <input type="checkbox" checked={m.published} onChange={(e) => setModelOverride(m.id, { published: e.target.checked })} />
                    <span style={UI.muted}>{m.published ? "Published" : "Hidden"}</span>
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ ...UI.small, marginTop: 12 }}>
        A model can go live only when every page&apos;s template is published. That check comes with the backend (T-020).
      </p>
    </main>
  );
}
