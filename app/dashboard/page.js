import { getTemplates } from "../lib/templates";
import DashboardClient from "./DashboardClient";

// Server component fetches the template list (filesystem access, so it
// can't live in the client component); DashboardClient handles the
// mock-auth check/redirect and sign-out, which need localStorage.
export default function DashboardPage() {
  const templates = getTemplates();
  return <DashboardClient templates={templates} />;
}
