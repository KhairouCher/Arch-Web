import Link from "next/link";
import { UI } from "../../lib/ui";
import { formatPoints } from "../../lib/format";

// Review and buy a model with points. Replaces the earlier mock payment dialog.
// The buyer must have seen every page (the review step) before Buy is enabled.
// Buying removes the watermark and unlocks the full-resolution export.
// No card details are collected: payment happens when the client adds points
// to the account (see the wallet page).
export default function BuyModal({ model, pages, visited, user, balance, error, onGoToPage, onBuy, onCancel }) {
  const price = model.pricePoints;
  const unseen = pages.map((p, i) => ({ ...p, i })).filter((p) => !visited.has(p.i));
  const enough = balance >= price;
  const canBuy = !!user && unseen.length === 0 && enough;

  return (
    <div style={S.backdrop} onClick={onCancel}>
      <div style={S.modal} role="dialog" aria-label="Buy this model" onClick={(e) => e.stopPropagation()}>
        <h2 style={S.title}>Buy {model.name}</h2>
        <p style={S.sub}>
          Buying removes the watermark and lets you download every page at full resolution, as many times as you like.
        </p>

        <div style={S.sectionLabel}>Review every page first</div>
        <div style={{ display: "grid", gap: 6, marginBottom: 14 }}>
          {pages.map((p, i) => (
            <div key={i} style={S.pageRow}>
              <span style={{ color: visited.has(i) ? "var(--go)" : "var(--ink-faint)", width: 16 }}>{visited.has(i) ? "✓" : "○"}</span>
              <span style={{ flex: 1, color: "var(--ink-body)" }}>{p.name}</span>
              {!visited.has(i) && <button type="button" style={{ ...UI.btnGhost, padding: "2px 10px" }} onClick={() => onGoToPage(i)}>Go to page</button>}
            </div>
          ))}
        </div>

        <div style={S.row}><span>Price</span><span>{formatPoints(price)}</span></div>
        <div style={S.row}><span>Your balance</span><span>{user ? formatPoints(balance) : "Not signed in"}</span></div>
        <div style={{ ...S.row, ...S.total }}>
          <span>Balance after buying</span>
          <span>{user && enough ? formatPoints(balance - price) : "—"}</span>
        </div>

        {!user && (
          <div style={{ ...UI.notice("warn"), marginTop: 14 }}>
            Sign in to buy. <Link href="/login" style={{ textDecoration: "underline" }}>Go to sign in</Link>
          </div>
        )}
        {user && !enough && (
          <div style={{ ...UI.notice("danger"), marginTop: 14 }}>
            You need {formatPoints(price - balance)} more. <Link href="/wallet" style={{ textDecoration: "underline" }}>Top up in the wallet</Link>
          </div>
        )}
        {unseen.length > 0 && (
          <div style={{ ...UI.notice("accent"), marginTop: 14 }}>
            Look at {unseen.length === 1 ? "the remaining page" : `the ${unseen.length} remaining pages`} before you buy.
          </div>
        )}

        {error && <div style={{ ...UI.notice("danger"), marginTop: 14 }}>{error}</div>}

        <button type="button" disabled={!canBuy} style={{ ...UI.btnSolid, width: "100%", marginTop: 18, padding: "11px 0", ...(canBuy ? null : UI.btnDisabled) }} onClick={onBuy}>
          Buy for {formatPoints(price)}
        </button>
        <button type="button" style={{ ...UI.btnGhost, width: "100%", marginTop: 8, padding: "10px 0" }} onClick={onCancel}>
          Cancel
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
