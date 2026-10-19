// Site-wide marketing footer — shared by the homepage and the template
// gallery. Not used on /editor.
export default function Footer() {
  return (
    <footer style={S.footer}>
      <span style={S.logo}>ArchPresent</span>
      <span style={S.footerText}>&copy; {new Date().getFullYear()} ArchPresent. All rights reserved.</span>
    </footer>
  );
}

const S = {
  footer: {
    borderTop: "1px solid var(--line)", padding: "28px 24px",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    maxWidth: 1100, margin: "0 auto", flexWrap: "wrap", gap: 12,
  },
  logo: { fontSize: "var(--fs-15)", fontWeight: 700, color: "var(--ink)", letterSpacing: "0.02em" },
  footerText: { fontSize: "var(--fs-13)", color: "var(--ink-subtle)" },
};
