import AppBar from "./AppBar";
import AdminTabs from "./AdminTabs";
import AdminOnly from "./AdminOnly";
import { UI } from "../lib/ui";

// The frame every admin page shares: the app bar, the tab row, and the admin-only
// gate (a demo gate, see AdminOnly). `active` is the tab to highlight.
export default function AdminShell({ active, children }) {
  return (
    <div style={UI.page}>
      <AppBar active="admin" />
      <AdminTabs active={active} />
      <AdminOnly>{children}</AdminOnly>
    </div>
  );
}
