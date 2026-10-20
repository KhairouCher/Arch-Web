// How a points-history row's reason reads in the current language. Rows made by
// the system (a purchase, the demo top-up) carry a reasonKey and its parameters
// and are translated; rows an admin typed keep their own text.
export function ledgerReason(entry, t) {
  return entry.reasonKey ? t(entry.reasonKey, entry.reasonParams) : entry.reason;
}
