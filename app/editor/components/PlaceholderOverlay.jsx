import { PLACEHOLDER_COLORS } from "../lib/constants";
import { useI18n } from "../../i18n/I18nProvider";

// Purely a visual label — pointer-events: none. Clicking to upload is
// handled by the canvas itself (handleCanvasClick in page.jsx), which
// hit-tests the mask's actual opaque pixels rather than this bounding
// rectangle, so only the real visible shape is clickable, not the full
// rect around it.
export default function PlaceholderOverlay({ placeholder, scale }) {
  const { t } = useI18n();
  if (placeholder.type === "TEXT" || placeholder.userImage) return null;
  const color = PLACEHOLDER_COLORS[placeholder.type] || "#6b7280";
  return (
    <div
      style={{
        position: "absolute", direction: "ltr", // the canvas is not mirrored, so these physical offsets stay left/top
        left:   placeholder.bounds.x * scale,
        top:    placeholder.bounds.y * scale,
        width:  placeholder.bounds.width  * scale,
        height: placeholder.bounds.height * scale,
        boxSizing: "border-box",
        display: "flex", alignItems: "center", justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <span style={{
        background: color, color: "var(--on-accent)",
        fontSize: Math.max(10, 13 * scale), fontFamily: "var(--font-sans)",
        fontWeight: 600, padding: `${2 * scale}px ${6 * scale}px`,
        borderRadius: "var(--r-md)", whiteSpace: "nowrap", opacity: 0.9,
      }}>
        + {t(`ph.${placeholder.type}`)}: {placeholder.rawId}
      </span>
    </div>
  );
}
