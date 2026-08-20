// Style helpers shared between the sidebar row components.

export function arrowBtnStyle(disabled) {
  return {
    width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center",
    background: "transparent", border: `1px solid ${disabled ? "#222" : "#444"}`,
    borderRadius: 3, cursor: disabled ? "default" : "pointer",
    color: disabled ? "#333" : "#777", fontSize: 11, fontFamily: "system-ui, sans-serif", flexShrink: 0,
  };
}

// Thick line shown between sidebar rows to mark where a dragged layer will land.
export const DROP_INDICATOR_STYLE = {
  height: 3, margin: "3px 0", background: "#fff", borderRadius: 2,
  boxShadow: "0 0 6px rgba(255,255,255,0.7)", pointerEvents: "none",
};
