import { useRef } from "react";
import { PLACEHOLDER_COLORS, CANVAS_DPI, PRINT_SCALE } from "../lib/constants";
import { arrowBtnStyle, DROP_INDICATOR_STYLE } from "../lib/styles";
import { assessPhoto, minPixelsFor, DPI_GOOD } from "../lib/printQuality";
import { isOn } from "../../lib/flags";
import { useI18n } from "../../i18n/I18nProvider";

const QUALITY_COLORS = { good: "var(--go)", low: "var(--warn)", poor: "var(--danger)" };

// Sidebar row for a non-text layer (image placeholders: fit mode,
// upload/replace/remove). Collapsed it shows only the type and name; the
// actions appear once the row is selected.
export default function LayerRow({ layer, phState, isFirst, isLast, isSelected, dropPosition, onSelect, onUpload, onRemove, onFitMode, onMoveUp, onMoveDown, onDragStart, onDragOver, onDrop, onDragEnd }) {
  const { t } = useI18n();
  const isPlaceholder = !!layer.placeholder;
  // Zone colors come from constants.js (the same values as the --zone-* tokens,
  // because they are also drawn on the canvas, where CSS variables are unavailable).
  const color   = isPlaceholder ? (PLACEHOLDER_COLORS[layer.placeholder.type] || "var(--ink-subtle)") : "var(--line-strong)";
  const fileRef = useRef();

  // How sharp the uploaded photo will print in this zone, recomputed whenever
  // the photo or fit/fill changes.
  const photo = phState?.userImage;
  const quality = isOn("F-print-quality") && isPlaceholder && photo
    ? (() => {
        const args = {
          imageWidth: photo.naturalWidth, imageHeight: photo.naturalHeight,
          zoneWidth: layer.bounds.width, zoneHeight: layer.bounds.height,
          fitMode: phState.fitMode, canvasDpi: CANVAS_DPI, printScale: PRINT_SCALE,
        };
        const result = assessPhoto(args);
        return result && { ...result, needs: minPixelsFor({ ...args, targetDpi: DPI_GOOD }) };
      })()
    : null;

  const fitBtn = (mode) => ({
    flex: 1, padding: "3px 0", fontSize: "var(--fs-10)",
    fontWeight: phState?.fitMode === mode ? 700 : 400,
    background: phState?.fitMode === mode ? color : "transparent",
    color:      phState?.fitMode === mode ? "var(--on-accent)" : "var(--ink-subtle)",
    border:     `1px solid ${phState?.fitMode === mode ? color : "var(--line-strong)"}`,
    borderRadius: "var(--r-sm)", cursor: "pointer", fontFamily: "var(--font-sans)",
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
          border: `1px solid ${isSelected ? color : "var(--line)"}`,
          borderRadius: "var(--r-md)", padding: "8px 10px", marginBottom: 6,
          background: isSelected ? "var(--surface-raised)" : "var(--surface-sunken)",
          cursor: "grab", userSelect: "none", opacity: layer.visible ? 1 : 0.4,
        }}
      >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: isPlaceholder && isSelected ? 6 : 0 }}>
        {isPlaceholder ? (
          <div style={{ background: color, color: "var(--on-accent)", fontSize: "var(--fs-10)", fontWeight: 700, padding: "1px 5px", borderRadius: "var(--r-sm)", letterSpacing: "0.05em", flexShrink: 0 }}>
            {t(`type.${layer.placeholder.type}`)}
          </div>
        ) : (
          <div style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: layer.imagePath ? "var(--line-strong)" : "var(--surface-hover)", border: "1px solid var(--line-strong)" }} />
        )}
        <div style={{ color: isPlaceholder ? "var(--ink-body)" : "var(--ink-subtle)", fontSize: "var(--fs-12)", fontWeight: isPlaceholder ? 500 : 400, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {isPlaceholder ? layer.placeholder.rawId : layer.name}
        </div>
        {isSelected && (
          <>
            <div style={{ color: "var(--ink-faint)", fontSize: "var(--fs-10)", fontFamily: "var(--font-mono)", flexShrink: 0 }}>z{layer.zIndex}</div>
            <div style={{ display: "flex", gap: 2 }} onClick={(e) => e.stopPropagation()}>
              <button style={arrowBtnStyle(isFirst)} aria-label={t("layer.moveUp")} onClick={() => !isFirst && onMoveUp(layer.name)}>↑</button>
              <button style={arrowBtnStyle(isLast)}  aria-label={t("layer.moveDown")} onClick={() => !isLast  && onMoveDown(layer.name)}>↓</button>
            </div>
          </>
        )}
      </div>

      {isPlaceholder && isSelected && (
        <>
          <div style={{ color: "var(--ink-subtle)", fontSize: "var(--fs-10)", marginBottom: 6 }}>{t("layer.size", { w: layer.bounds.width, h: layer.bounds.height })}</div>
          <div style={{ display: "flex", gap: 3, marginBottom: 6 }} onClick={(e) => e.stopPropagation()}>
            <button style={fitBtn("fit")}  onClick={() => onFitMode(layer.placeholder.id, "fit")}>{t("layer.fit")}</button>
            <button style={fitBtn("fill")} onClick={() => onFitMode(layer.placeholder.id, "fill")}>{t("layer.fill")}</button>
          </div>
          <div style={{ display: "flex", gap: 4 }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => fileRef.current?.click()}
              style={{ flex: 1, padding: "5px 0", background: phState?.userImage ? "var(--go-bg)" : "var(--surface-hover)", color: phState?.userImage ? "var(--go)" : "var(--ink-muted)", border: `1px dashed ${phState?.userImage ? "var(--go)" : "var(--line-strong)"}`, borderRadius: "var(--r-md)", fontSize: "var(--fs-11)", cursor: "pointer", fontFamily: "var(--font-sans)" }}
            >
              {phState?.userImage ? t("layer.replace") : t("layer.upload")}
            </button>
            {phState?.userImage && (
              <button aria-label={t("layer.remove")} onClick={() => onRemove(layer.placeholder.id)}
                style={{ padding: "5px 10px", background: "var(--danger-bg)", color: "var(--danger)", border: "1px dashed var(--danger-line)", borderRadius: "var(--r-md)", fontSize: "var(--fs-11)", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                ✕
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(layer.placeholder.id, f); e.target.value = ""; }} />
          {quality && (
            <div data-testid="print-quality" style={{ marginTop: 6, fontSize: "var(--fs-10)", lineHeight: 1.4, color: QUALITY_COLORS[quality.level] }}>
              {t("quality.dpi", { dpi: quality.dpi, label: t(`quality.${quality.level}`) })}
              {quality.level !== "good" && ` ${t("quality.need", { w: quality.needs.width, h: quality.needs.height })}`}
            </div>
          )}
          {phState?.previewUrl && (
            <img src={phState.previewUrl} alt={t("layer.preview")} style={{ width: "100%", height: 50, objectFit: "cover", borderRadius: "var(--r-sm)", marginTop: 6, display: "block" }} />
          )}
        </>
      )}
      </div>
      {dropPosition === "below" && <div style={DROP_INDICATOR_STYLE} />}
    </>
  );
}
