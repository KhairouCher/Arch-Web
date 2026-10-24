import AdminShell from "../../components/AdminShell";
import AdminActivityClient from "./AdminActivityClient";

export default function AdminActivityPage() {
  return (
    <AdminShell active="activity">
      <AdminActivityClient />
    </AdminShell>
  );
}
