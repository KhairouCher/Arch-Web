// Languages of the interface (Plan P-5.11, task T-032). French is the default
// (decided 2026-10-19). Arabic is written right to left and mirrors the whole
// layout: the page's dir attribute is set from the language, and the styles use
// logical properties (start and end) instead of left and right.
export const LANGS = ["fr", "ar", "en"];
export const DEFAULT_LANG = "fr";
export const LANG_COOKIE = "archpresent_lang";

// How each language names itself in the switcher.
export const LANG_NAMES = { fr: "Français", ar: "العربية", en: "English" };

export const isLang = (v) => LANGS.includes(v);
export const dirOf = (lang) => (lang === "ar" ? "rtl" : "ltr");
