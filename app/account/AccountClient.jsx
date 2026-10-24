"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppBar from "../components/AppBar";
import LanguageSwitcher from "../i18n/LanguageSwitcher";
import { UI } from "../lib/ui";
import { useSession } from "../lib/useSession";
import { mockSignOut } from "../lib/mockAuth";
import { deleteAccount, listPurchases } from "../lib/mockStore";
import { listDrafts } from "../lib/mockDrafts";
import { useI18n } from "../i18n/I18nProvider";
import { errorText } from "../lib/errorText";

// The account page (Plan P-5.1): who you are, whether the email is confirmed, the
// language, and deleting the account. Deleting removes the drafts, photos,
// purchases and receipts; the points history stays, without personal details.
export default function AccountClient() {
  const router = useRouter();
  const { ready, user, balance } = useSession();
  const { t, fmt } = useI18n();
  const [typed, setTyped] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);
  if (!ready || !user) return null;

  const drafts = listDrafts(user.id).length;
  const models = listPurchases(user.id).length;
  const matches = typed.trim().toLowerCase() === user.email;

  function remove() {
    try {
      deleteAccount(user.id);
      mockSignOut();
      router.push("/");
    } catch (e) {
      setError(errorText(e, t));
    }
  }

  return (
    <div style={UI.page}>
      <AppBar active="account" />
      <main style={UI.main}>
        <h1 style={UI.h1}>{t("account.title")}</h1>
        <p style={UI.sub}>{t("account.sub")}</p>

        <section style={{ ...UI.card, display: "grid", gap: 10, maxWidth: 560 }}>
          <div style={UI.row}><span style={{ ...UI.small, width: 120 }}>{t("field.name")}</span><b style={{ color: "var(--ink)" }}>{user.name || "—"}</b></div>
          <div style={UI.row}><span style={{ ...UI.small, width: 120 }}>{t("field.email")}</span><b style={{ color: "var(--ink)" }}>{user.email}</b></div>
          <div style={UI.row}>
            <span style={{ ...UI.small, width: 120 }}>{t("account.emailStatus")}</span>
            {user.verified
              ? <span style={UI.badge("go")}>{t("account.confirmed")}</span>
              : <><span style={UI.badge("warn")}>{t("account.notConfirmed")}</span><Link href="/verify" style={UI.btnSoft}>{t("account.confirmNow")}</Link></>}
          </div>
          <div style={UI.row}><span style={{ ...UI.small, width: 120 }}>{t("nav.language")}</span><LanguageSwitcher /></div>
          <div style={UI.row}><span style={{ ...UI.small, width: 120 }}>{t("dash.balance")}</span><b style={{ color: "var(--ink)" }}>{fmt.points(balance)}</b></div>
        </section>

        <h2 style={UI.h2}>{t("account.deleteTitle")}</h2>
        <section style={{ ...UI.card, display: "grid", gap: 12, maxWidth: 560, borderColor: "var(--danger-line)" }}>
          <p style={{ margin: 0 }}>{t("account.deleteText")}</p>
          <ul style={{ margin: 0, paddingInlineStart: 20, color: "var(--ink-muted)", fontSize: "var(--fs-13)", lineHeight: 1.6 }}>
            <li>{t("account.deleteGoes", { drafts, models })}</li>
            <li>{t("account.deleteStays")}</li>
          </ul>
          <label style={UI.label}>{t("account.typeEmail", { email: user.email })}
            <input style={UI.field} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          </label>
          {error && <div style={UI.notice("danger")}>{error}</div>}
          <div>
            <button type="button" disabled={!matches} style={{ ...UI.btnSolid, background: "var(--danger)", ...(matches ? null : UI.btnDisabled) }} onClick={remove}>{t("account.deleteButton")}</button>
          </div>
        </section>
      </main>
    </div>
  );
}
