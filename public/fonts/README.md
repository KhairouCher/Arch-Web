# Bundled fonts

Open-licensed (SIL Open Font License 1.1, text in `OFL.txt`) fonts from
[Google Fonts](https://github.com/google/fonts), so text looks the same on every
machine and the server export can use the same files. Declared in `app/fonts.css`
and listed for the editor in `app/editor/lib/constants.js` (`AVAILABLE_FONTS`).

| Font | Style | Covers |
|---|---|---|
| Inter | clean sans, variable weight | Latin |
| Montserrat | geometric sans, variable weight | Latin |
| Barlow Condensed | condensed sans, regular and bold | Latin |
| Playfair Display | high-contrast serif, variable weight | Latin |
| Cormorant Garamond | light display serif, variable weight | Latin |
| Cairo | modern sans, variable weight | Arabic and Latin |
| Amiri | classic naskh serif, regular and bold | Arabic and Latin |

Italic is drawn by the browser (slanted) where the family has no italic file.
