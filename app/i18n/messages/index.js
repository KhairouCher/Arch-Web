import { DEFAULT_LANG } from "../config";
import en from "./en";
import fr from "./fr";
import ar from "./ar";

const ALL = { fr, ar, en };

export const getMessages = (lang) => ALL[lang] || ALL[DEFAULT_LANG];
