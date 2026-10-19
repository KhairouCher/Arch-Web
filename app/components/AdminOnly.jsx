"use client";

import Link from "next/link";
import { UI } from "../lib/ui";
import { useSession } from "../lib/useSession";

// Shows the admin pages only to an admin. Demo gate: the role comes from the
// mock sign-in (lib/mockAuth.js), so it protects nothing. Real roles and
// protected routes come with task T-010.
export default function AdminOnly({ children }) {
  const { ready, user } = useSession();
  if (!ready) return null;
  if (user?.role === "admin") return children;
  return (
    <main style={UI.main}>
      <div style={UI.notice("warn")}>
        {user
          ? "These pages are for admins. Sign out and sign in again with an email that starts with admin (demo only) to see them."
          : "Sign in as an admin to see these pages. Demo only: an email that starts with admin signs in as an admin."}
      </div>
      <p style={{ marginTop: 16 }}><Link href="/login" style={UI.btnSoft}>Go to sign in</Link></p>
    </main>
  );
}
