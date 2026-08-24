"use client";

// Placeholder client-side "payment" state so the checkout UI has
// something real to demonstrate against.
//
// Deliberately does NOT collect card details anywhere in this app's own
// code. A real integration should hand off to a hosted checkout (Stripe
// Checkout, PayPal, etc.) so raw card data never touches this codebase —
// that's both a security best practice and a PCI-DSS requirement, not
// just caution. This just simulates "payment succeeded" and remembers it
// locally, the same way app/lib/mockAuth.js simulates being signed in.
// Replace entirely once a real payment processor is wired up.

const KEY = "archpresent_purchases";

function readPurchases() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

export function hasPurchased(templateId) {
  return !!readPurchases()[templateId];
}

export function markPurchased(templateId) {
  const purchases = readPurchases();
  purchases[templateId] = true;
  localStorage.setItem(KEY, JSON.stringify(purchases));
}
