"use client";

import { UI } from "../../lib/ui";
import { useSession } from "../../lib/useSession";
import { getUserRecord, listAllPurchases } from "../../lib/mockStore";
import { useI18n } from "../../i18n/I18nProvider";

// Every purchase, newest first (Plan P-5.8: "the purchase is listed for the
// client"). Who bought which model, for how many points, and when.
export default function AdminPurchasesClient() {
  useSession(); // re-render when stored data changes
  const { t, fmt } = useI18n();
  const purchases = listAllPurchases();
  const who = (id) => { const r = getUserRecord(id); return r?.deletedAt ? t("admin.deletedUser") : r?.email || id; };
  const total = purchases.reduce((s, p) => s + p.pointsSpent, 0);

  return (
    <main style={UI.main}>
      <h1 style={UI.h1}>{t("adminS.title")}</h1>
      <p style={UI.sub}>{t("adminS.sub")}</p>
      {purchases.length === 0 ? (
        <p style={UI.muted}>{t("adminS.none")}</p>
      ) : (
        <>
          <p style={{ ...UI.muted, marginBottom: 12 }}>{t("adminS.summary", { count: purchases.length, points: fmt.points(total) })}</p>
          <div style={UI.tableWrap}>
            <table style={UI.table}>
              <thead><tr>{["col.date", "adminS.colBuyer", "dash.colModel", "col.points"].map((h) => <th key={h} style={UI.th}>{t(h)}</th>)}</tr></thead>
              <tbody>
                {purchases.map((p) => (
                  <tr key={p.id}>
                    <td style={UI.td}>{fmt.date(p.createdAt)}</td>
                    <td style={UI.td}>{who(p.userId)}</td>
                    <td style={UI.td}><b style={{ color: "var(--ink)" }}>{p.modelName}</b></td>
                    <td style={{ ...UI.td, fontWeight: 600 }}>{fmt.number(p.pointsSpent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
