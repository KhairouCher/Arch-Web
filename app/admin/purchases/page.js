import AdminShell from "../../components/AdminShell";
import AdminPurchasesClient from "./AdminPurchasesClient";

export default function AdminPurchasesPage() {
  return (
    <AdminShell active="purchases">
      <AdminPurchasesClient />
    </AdminShell>
  );
}
