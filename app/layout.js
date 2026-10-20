import { Geist, Geist_Mono } from "next/font/google";
import "./tokens.css";
import "./fonts.css";
import "./globals.css";
import { I18nProvider } from "./i18n/I18nProvider";
import { dirOf } from "./i18n/config";
import { getLang } from "./i18n/server";
import { getMessages } from "./i18n/messages";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "ArchPresent",
  description: "Convert Photoshop presentation templates into web-editable templates — swap photos and text, then export in full resolution.",
};

// The language comes from the cookie the switcher sets (French by default). The
// html element carries it with the text direction, so Arabic mirrors the whole
// page. Reading the cookie makes every page render per request.
export default async function RootLayout({ children }) {
  const lang = await getLang();
  return (
    <html lang={lang} dir={dirOf(lang)} className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <I18nProvider lang={lang} messages={getMessages(lang)}>{children}</I18nProvider>
      </body>
    </html>
  );
}
