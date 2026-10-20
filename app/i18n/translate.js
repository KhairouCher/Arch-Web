// The translation function and the number, price and date formatters, shared by
// server and client code. Messages are flat objects (key -> text) per language.
//
//   t("wallet.title")                         plain text
//   t("dashboard.welcome", { name: "Amina" }) text with {name} filled in
//   t("models.pages", { count: 3 })           plural: looks up "models.pages.few"
//                                             (Arabic has zero, one, two, few, many,
//                                             other; French and English one, other)
//                                             and falls back to ".other"
//
// A missing key shows the key itself, so a gap is visible rather than blank.
import { dirOf } from "./config.js";

export function makeT(lang, messages) {
  const rules = new Intl.PluralRules(lang);
  return function t(key, params) {
    let text = messages[key];
    if (text === undefined && params && typeof params.count === "number") {
      text = messages[`${key}.${rules.select(params.count)}`] ?? messages[`${key}.other`];
    }
    if (text === undefined) return key;
    if (!params) return text;
    return text.replace(/\{(\w+)\}/g, (m, name) => (params[name] !== undefined ? String(params[name]) : m));
  };
}

// Western digits (0-9) in all three languages, as used in Algeria. Only the
// grouping and the date wording change with the language.
const NUM_LOCALE = { fr: "fr-FR", ar: "en-US", en: "en-GB" };  // Arabic: Western digits with comma grouping (ar-DZ groups with a dot, which reads as a decimal point)
const DATE_LOCALE = { fr: "fr-FR", ar: "ar-DZ-u-nu-latn", en: "en-GB" };

export function makeFmt(lang, t) {
  const number = (n) => Number(n).toLocaleString(NUM_LOCALE[lang] || "en-GB");
  return {
    number,
    points: (n) => `${number(n)} ${t("unit.points")}`,
    // Prices in DA always carry .00 and no thousands separator (Plan: 12000.00 DA).
    da: (n) => `${Number(n).toFixed(2)} ${t("unit.da")}`,
    day: (iso) => {
      try {
        return new Date(iso).toLocaleDateString(DATE_LOCALE[lang] || "en-GB", { day: "2-digit", month: "short", year: "numeric" });
      } catch {
        return iso;
      }
    },
    date: (iso) => {
      try {
        return new Date(iso).toLocaleString(DATE_LOCALE[lang] || "en-GB", {
          day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
        });
      } catch {
        return iso;
      }
    },
    duration: (seconds) => {
      const h = Math.floor(seconds / 3600), m = Math.round((seconds % 3600) / 60);
      return h ? t("unit.hoursMinutes", { h, m }) : t("unit.minutes", { m });
    },
  };
}

export { dirOf };
