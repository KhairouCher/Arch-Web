"use client";

import { useEffect, useState } from "react";
import { UI } from "../../lib/ui";
import { useI18n } from "../../i18n/I18nProvider";
import { fractionOf, remainingSeconds } from "../lib/exportProgress";

// Shown while an export runs: which stage, a bar, and the expected time left.
// progress = { stage, done, total, startedAt, finishedAt, format, expectedMs }. The export
// blocks the page while it renders, so the bar moves between stages rather than
// within them; the time left comes from the speed of the last exports.
export default function ExportProgress({ progress }) {
  const { t, fmt } = useI18n();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const { stage, done, total, startedAt, finishedAt, format, expectedMs } = progress;
  const fraction = fractionOf(stage, done, total);
  const left = remainingSeconds({ elapsedMs: now - startedAt, fraction, expectedMs });
  const pct = Math.round(fraction * 100);
  const seconds = (s) => (s >= 60 ? fmt.duration(s) : t("unit.seconds", { s }));

  return (
    <div style={S.backdrop}>
      <div style={S.modal} role="dialog" aria-live="polite" aria-label={t("export.title")}>
        <h2 style={S.title}>{stage === "done" ? t("export.done") : t("export.title")}</h2>
        <p style={UI.muted}>
          {stage === "loading" && t("export.loading", { done, total })}
          {stage === "rendering" && t("export.rendering")}
          {stage === "encoding" && t("export.encoding", { format: String(format).toUpperCase() })}
          {stage === "done" && t("export.doneText")}
        </p>

        <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} style={S.track}>
          <div style={{ ...S.fill, width: `${pct}%` }} />
        </div>
        <div style={S.row}>
          <span>{pct}%</span>
          <span style={UI.muted}>
            {stage === "done"
              ? seconds(Math.max(1, Math.round(((finishedAt ?? now) - startedAt) / 1000)))
              : left === null ? t("export.estimating") : t("export.left", { time: seconds(left) })}
          </span>
        </div>
        {stage !== "done" && <p style={{ ...UI.small, marginTop: 12 }}>{t("export.note")}</p>}
      </div>
    </div>
  );
}

const S = {
  backdrop: {
    position: "fixed", inset: 0, background: "var(--scrim)", zIndex: 110,
    display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
  },
  modal: {
    width: "100%", maxWidth: 420, background: "var(--surface-raised)", border: "1px solid var(--line)",
    borderRadius: "var(--r-lg)", padding: "24px 26px", fontFamily: "var(--font-sans)", color: "var(--ink-body)",
  },
  title: { fontSize: "var(--fs-18)", fontWeight: 700, color: "var(--ink)", marginBottom: 6 },
  track: { height: 10, borderRadius: 999, background: "var(--surface-hover)", overflow: "hidden", marginTop: 16 },
  fill: { height: "100%", background: "var(--accent)", transition: "width 0.3s ease", borderRadius: 999 },
  row: { display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: "var(--fs-13)", fontFamily: "var(--font-mono)" },
};
