import { useRef } from "react";
import { PLACEHOLDER_COLORS } from "../lib/constants";
import { arrowBtnStyle, DROP_INDICATOR_STYLE } from "../lib/styles";

// Sidebar row for a non-text layer: plain layers (just a name/visibility
// dot) and image placeholders (fit mode, upload/replace/remove).
export default function LayerRow({ layer, phState, isFirst, isLast, isSelected, dropPosition, onSelect, onUpload, onRemove, onFitMode, onMoveUp, onMoveDown, onDragStart, onDragOver, onDrop, onDragEnd }) {
  const isPlaceholder = !!layer.placeholder;
  const color   = isPlaceholder ? (PLACEHOLDER_COLORS[layer.placeholder.type] || "#6b7280") : "#3a3a3a";
  const fileRef = useRef();

  const fitBtn = (mode) => ({
    flex: 1, padding: "3px 0", fontSize: 10,
    fontWeight: phState?.fitMode === mode ? 700 : 400,
    background: phState?.fitMode === mode ? color : "transparent",
    color:      phState?.fitMode === mode ? "#fff" : "#666",
    border:     `1px solid ${phState?.fitMode === mode ? color : "#333"}`,
    borderRadius: 3, cursor: "pointer", fontFamily: "system-ui, sans-serif",
  });

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
          border: `1px solid ${isSelected ? color : "#1e1e1e"}`,
          borderRadius: 6, padding: "8px 10px", marginBottom: 6,
          background: isSelected ? "#161616" : "#0e0e0e",
          cursor: "grab", userSelect: "none", opacity: layer.visible ? 1 : 0.4,
        }}
      >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: isPlaceholder ? 6 : 0 }}>
        {isPlaceholder ? (
          <div style={{ background: color, color: "#fff", fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 2, letterSpacing: "0.05em", flexShrink: 0 }}>
            {layer.placeholder.type}
          </div>
        ) : (
          <div style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: layer.imagePath ? "#3a3a3a" : "#2a2a2a", border: "1px solid #444" }} />
        )}
        <div style={{ color: isPlaceholder ? "#e5e5e5" : "#666", fontSize: 12, fontWeight: isPlaceholder ? 500 : 400, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {isPlaceholder ? layer.placeholder.rawId : layer.name}
        </div>
        <div style={{ color: "#333", fontSize: 10, fontFamily: "monospace", flexShrink: 0 }}>z{layer.zIndex}</div>
        <div style={{ display: "flex", gap: 2 }} onClick={(e) => e.stopPropagation()}>
          <button style={arrowBtnStyle(isFirst)} onClick={() => !isFirst && onMoveUp(layer.name)}>↑</button>
          <button style={arrowBtnStyle(isLast)}  onClick={() => !isLast  && onMoveDown(layer.name)}>↓</button>
        </div>
      </div>

      {isPlaceholder && (
        <>
          <div style={{ color: "#555", fontSize: 10, marginBottom: 6 }}>{layer.bounds.width} × {layer.bounds.height}px</div>
          <div style={{ display: "flex", gap: 3, marginBottom: 6 }} onClick={(e) => e.stopPropagation()}>
            <button style={fitBtn("fit")}  onClick={() => onFitMode(layer.placeholder.id, "fit")}>Fit</button>
            <button style={fitBtn("fill")} onClick={() => onFitMode(layer.placeholder.id, "fill")}>Fill</button>
          </div>
          <div style={{ display: "flex", gap: 4 }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => fileRef.current?.click()}
              style={{ flex: 1, padding: "5px 0", background: phState?.userImage ? "#1d3a1d" : "#1a1a1a", color: phState?.userImage ? "#4ade80" : "#aaa", border: `1px dashed ${phState?.userImage ? "#4ade80" : "#444"}`, borderRadius: 4, fontSize: 11, cursor: "pointer", fontFamily: "system-ui, sans-serif" }}
            >
              {phState?.userImage ? "✓ Replace" : "Upload"}
            </button>
            {phState?.userImage && (
              <button onClick={() => onRemove(layer.placeholder.id)}
                style={{ padding: "5px 10px", background: "#2a0a0a", color: "#f87171", border: "1px dashed #5a1a1a", borderRadius: 4, fontSize: 11, cursor: "pointer", fontFamily: "system-ui, sans-serif" }}>
                ✕
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(layer.placeholder.id, f); e.target.value = ""; }} />
          {phState?.previewUrl && (
            <img src={phState.previewUrl} alt="preview" style={{ width: "100%", height: 50, objectFit: "cover", borderRadius: 3, marginTop: 6, display: "block" }} />
          )}
        </>
      )}
      </div>
      {dropPosition === "below" && <div style={DROP_INDICATOR_STYLE} />}
    </>
  );
}
