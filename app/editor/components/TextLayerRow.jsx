import { PLACEHOLDER_COLORS, AVAILABLE_FONTS } from "../lib/constants";
import { arrowBtnStyle, DROP_INDICATOR_STYLE } from "../lib/styles";

// Sidebar controls for a text placeholder — content, font, size, style,
// color, alignment. Box position/size are set on the canvas itself, not
// here (see page.jsx's handleCanvasMouseDown/MouseMove).
export default function TextLayerRow({ layer, txtState, isFirst, isLast, isSelected, dropPosition, onSelect, onTextChange, onMoveUp, onMoveDown, onDragStart, onDragOver, onDrop, onDragEnd }) {
  const color = PLACEHOLDER_COLORS.TEXT;

  const styleBtn = (active) => ({
    padding: "2px 8px", fontSize: "var(--fs-11)", background: active ? color : "transparent",
    color: active ? "var(--on-accent)" : "var(--ink-subtle)", border: `1px solid ${active ? color : "var(--line-strong)"}`,
    borderRadius: "var(--r-sm)", cursor: "pointer", fontFamily: "var(--font-sans)",
  });

  const alignBtn = (a) => ({
    flex: 1, padding: "3px 0", fontSize: "var(--fs-10)",
    background: txtState?.alignment === a ? color : "transparent",
    color:      txtState?.alignment === a ? "var(--on-accent)" : "var(--ink-subtle)",
    border:     `1px solid ${txtState?.alignment === a ? color : "var(--line-strong)"}`,
    borderRadius: "var(--r-sm)", cursor: "pointer", fontFamily: "var(--font-sans)",
  });

  const inputStyle = {
    width: "100%", background: "var(--bg)", color: "var(--ink-body)",
    border: "1px solid var(--line-strong)", borderRadius: "var(--r-sm)", padding: "4px 6px",
    fontSize: "var(--fs-11)", fontFamily: "var(--font-sans)", boxSizing: "border-box",
    outline: "none",
  };

  return (
    <>
      {dropPosition === "above" && <div style={DROP_INDICATOR_STYLE} />}
      <div
        draggable
        onDragStart={(e) => onDragStart(e, layer.name)}
        onDragOver={(e) => onDragOver(e, layer.name)}
        onDrop={(e) => onDrop(e, layer.name)}
        onDragEnd={onDragEnd}
        onClick={onSelect}
        style={{
          border: `1px solid ${isSelected ? color : "var(--line)"}`,
          borderRadius: "var(--r-md)", padding: "8px 10px", marginBottom: 6,
          background: isSelected ? "var(--surface-raised)" : "var(--surface-sunken)",
          cursor: "grab", userSelect: "none",
        }}
      >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: isSelected ? 8 : 0 }}>
        <div style={{ background: color, color: "var(--on-accent)", fontSize: "var(--fs-10)", fontWeight: 700, padding: "1px 5px", borderRadius: "var(--r-sm)", letterSpacing: "0.05em", flexShrink: 0 }}>
          TEXT
        </div>
        <div style={{ color: "var(--ink-body)", fontSize: "var(--fs-12)", fontWeight: 500, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {layer.placeholder.rawId}
        </div>
        {isSelected && (
          <>
            <div style={{ color: "var(--ink-faint)", fontSize: "var(--fs-10)", fontFamily: "var(--font-mono)", flexShrink: 0 }}>z{layer.zIndex}</div>
            <div style={{ display: "flex", gap: 2 }} onClick={(e) => e.stopPropagation()}>
              <button style={arrowBtnStyle(isFirst)} onClick={() => !isFirst && onMoveUp(layer.name)}>↑</button>
              <button style={arrowBtnStyle(isLast)}  onClick={() => !isLast  && onMoveDown(layer.name)}>↓</button>
            </div>
          </>
        )}
      </div>

      {isSelected && (
      <div onClick={(e) => e.stopPropagation()}>
        {/* Text content */}
        <textarea
          value={txtState?.content || ""}
          onChange={(e) => onTextChange(layer.placeholder.id, { content: e.target.value })}
          placeholder="Enter text..."
          dir="auto"
          rows={2}
          style={{ ...inputStyle, resize: "vertical", marginBottom: 6 }}
        />

        {/* Font family */}
        <select
          value={txtState?.font || "Arial"}
          onChange={(e) => onTextChange(layer.placeholder.id, { font: e.target.value })}
          style={{ ...inputStyle, marginBottom: 6 }}
        >
          {AVAILABLE_FONTS.map((f) => (
            <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
          ))}
        </select>

        {/* Size + Bold + Italic */}
        <div style={{ display: "flex", gap: 4, marginBottom: 6, alignItems: "center" }}>
          <input
            type="number" min="8" max="500"
            value={txtState?.size || 48}
            onChange={(e) => onTextChange(layer.placeholder.id, { size: parseInt(e.target.value) || 48 })}
            style={{ ...inputStyle, width: 60, flexShrink: 0 }}
          />
          <span style={{ color: "var(--ink-subtle)", fontSize: "var(--fs-10)", flexShrink: 0 }}>px</span>
          <button style={styleBtn(txtState?.bold)}   onClick={() => onTextChange(layer.placeholder.id, { bold: !txtState?.bold })}>B</button>
          <button style={{ ...styleBtn(txtState?.italic), fontStyle: "italic" }} onClick={() => onTextChange(layer.placeholder.id, { italic: !txtState?.italic })}>I</button>
        </div>

        {/* Color */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <span style={{ color: "var(--ink-subtle)", fontSize: "var(--fs-10)" }}>Color</span>
          <input
            type="color"
            value={txtState?.color || "#000000"}
            onChange={(e) => onTextChange(layer.placeholder.id, { color: e.target.value })}
            style={{ width: 32, height: 24, border: "1px solid var(--line-strong)", borderRadius: "var(--r-sm)", cursor: "pointer", background: "none", padding: 0 }}
          />
          <span style={{ color: "var(--ink-subtle)", fontSize: "var(--fs-10)" }}>{txtState?.color || "#000000"}</span>
        </div>

        {/* Alignment */}
        <div style={{ display: "flex", gap: 3 }}>
          <button style={alignBtn("left")}   onClick={() => onTextChange(layer.placeholder.id, { alignment: "left" })}>Left</button>
          <button style={alignBtn("center")} onClick={() => onTextChange(layer.placeholder.id, { alignment: "center" })}>Center</button>
          <button style={alignBtn("right")}  onClick={() => onTextChange(layer.placeholder.id, { alignment: "right" })}>Right</button>
        </div>

        <div style={{ color: "var(--ink-faint)", fontSize: "var(--fs-10)", marginTop: 6 }}>
          Click text on canvas to select it, then drag it to reposition or drag the handle on its right edge to resize
        </div>
      </div>
      )}
      </div>
      {dropPosition === "below" && <div style={DROP_INDICATOR_STYLE} />}
    </>
  );
}
