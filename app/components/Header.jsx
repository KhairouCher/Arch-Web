import Link from "next/link";

// Site-wide marketing header — shared by the homepage and the template
// gallery. Not used on /editor, which has its own full-screen app chrome.
export default function Header() {
  return (
    <header style={S.header}>
      <div style={S.headerInner}>
        <Link href="/" style={S.logo}>ArchPresent</Link>
        <nav style={S.nav}>
          <Link href="/templates" style={S.navLink}>Templates</Link>
          <Link href="/#features" style={S.navLink}>Features</Link>
          <Link href="/#how-it-works" style={S.navLink}>How it works</Link>
        </nav>
        <div style={S.rightGroup}>
          <Link href="/login" style={S.navLink}>Sign in</Link>
          <Link href="/editor" style={S.navCta}>Open Editor</Link>
        </div>
      </div>
    </header>
  );
}

const S = {
  header: {
    position: "sticky", top: 0, zIndex: 10,
    background: "rgba(10,10,10,0.85)", backdropFilter: "blur(8px)",
    borderBottom: "1px solid #1e1e1e",
  },
  headerInner: {
    maxWidth: 1100, margin: "0 auto", padding: "16px 24px",
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20,
  },
  logo: { fontSize: 16, fontWeight: 700, color: "#fff", letterSpacing: "0.02em" },
  nav: { display: "flex", gap: 28, flex: 1, justifyContent: "center" },
  navLink: { fontSize: 14, color: "#999" },
  rightGroup: { display: "flex", alignItems: "center", gap: 20, flexShrink: 0 },
  navCta: {
    padding: "8px 18px", background: "#1a2a3a", color: "#60a5fa",
    border: "1px solid #1e3a5f", borderRadius: 6, fontSize: 14, fontWeight: 600,
    flexShrink: 0,
  },
};
