"use client";

import { useRouter } from "next/navigation";
import { LANGS, LANG_COOKIE, LANG_NAMES } from "./config";
import { useI18n } from "./I18nProvider";

// Kept outside the component: it writes to the browser, not to React state.
function saveLang(lang) {
  document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
}

// Three small buttons: French, Arabic, English. The choice is a cookie (a year),
// so the server renders the right language and direction on the next request.
export default function LanguageSwitcher() {
  const router = useRouter();
  const { lang, t } = useI18n();

  function choose(next) {
    if (next === lang) return;
    saveLang(next);
    router.refresh();
  }

  return (
    <div role="group" aria-label={t("nav.language")} style={S.group}>
      {LANGS.map((l) => (
        <button
          key={l} type="button" lang={l} onClick={() => choose(l)} aria-pressed={l === lang}
          style={{ ...S.btn, ...(l === lang ? S.on : null) }}
        >
          {LANG_NAMES[l]}
        </button>
      ))}
    </div>
  );
}

const S = {
  group: { display: "inline-flex", border: "1px solid var(--line-strong)", borderRadius: "var(--r-md)", overflow: "hidden", flexShrink: 0 },
  btn: {
    fontFamily: "var(--font-sans)", fontSize: "var(--fs-12)", padding: "5px 10px", cursor: "pointer",
    background: "transparent", color: "var(--ink-muted)", border: "none", borderInlineStart: "1px solid var(--line)",
  },
  on: { background: "var(--accent-bg)", color: "var(--accent-ink)", fontWeight: 600 },
};
