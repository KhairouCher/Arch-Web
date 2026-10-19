"use client";

import { useState } from "react";
import { UI } from "../../lib/ui";
import { useSession } from "../../lib/useSession";
import { addJob, expectedSecondsForNewJob, formatDuration, listJobs, setJobStatus } from "../../lib/mockStore";
import { formatDate } from "../../lib/format";

const STATUS_BADGE = { queued: "accent", running: "warn", done: "go", failed: "danger" };

// A PSD waits here until the cloud converter gets to it. The expected finish is
// the work already queued plus about 15 minutes for the new file. Demo: nothing
// converts for real, the buttons only change a job's status.
export default function AdminQueueClient() {
  const { user } = useSession();
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
      <h1 style={UI.h1}>Conversion queue</h1>
      <p style={UI.sub}>Uploaded PSDs wait here for the converter. Each model takes about 15 minutes.</p>

      <form onSubmit={submit} style={{ ...UI.card, display: "grid", gap: 12, maxWidth: 520 }}>
        <label style={UI.label}>Upload a PSD (demo: enter a file name)
          <input style={UI.field} value={file} onChange={(e) => setFile(e.target.value)} placeholder="14.psd" />
        </label>
        <div style={UI.notice("accent")}>A file uploaded now is expected to finish in about <b>{formatDuration(wait)}</b>.</div>
        <div><button type="submit" style={UI.btnSolid}>Add to the queue</button></div>
      </form>

      <h2 style={UI.h2}>Jobs</h2>
      <div style={UI.tableWrap}>
        <table style={UI.table}>
          <thead><tr>{["Job", "File", "Status", "Queued", "Estimate", ""].map((h) => <th key={h} style={UI.th}>{h}</th>)}</tr></thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id}>
                <td style={{ ...UI.td, ...UI.mono }}>{j.id}</td>
                <td style={UI.td}>{j.source}</td>
                <td style={UI.td}><span style={UI.badge(STATUS_BADGE[j.status])}>{j.status}</span></td>
                <td style={UI.td}>{formatDate(j.queuedAt)}</td>
                <td style={UI.td}>{formatDuration(j.estimatedSeconds)}</td>
                <td style={UI.td}>
                  {(j.status === "queued" || j.status === "running") && (
                    <span style={UI.row}>
                      <button style={UI.btnSoft} onClick={() => setJobStatus(j.id, "done")}>Mark done</button>
                      <button style={UI.btnGhost} onClick={() => setJobStatus(j.id, "failed")}>Mark failed</button>
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
