// A store error shown in the current language: errors carry a code (and
// parameters), and the messages have a key err.<code>. Falls back to the English
// message for anything without a code.
export function errorText(e, t) {
  return e && e.code ? t(`err.${e.code}`, e.params) : (e && e.message) || "";
}
