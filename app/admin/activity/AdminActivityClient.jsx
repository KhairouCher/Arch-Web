"use client";

import { UI } from "../../lib/ui";
import { useSession } from "../../lib/useSession";
import { getUserRecord, listAudit, listReceipts, resendReceipt } from "../../lib/mockStore";
import { useI18n } from "../../i18n/I18nProvider";

// What admins did apart from points (the audit log, append only), and the emails
// the platform sent about points (so a receipt that never arrived can be sent
// again). Backend Model classes AuditEvent and EmailReceipt. The mock sends nothing.
export default function AdminActivityClient() {
  const { user: admin } = useSession();
  const { t, fmt } = useI18n();
  const audit = listAudit().slice(0, 50);
  const receipts = listReceipts().slice(0, 50);
  const who = (id) => { const r = getUserRecord(id); return r?.deletedAt ? t("admin.deletedUser") : r?.email || id; };

  return (
    <main style={UI.main}>
      <h1 style={UI.h1}>{t("adminA.title")}</h1>
      <p style={UI.sub}>{t("adminA.sub")}</p>

      <h2 style={UI.h2}>{t("adminA.auditTitle")}</h2>
      {audit.length === 0 ? (
        <p style={UI.muted}>{t("adminA.auditNone")}</p>
      ) : (
        <div style={UI.tableWrap}>
          <table style={UI.table}>
            <thead><tr>{["col.date", "adminP.colUser", "adminA.colAction", "adminA.colTarget", "adminA.colDetail"].map((h) => <th key={h} style={UI.th}>{t(h)}</th>)}</tr></thead>
            <tbody>
              {audit.map((a) => (
                <tr key={a.id}>
                  <td style={UI.td}>{fmt.date(a.createdAt)}</td>
                  <td style={UI.td}>{who(a.actorId)}</td>
                  <td style={UI.td}>{t(`audit.${a.action}`)}</td>
                  <td style={{ ...UI.td, ...UI.mono }}>{a.targetType} · {a.targetId}</td>
                  <td style={UI.td}>{a.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 style={UI.h2}>{t("adminA.receiptsTitle")}</h2>
      {receipts.length === 0 ? (
        <p style={UI.muted}>{t("adminA.receiptsNone")}</p>
      ) : (
        <div style={UI.tableWrap}>
          <table style={UI.table}>
            <thead><tr>{["adminA.colSent", "adminA.colTo", "col.type", "adminQ.colStatus", "adminA.colResends", ""].map((h) => <th key={h} style={UI.th}>{h && t(h)}</th>)}</tr></thead>
            <tbody>
              {receipts.map((r) => (
                <tr key={r.id}>
                  <td style={UI.td}>{fmt.date(r.sentAt)}</td>
                  <td style={UI.td}>{who(r.userId)}</td>
                  <td style={UI.td}><span style={UI.badge(r.kind === "topup" ? "go" : "accent")}>{t(`kind.${r.kind}`)}</span></td>
                  <td style={UI.td}><span style={UI.badge(r.status === "sent" ? "go" : "danger")}>{t(`rstatus.${r.status}`)}</span></td>
                  <td style={UI.td}>{r.resends}</td>
                  <td style={UI.td}><button style={UI.btnSoft} onClick={() => resendReceipt(admin.id, r.id)}>{t("adminA.resend")}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
