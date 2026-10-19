"use client";

import Link from "next/link";
import { UI } from "../lib/ui";
import { useSession } from "../lib/useSession";
import { formatPoints } from "../lib/format";

// The account part of the marketing header: "Sign in" when signed out, the
// points balance and a Dashboard link when signed in. The marketing header is a
// server component, and the signed-in user lives in the browser (useSession), so
// this is the small client piece. It shows nothing until the session has loaded,
// which avoids a "Sign in" flash for someone who is already signed in.
export default function HeaderAccount({ linkStyle }) {
  const { ready, user, balance } = useSession();
  if (!ready) return null;
  if (!user) return <Link href="/login" style={linkStyle}>Sign in</Link>;
  return (
    <>
      <Link href="/wallet" style={UI.badge("go")}>{formatPoints(balance)}</Link>
      <Link href="/dashboard" style={linkStyle}>Dashboard</Link>
    </>
  );
}
