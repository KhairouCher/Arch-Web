import AppBar from "../../components/AppBar";
import AdminTabs from "../../components/AdminTabs";
import AdminOnly from "../../components/AdminOnly";
import { UI } from "../../lib/ui";
import AdminPointsClient from "./AdminPointsClient";

export default function AdminPointsPage() {
  return (
    <div style={UI.page}>
      <AppBar active="admin" />
      <AdminTabs active="points" />
      <AdminOnly>
        <AdminPointsClient />
      </AdminOnly>
    </div>
  );
}
