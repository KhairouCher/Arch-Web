import AdminShell from "../components/AdminShell";
import { getTemplates } from "../lib/templates";
import AdminTemplatesClient from "./AdminTemplatesClient";

// Internal template-management view: what is on disk (conversion timestamp, asset
// counts, size, raw JSON link) plus review (Plan P-5.13) and the fast path
// (P-5.24). Reads public/templates/ directly off disk, so it never goes stale.
//
// NOTE: the admin-only gate (components/AdminOnly.jsx) is a demo: the role
// comes from the mock sign-in in the browser, so it protects nothing. Real
// roles and protected admin routes come with task T-010.
export default function AdminPage() {
  const templates = getTemplates().map((t) => ({
    id: t.id, source: t.source, convertedAt: t.convertedAt, width: t.width, height: t.height,
    photoCount: t.photos.length, textCount: t.texts.length, layerCount: t.layerCount, clipCount: t.clipCount, sizeBytes: t.sizeBytes,
  }));
  return (
    <AdminShell active="templates">
      <AdminTemplatesClient templates={templates} />
    </AdminShell>
  );
}
