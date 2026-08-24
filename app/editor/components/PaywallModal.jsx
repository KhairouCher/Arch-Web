import { TEMPLATE_PRICE_USD } from "../../lib/pricing";

// Checkout UI shown before a template's first export. No card-entry field
// on purpose — see app/lib/mockPayment.js for why. "Pay" here just
// simulates success; a real integration would redirect to a hosted
// checkout (Stripe Checkout, PayPal, etc.) instead of rendering a form.
export default function PaywallModal({ templateId, onPay, onCancel }) {
  return (
    <div style={S.backdrop} onClick={onCancel}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={S.title}>Unlock this template</h2>
        <p style={S.sub}>
          One-time payment unlocks unlimited exports of <strong style={S.strong}>{templateId}</strong>.
        </p>

        <div style={S.summaryRow}>
          <span>Template license — {templateId}</span>
          <span>${TEMPLATE_PRICE_USD}</span>
        </div>
        <div style={{ ...S.summaryRow, ...S.totalRow }}>
          <span>Total</span>
          <span>${TEMPLATE_PRICE_USD}</span>
        </div>

        <button style={S.payBtn} onClick={onPay}>Pay ${TEMPLATE_PRICE_USD}</button>
        <button style={S.cancelBtn} onClick={onCancel}>Cancel</button>

        <p style={S.note}>
          Secure checkout — you&apos;ll be redirected to complete payment. No card details are collected on this page.
        </p>
      </div>
    </div>
  );
}

const S = {
  backdrop: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
  },
  modal: {
    width: "100%", maxWidth: 380, background: "#111", border: "1px solid #1e1e1e",
    borderRadius: 12, padding: "28px 26px", fontFamily: "system-ui, -apple-system, sans-serif",
  },
  title: { fontSize: 19, fontWeight: 700, color: "#fff", marginBottom: 6 },
  sub: { fontSize: 13, color: "#999", lineHeight: 1.5, marginBottom: 20 },
  strong: { color: "#e5e5e5" },
  summaryRow: {
    display: "flex", justifyContent: "space-between", fontSize: 13, color: "#999",
    padding: "8px 0", borderBottom: "1px solid #1e1e1e",
  },
  totalRow: { color: "#fff", fontWeight: 700, fontSize: 14, borderBottom: "none" },
  payBtn: {
    width: "100%", marginTop: 20, padding: "11px 0", background: "#3b82f6",
    color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600,
    cursor: "pointer",
  },
  cancelBtn: {
    width: "100%", marginTop: 8, padding: "10px 0", background: "transparent",
    color: "#999", border: "1px solid #333", borderRadius: 6, fontSize: 13,
    cursor: "pointer",
  },
  note: { fontSize: 11, color: "#555", marginTop: 16, lineHeight: 1.5, textAlign: "center" },
};
