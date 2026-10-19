import AppBar from "../../components/AppBar";
import AdminTabs from "../../components/AdminTabs";
import AdminOnly from "../../components/AdminOnly";
import { UI } from "../../lib/ui";
import AdminQueueClient from "./AdminQueueClient";

export default function AdminQueuePage() {
  return (
    <div style={UI.page}>
      <AppBar active="admin" />
      <AdminTabs active="queue" />
      <AdminOnly>
        <AdminQueueClient />
      </AdminOnly>
    </div>
  );
}
