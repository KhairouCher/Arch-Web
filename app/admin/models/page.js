import AdminShell from "../../components/AdminShell";
import { getModels } from "../../lib/models";
import { getTemplates } from "../../lib/templates";
import AdminModelsClient from "./AdminModelsClient";

export default function AdminModelsPage() {
  return (
    <AdminShell active="models">
      <AdminModelsClient models={getModels()} templates={getTemplates().map((t) => ({ id: t.id, source: t.source }))} />
    </AdminShell>
  );
}
