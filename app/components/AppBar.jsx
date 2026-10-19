"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { UI } from "../lib/ui";
import { mockSignOut } from "../lib/mockAuth";
import { useSession } from "../lib/useSession";
import { formatPoints } from "../lib/format";

// Top bar for the signed-in platform pages: where you are, your balance, sign out.
export default function AppBar({ active }) {
  const router = useRouter();
  const { ready, user, balance } = useSession();

  const link = (href, label, key) => (
    <Link key={key} href={href} style={{ ...S.link, ...(active === key ? S.linkOn : null) }}>{label}</Link>
  );

  return (
    <div style={S.bar}>
      <Link href="/" style={S.brand}>ArchPresent</Link>
      <nav style={S.nav}>
        {link("/models", "Models", "models")}
        {user && link("/dashboard", "Dashboard", "dashboard")}
        {user && link("/wallet", "Wallet", "wallet")}
        {user?.role === "admin" && link("/admin", "Admin", "admin")}
      </nav>
      <span style={{ flex: 1 }} />
      {ready && user && (
        <>
          <Link href="/wallet" style={UI.badge("go")}>{formatPoints(balance)}</Link>
          <span style={UI.muted}>{user.email}</span>
          <button style={UI.btnGhost} onClick={() => { mockSignOut(); router.push("/login"); }}>Sign out</button>
        </>
      )}
      {ready && !user && <Link href="/login" style={UI.btnSoft}>Sign in</Link>}
    </div>
  );
}

const S = {
  bar: {
    display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", minHeight: "var(--layout-topbar)",
    padding: "8px 24px", background: "var(--surface)", borderBottom: "1px solid var(--line)",
  },
  brand: { fontSize: "var(--fs-15)", fontWeight: 700, color: "var(--ink)" },
  nav: { display: "flex", gap: 18 },
  link: { fontSize: "var(--fs-14)", color: "var(--ink-muted)" },
  linkOn: { color: "var(--ink)", fontWeight: 600 },
};
