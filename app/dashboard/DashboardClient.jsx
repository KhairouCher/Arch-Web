"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUser, mockSignOut } from "../lib/mockAuth";
import { TEMPLATE_PRICE_USD } from "../lib/pricing";

export default function DashboardClient({ templates }) {
  const router = useRouter();
  const [user, setUser] = useState(undefined); // undefined = not checked yet

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.replace("/login");
      return;
    }
    // localStorage doesn't exist during SSR, so this can only be read
    // after mount — both the server render and the client's initial
    // (pre-hydration) render use the `undefined` state above, then this
    // effect syncs in the real value. Deliberate exception to
    // set-state-in-effect: skipping the effect here (e.g. reading
    // localStorage directly during render) would make the client's first
    // render disagree with the server's and trigger a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(u);
  }, [router]);

  function handleSignOut() {
    mockSignOut();
    router.push("/login");
  }

  // Still checking localStorage, or about to redirect — render nothing
  // rather than flashing dashboard content to a signed-out visitor.
  if (!user) return null;

  return (
    <div style={S.page}>
      <div style={S.topbar}>
        <span style={S.brand}>ArchPresent</span>
        <div style={S.topbarRight}>
          <span style={S.userEmail}>{user.email}</span>
          <button onClick={handleSignOut} style={S.signOutBtn}>Sign out</button>
        </div>
      </div>

      <main style={S.main}>
        <h1 style={S.h1}>Welcome, {user.name}</h1>
        <p style={S.sub}>Pick a template below to start a new presentation.</p>

        {templates.length === 0 ? (
          <p style={S.empty}>No templates available yet.</p>
        ) : (
          <div style={S.grid}>
            {templates.map((t) => (
              <Link key={t.id} href={`/editor?template=${t.id}`} style={S.card}>
                <div style={S.thumb}>
                  <span style={S.thumbLabel}>{t.width} × {t.height}</span>
                  <span style={S.priceBadge}>${TEMPLATE_PRICE_USD}</span>
                </div>
                <div style={S.cardBody}>
                  <h2 style={S.cardTitle}>{t.id}</h2>
                  <p style={S.cardMeta}>
                    {t.photos.length} photo{t.photos.length === 1 ? "" : "s"} · {t.texts.length} text field{t.texts.length === 1 ? "" : "s"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

const S = {
  page: {
    minHeight: "100vh", background: "#0a0a0a", color: "#e5e5e5",
    fontFamily: "var(--font-geist-sans), system-ui, -apple-system, sans-serif",
  },
  topbar: {
    height: 52, background: "#111", borderBottom: "1px solid #222",
    display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px",
  },
  brand: { fontSize: 15, fontWeight: 700, color: "#fff" },
  topbarRight: { display: "flex", alignItems: "center", gap: 16 },
  userEmail: { fontSize: 13, color: "#999" },
  signOutBtn: {
    padding: "6px 14px", background: "transparent", color: "#e5e5e5",
    border: "1px solid #333", borderRadius: 6, fontSize: 13, cursor: "pointer",
  },
  main: { maxWidth: 1100, margin: "0 auto", padding: "40px 24px 80px" },
  h1: { fontSize: 26, fontWeight: 700, color: "#fff", marginBottom: 6 },
  sub: { fontSize: 14, color: "#999", marginBottom: 32 },
  empty: { fontSize: 14, color: "#999" },
  grid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: 20,
  },
  card: {
    display: "block", background: "#111", border: "1px solid #1e1e1e",
    borderRadius: 10, overflow: "hidden",
  },
  thumb: {
    position: "relative", aspectRatio: "4 / 3",
    background: "linear-gradient(135deg, #1a2a3a, #16161e)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  thumbLabel: { fontSize: 12, color: "#556", fontFamily: "var(--font-geist-mono), monospace" },
  priceBadge: {
    position: "absolute", top: 10, right: 10,
    background: "rgba(10,10,10,0.85)", color: "#4ade80",
    fontSize: 12, fontWeight: 700, padding: "3px 9px", borderRadius: 12,
    border: "1px solid #2d4d2d",
  },
  cardBody: { padding: "14px 16px" },
  cardTitle: { fontSize: 15, fontWeight: 600, color: "#fff", marginBottom: 4 },
  cardMeta: { fontSize: 12, color: "#999" },
};
