// Number and date formatting for the platform pages. Client-side only values
// (balances, ledger dates), so locale differences cannot cause a server/client
// mismatch. Prices in DA are always shown with .00.
export const formatPoints = (n) => `${Number(n).toLocaleString("en-US")} pts`;
export const formatDa = (n) => `${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DA`;
export const formatDate = (iso) => {
  try {
    return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
};
export const TIER_LABELS = { student: "Student", architect: "Architect", bureau: "Bureau" };
