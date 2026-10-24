import Link from "next/link";
import { UI } from "../../lib/ui";
import { useI18n } from "../../i18n/I18nProvider";

// Review and buy a model with points. Replaces the earlier mock payment dialog.
// The buyer must have seen every page (the review step) before Buy is enabled.
// Buying removes the watermark and unlocks the full-resolution export.
// No card details are collected: payment happens when the client adds points
// to the account (see the wallet page).
export default function BuyModal({ model, pages, visited, user, balance, error, onGoToPage, onBuy, onCancel }) {
  const { t, fmt } = useI18n();
  const price = model.pricePoints;
  const unseen = pages.map((p, i) => ({ ...p, i })).filter((p) => !visited.has(p.i));
  const enough = balance >= price;
  const confirmed = !!user && user.verified !== false;
  const canBuy = confirmed && unseen.length === 0 && enough;

  return (
    <div style={S.backdrop} onClick={onCancel}>
      <div style={S.modal} role="dialog" aria-label={t("buy.dialog")} onClick={(e) => e.stopPropagation()}>
        <h2 style={S.title}>{t("buy.title", { model: model.name })}</h2>
        <p style={S.sub}>
          {t("buy.sub")}
        </p>

        <div style={S.sectionLabel}>{t("buy.review")}</div>
        <div style={{ display: "grid", gap: 6, marginBottom: 14 }}>
          {pages.map((p, i) => (
            <div key={i} style={S.pageRow}>
              <span style={{ color: visited.has(i) ? "var(--go)" : "var(--ink-faint)", width: 16 }}>{visited.has(i) ? "✓" : "○"}</span>
              <span style={{ flex: 1, color: "var(--ink-body)" }}>{p.name}</span>
              {!visited.has(i) && <button type="button" style={{ ...UI.btnGhost, padding: "2px 10px" }} onClick={() => onGoToPage(i)}>{t("buy.goTo")}</button>}
            </div>
          ))}
        </div>

        <div style={S.row}><span>{t("buy.price")}</span><span>{fmt.points(price)}</span></div>
        <div style={S.row}><span>{t("buy.balance")}</span><span>{user ? fmt.points(balance) : t("buy.notSignedIn")}</span></div>
        <div style={{ ...S.row, ...S.total }}>
          <span>{t("buy.after")}</span>
          <span>{user && enough ? fmt.points(balance - price) : "—"}</span>
        </div>

        {!user && (
          <div style={{ ...UI.notice("warn"), marginTop: 14 }}>
            {t("buy.signInPrompt")} <Link href="/login" style={{ textDecoration: "underline" }}>{t("buy.signInLink")}</Link>
          </div>
        )}
        {user && !confirmed && (
          <div style={{ ...UI.notice("warn"), marginTop: 14 }}>
            {t("buy.unverified")} <Link href="/verify" style={{ textDecoration: "underline" }}>{t("buy.confirmLink")}</Link>
          </div>
        )}
        {user && !enough && (
          <div style={{ ...UI.notice("danger"), marginTop: 14 }}>
            {t("buy.needMore", { points: fmt.points(price - balance) })} <Link href="/wallet" style={{ textDecoration: "underline" }}>{t("buy.topUpLink")}</Link>
          </div>
        )}
        {unseen.length > 0 && (
          <div style={{ ...UI.notice("accent"), marginTop: 14 }}>
            {t("buy.unseen", { count: unseen.length })}
          </div>
        )}

        {error && <div style={{ ...UI.notice("danger"), marginTop: 14 }}>{error}</div>}

        <button type="button" disabled={!canBuy} style={{ ...UI.btnSolid, width: "100%", marginTop: 18, padding: "11px 0", ...(canBuy ? null : UI.btnDisabled) }} onClick={onBuy}>
          {t("buy.confirm", { price: fmt.points(price) })}
        </button>
        <button type="button" style={{ ...UI.btnGhost, width: "100%", marginTop: 8, padding: "10px 0" }} onClick={onCancel}>
          {t("buy.cancel")}
        </button>
      </div>
    </div>
  );
}

const S = {
  backdrop: {
    position: "fixed", inset: 0, background: "var(--scrim)", zIndex: 100,
    display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
  },
  modal: {
    width: "100%", maxWidth: 420, maxHeight: "92vh", overflowY: "auto", background: "var(--surface-raised)",
    border: "1px solid var(--line)", borderRadius: "var(--r-lg)", boxShadow: "var(--shadow-modal)",
    padding: "26px 26px 22px", fontFamily: "var(--font-sans)",
  },
  title: { fontSize: "var(--fs-18)", fontWeight: 700, color: "var(--ink)", marginBottom: 4 },
  sub: { fontSize: "var(--fs-13)", color: "var(--ink-muted)", lineHeight: 1.5, marginBottom: 16 },
  sectionLabel: { fontFamily: "var(--font-mono)", fontSize: "var(--fs-11)", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-subtle)", marginBottom: 8 },
  pageRow: { display: "flex", alignItems: "center", gap: 8, fontSize: "var(--fs-13)" },
  row: { display: "flex", justifyContent: "space-between", fontSize: "var(--fs-13)", color: "var(--ink-muted)", padding: "7px 0", borderBottom: "1px solid var(--line-faint)" },
  total: { color: "var(--ink)", fontWeight: 700, borderBottom: "none" },
};
