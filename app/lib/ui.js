// Minimal shared styles for the platform pages (models, wallet, dashboard, admin).
// Built only from the design tokens in app/tokens.css, so when a design arrives
// the restyling happens here and in tokens.css, not page by page.

const field = {
  fontFamily: "var(--font-sans)", fontSize: "var(--fs-13)", padding: "7px 10px",
  background: "var(--surface-raised)", color: "var(--ink-body)",
  border: "1px solid var(--line-strong)", borderRadius: "var(--r-md)", minWidth: 0,
};
const btn = {
  fontFamily: "var(--font-sans)", fontSize: "var(--fs-13)", fontWeight: 600,
  padding: "7px 16px", borderRadius: "var(--r-md)", border: "1px solid transparent", cursor: "pointer",
};

export const UI = {
  page: { minHeight: "100vh", background: "var(--bg)", color: "var(--ink-body)", fontFamily: "var(--font-sans)" },
  main: { maxWidth: "var(--layout-content)", margin: "0 auto", padding: "40px 24px 80px" },
  h1: { fontSize: "var(--fs-30)", fontWeight: 700, color: "var(--ink)", marginBottom: 6 },
  h2: { fontSize: "var(--fs-18)", fontWeight: 600, color: "var(--ink)", margin: "32px 0 12px" },
  sub: { fontSize: "var(--fs-15)", color: "var(--ink-muted)", marginBottom: 24, maxWidth: "70ch" },
  muted: { fontSize: "var(--fs-13)", color: "var(--ink-muted)" },
  small: { fontSize: "var(--fs-12)", color: "var(--ink-subtle)" },
  mono: { fontFamily: "var(--font-mono)", fontSize: "var(--fs-12)" },
  card: { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)", padding: 20 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 20 },
  row: { display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" },
  tableWrap: { overflowX: "auto", border: "1px solid var(--line)", borderRadius: "var(--r-lg)", background: "var(--surface)" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "var(--fs-13)", minWidth: 560 },
  th: {
    textAlign: "start", padding: "10px 14px", fontFamily: "var(--font-mono)", fontSize: "var(--fs-11)",
    letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-subtle)", fontWeight: 500,
    background: "var(--surface-sunken)", borderBottom: "1px solid var(--line)", whiteSpace: "nowrap",
  },
  td: { padding: "10px 14px", borderBottom: "1px solid var(--line-faint)", verticalAlign: "top" },
  field,
  label: { display: "grid", gap: 4, fontSize: "var(--fs-12)", color: "var(--ink-muted)", fontWeight: 500 },
  btnSolid: { ...btn, background: "var(--accent)", color: "var(--on-accent)" },
  btnSoft: { ...btn, background: "var(--accent-bg)", color: "var(--accent-ink)", borderColor: "var(--accent-line)" },
  btnGhost: { ...btn, background: "transparent", color: "var(--ink-muted)", borderColor: "var(--line-strong)", fontWeight: 500 },
  btnDisabled: { opacity: 0.5, cursor: "default" },
  notice: (kind) => ({
    padding: "10px 14px", borderRadius: "var(--r-md)", fontSize: "var(--fs-13)", border: "1px solid",
    background: `var(--${kind}-bg)`, color: `var(--${kind})`, borderColor: `var(--${kind}-line)`,
  }),
  badge: (kind) => ({
    display: "inline-block", fontFamily: "var(--font-mono)", fontSize: "var(--fs-11)", fontWeight: 600,
    textTransform: "uppercase", letterSpacing: "0.06em", padding: "2px 8px", borderRadius: "var(--r-sm)", border: "1px solid",
    background: kind === "accent" ? "var(--accent-bg)" : `var(--${kind}-bg)`,
    color: kind === "accent" ? "var(--accent-ink)" : `var(--${kind})`,
    borderColor: kind === "accent" ? "var(--accent-line)" : `var(--${kind}-line)`,
  }),
};
