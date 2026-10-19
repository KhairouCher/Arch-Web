# ArchPresent — web app

The buyer-facing part of ArchPresent: a browser editor for turning architecture
Photoshop presentation templates into ones a non-designer can fill in (swap
photos, edit text, reorder layers), plus the pages around it: a gallery of
models, a points wallet, a dashboard and an admin area.

A **model** is a presentation of several pages; each page is a **template**
converted from a PSD. Buyers pay in **points** (topped up by an admin after an
off-platform payment). An unbought model is watermarked; buying it removes the
watermark and unlocks the full-resolution export.

This is a Next.js 16 (App Router) app. Templates are produced by the separate
PSD-to-web pipeline in [`../scripts`](../scripts). The project documents (Plan,
Blueprint, Build Log, History, Style Ledger, Builds, Backend Model) are linked
from [`../docs/project-docs.json`](../docs/project-docs.json).

> **Everything behind the pages is a placeholder.** Sign-in, roles, points,
> purchases, model settings and the conversion queue are kept in the browser's
> `localStorage` (`app/lib/mockAuth.js`, `app/lib/mockStore.js`). None of it is
> secure and none of it is shared between users. The real backend replaces
> those two files (tasks T-007, T-008, T-010, T-026). The class model is drafted
> in `../docs/backend-model.json` and the tables in `db/schema.sql`
> (tested in PGlite, not yet on a real server).

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
npm run lint
node --test app/editor/lib/*.test.mjs    # unit tests
```

Demo sign-in: any email works; an email starting with `admin` signs in as an
admin. `buyer1@example.com` starts with 20,000 points.

## Pages

| Route | What it is |
|---|---|
| `/` | Marketing homepage |
| `/models` | Gallery of models: tier, price in points, page list |
| `/editor?model=<id>` | The editor. `<id>` is a file in `public/models/`. `?template=<name>` still opens a single template as a one-page model |
| `/login`, `/signup` | Mock sign-in |
| `/dashboard` | Balance, models you own, recent points activity |
| `/wallet` | Balance, bundles on offer, how to top up, full history |
| `/admin` | Templates on disk (admin only) |
| `/admin/models` | Set each model's tier, price in points and visibility |
| `/admin/points` | Top up or adjust a buyer's points (append-only history) |
| `/admin/queue` | Conversion queue with the expected finish time (demo) |

## How it is organised

- `app/editor/page.jsx` — the editor: state, the canvas render loop, mouse
  handling, model pages (title, arrows), the buy flow and export.
- `app/editor/components/` — `LayerRow` (photo rows, with the print-quality
  estimate), `TextLayerRow` (both collapse to type and name until selected;
  the list is on the right and shows editable layers only), `PlaceholderOverlay`, `BuyModal` (review every page,
  then buy with points).
- `app/editor/lib/` — `canvas.js` (drawing helpers, watermark, text direction),
  `printQuality.js` (how sharp a photo prints in its zone), `constants.js`,
  `styles.js`. The `*.test.mjs` files test the pure ones.
- `app/lib/` — `mockAuth.js`, `mockStore.js` (users, ledger, purchases, bundles,
  model settings, queue), `useSession.js`, `models.js` (server: lists
  `public/models/*.json`), `templates.js` (server: lists template folders),
  `ui.js` (the shared minimal styles), `format.js`.
- `app/components/` — `Header`, `Footer`, `AppBar` (signed-in bar), `AdminTabs`,
  `AdminOnly` (demo admin gate).
- `app/tokens.css` — the design tokens (colors in light and dark, type, radii,
  spacing, layout). **All styling goes through these.** Light is the main theme;
  dark follows the system. Change or add a token there first; the Style Ledger
  is generated from it (`../docs/build-ledger.mjs`).
- `public/fonts/` and `app/fonts.css` — the bundled open-licensed fonts for text
  layers (Latin and Arabic), so text looks the same everywhere and the server
  export can use the same files. List them in `AVAILABLE_FONTS`
  (`app/editor/lib/constants.js`) when adding one.
- `db/schema.sql` — the draft PostgreSQL schema, including the points ledger and
  its `credit_points` and `spend_points` functions. Tested in PGlite
  (54 checks pass); **not yet run on a real server**, and concurrent spends are
  still untested.
- `public/models/*.json` — models: name, tier, price in points, pages (each page
  names a template folder).

## Template data

`public/templates/<name>/template.json` has `meta` (source file, canvas size,
`schemaVersion`, and `previews` when the small copies exist), `layers` and
`placeholders` (the editable zones). See `../scripts/README.md` for how it is
generated. The folder is not tracked in git.

**Previews**: the editor loads `previews/` (about 1800 px wide, 5 MB per page)
when `meta.previews` is present, and otherwise the full-size files. Export loads
the full-size files on demand, renders at full resolution and releases them, so
loading is fast but export memory is still high until exports render on the
server (T-023).

## Rendering and export

Everything is drawn to one `<canvas>` in `renderCanvas()`, coalesced by
`scheduleRender()`. A watermark is drawn on every model the signed-in user has
not bought. Export re-runs `renderCanvas(true)` at full size.

## Known gaps

No real accounts, saved drafts or payment, and editing state is lost on refresh
until drafts exist (T-022). A purchase allows unlimited exports (Plan Open 5,
answered), so the browser prototype keeps no export count. The Build Log has
the full list.

## Updating this README

Update it when the structure changes in a way that would mislead a reader: new
routes or top-level folders, a changed data shape, a changed rendering or data
approach.
