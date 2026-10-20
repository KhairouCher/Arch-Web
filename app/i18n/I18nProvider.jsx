"use client";

import { createContext, useContext, useMemo } from "react";
import { dirOf } from "./config";
import { makeFmt, makeT } from "./translate";

const I18nContext = createContext(null);

// Gives client components the language, its text direction, the translation
// function and the formatters. The root layout reads the language from the
// cookie on the server and passes the matching messages in, so the first render
// is already in the right language and direction.
export function I18nProvider({ lang, messages, children }) {
  const value = useMemo(() => {
    const t = makeT(lang, messages);
    return { lang, dir: dirOf(lang), t, fmt: makeFmt(lang, t) };
  }, [lang, messages]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n needs the I18nProvider (app/layout.js).");
  return ctx;
}
