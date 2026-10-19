import { getModels } from "../lib/models";
import DashboardClient from "./DashboardClient";

// The server reads the model files (filesystem access can't live in the client
// component). DashboardClient handles the sign-in check, which needs localStorage.
export default function DashboardPage() {
  return <DashboardClient models={getModels()} />;
}
