import AppBar from "../../components/AppBar";
import AdminTabs from "../../components/AdminTabs";
import AdminOnly from "../../components/AdminOnly";
import { getModels } from "../../lib/models";
import { UI } from "../../lib/ui";
import AdminModelsClient from "./AdminModelsClient";

export default function AdminModelsPage() {
  return (
    <div style={UI.page}>
      <AppBar active="admin" />
      <AdminTabs active="models" />
      <AdminOnly>
        <AdminModelsClient models={getModels()} />
      </AdminOnly>
    </div>
  );
}
