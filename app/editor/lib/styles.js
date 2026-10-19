// Style helpers shared between the sidebar row components.

export function arrowBtnStyle(disabled) {
  return {
    width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center",
    background: "transparent", border: `1px solid ${disabled ? "var(--line-faint)" : "var(--line-strong)"}`,
    borderRadius: "var(--r-sm)", cursor: disabled ? "default" : "pointer",
    color: disabled ? "var(--ink-faint)" : "var(--ink-subtle)", fontSize: "var(--fs-11)", fontFamily: "var(--font-sans)", flexShrink: 0,
  };
}

// Thick line shown between sidebar rows to mark where a dragged layer will land.
export const DROP_INDICATOR_STYLE = {
  height: 3, margin: "3px 0", background: "var(--surface-raised)", borderRadius: "var(--r-sm)",
  boxShadow: "0 0 6px rgba(255,255,255,0.7)", pointerEvents: "none",
};
