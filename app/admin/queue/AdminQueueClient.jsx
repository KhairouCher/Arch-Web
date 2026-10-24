"use client";

import { useState } from "react";
import { UI } from "../../lib/ui";
import { useSession } from "../../lib/useSession";
import { addJob, expectedSecondsForNewJob, listJobs, setJobStatus } from "../../lib/mockStore";
import { useI18n } from "../../i18n/I18nProvider";

const STATUS_BADGE = { queued: "accent", running: "warn", done: "go", failed: "danger" };

// A PSD waits here until the cloud converter gets to it. The expected finish is
// the work already queued plus about 15 minutes for the new file. Demo: nothing
// converts for real, the buttons only change a job's status.
export default function AdminQueueClient() {
  const { user } = useSession();
  const { t, fmt } = useI18n();
  const [file, setFile] = useState("");
  const jobs = listJobs();
  const wait = expectedSecondsForNewJob();

  function submit(e) {
    e.preventDefault();
    if (!file.trim()) return;
    addJob(file.trim(), user.id);
    setFile("");
  }

  return (
    <main style={UI.main}>
      <h1 style={UI.h1}>{t("adminQ.title")}</h1>
      <p style={UI.sub}>{t("adminQ.sub")}</p>

      <form onSubmit={submit} style={{ ...UI.card, display: "grid", gap: 12, maxWidth: 520 }}>
        <label style={UI.label}>{t("adminQ.upload")}
          <input style={UI.field} value={file} onChange={(e) => setFile(e.target.value)} placeholder="14.psd" />
        </label>
        <div style={UI.notice("accent")}>{t("adminQ.notice", { duration: fmt.duration(wait) })}</div>
        <div><button type="submit" style={UI.btnSolid}>{t("adminQ.add")}</button></div>
      </form>

      <h2 style={UI.h2}>{t("adminQ.jobs")}</h2>
      <div style={UI.tableWrap}>
        <table style={UI.table}>
          <thead><tr>{["adminQ.colJob", "adminQ.colFile", "adminQ.colStatus", "adminQ.colQueued", "adminQ.colEstimate", ""].map((h) => <th key={h} style={UI.th}>{h && t(h)}</th>)}</tr></thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id}>
                <td style={{ ...UI.td, ...UI.mono }}>{j.id}</td>
                <td style={UI.td}>{j.source}</td>
                <td style={UI.td}><span style={UI.badge(STATUS_BADGE[j.status])}>{t(`status.${j.status}`)}</span>{j.errorKey && <div style={{ ...UI.small, color: "var(--danger)", marginTop: 4, maxWidth: 320 }}>{t(j.errorKey)}</div>}</td>
                <td style={UI.td}>{fmt.date(j.queuedAt)}</td>
                <td style={UI.td}>{fmt.duration(j.estimatedSeconds)}</td>
                <td style={UI.td}>
                  {(j.status === "queued" || j.status === "running") && (
                    <span style={UI.row}>
                      <button style={UI.btnSoft} onClick={() => setJobStatus(j.id, "done")}>{t("adminQ.markDone")}</button>
                      <button style={UI.btnGhost} onClick={() => setJobStatus(j.id, "failed")}>{t("adminQ.markFailed")}</button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
