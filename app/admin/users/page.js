import AdminShell from "../../components/AdminShell";
import AdminUsersClient from "./AdminUsersClient";

export default function AdminUsersPage() {
  return (
    <AdminShell active="users">
      <AdminUsersClient />
    </AdminShell>
  );
}
