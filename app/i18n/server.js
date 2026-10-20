import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LANG, LANG_COOKIE, dirOf, isLang } from "./config";
import { getMessages } from "./messages";
import { makeFmt, makeT } from "./translate";

// The language for this request, from the cookie the switcher sets.
export async function getLang() {
  const store = await cookies();
  const v = store.get(LANG_COOKIE)?.value;
  return isLang(v) ? v : DEFAULT_LANG;
}

// For server components: const { t, lang, dir, fmt } = await getI18n();
export async function getI18n() {
  const lang = await getLang();
  const t = makeT(lang, getMessages(lang));
  return { lang, dir: dirOf(lang), t, fmt: makeFmt(lang, t) };
}
