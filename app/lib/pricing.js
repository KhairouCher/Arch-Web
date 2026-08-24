// Shared, server-safe pricing constant — no "use client" needed since this
// doesn't touch the browser. Both server components (template listing
// pages) and the client-side checkout code (app/lib/mockPayment.js,
// app/editor/components/PaywallModal.jsx) import from here, so the price
// only lives in one place.
//
// Flat placeholder price applied to every template — one fixed amount
// unlocks one template for unlimited use after purchase. Real pricing
// (per-template, tiered, etc.) is a product decision for later.
export const TEMPLATE_PRICE_USD = 29;
