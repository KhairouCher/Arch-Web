"use client";

import { useState } from "react";
import { UI } from "../../lib/ui";
import { useSession } from "../../lib/useSession";
import { balanceOf, listActiveUsers, setUserDisabled, setUserRole } from "../../lib/mockStore";
import { useI18n } from "../../i18n/I18nProvider";
import { errorText } from "../../lib/errorText";

// The user manager (Plan P-5.15): every account, its role, whether the email is
// confirmed, and a switch to turn an account off. Designers join later (P-5.17).
// Deleted accounts are not listed: only their points history remains, anonymous.
export default function AdminUsersClient() {
  const { user: admin } = useSession();
  const { t, fmt } = useI18n();
  const [msg, setMsg] = useState(null);
  const users = listActiveUsers();

  const run = (fn) => {
    try { fn(); setMsg(null); } catch (e) { setMsg({ kind: "danger", text: errorText(e, t) }); }
  };

  return (
    <main style={UI.main}>
      <h1 style={UI.h1}>{t("adminU.title")}</h1>
      <p style={UI.sub}>{t("adminU.sub")}</p>
      {msg && <div style={{ ...UI.notice(msg.kind), marginBottom: 16 }}>{msg.text}</div>}
      <div style={UI.tableWrap}>
        <table style={UI.table}>
          <thead><tr>{["adminP.colUser", "adminP.colEmail", "adminP.colRole", "adminU.colConfirmed", "adminP.colBalance", "adminQ.colStatus", ""].map((h) => <th key={h} style={UI.th}>{h && t(h)}</th>)}</tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={UI.td}><b style={{ color: "var(--ink)" }}>{u.name || "—"}</b></td>
                <td style={UI.td}>{u.email}</td>
                <td style={UI.td}>
                  <select aria-label={t("adminU.roleOf", { name: u.email })} style={UI.field} value={u.role} onChange={(e) => run(() => setUserRole(admin.id, u.id, e.target.value))}>
                    <option value="buyer">{t("role.buyer")}</option>
                    <option value="admin">{t("role.admin")}</option>
                  </select>
                </td>
                <td style={UI.td}><span style={UI.badge(u.verified !== false ? "go" : "warn")}>{u.verified !== false ? t("adminU.yes") : t("adminU.no")}</span></td>
                <td style={{ ...UI.td, fontWeight: 600 }}>{fmt.points(balanceOf(u.id))}</td>
                <td style={UI.td}><span style={UI.badge(u.disabled ? "danger" : "go")}>{u.disabled ? t("adminU.off") : t("adminU.active")}</span></td>
                <td style={UI.td}>
                  {u.id !== admin?.id && (
                    <button style={u.disabled ? UI.btnSoft : UI.btnGhost} onClick={() => run(() => setUserDisabled(admin.id, u.id, !u.disabled))}>
                      {u.disabled ? t("adminU.enable") : t("adminU.disable")}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ ...UI.small, marginTop: 12 }}>{t("adminU.note")}</p>
    </main>
  );
}
