import AdminShell from "../../components/AdminShell";
import AdminBundlesClient from "./AdminBundlesClient";

export default function AdminBundlesPage() {
  return (
    <AdminShell active="bundles">
      <AdminBundlesClient />
    </AdminShell>
  );
}
