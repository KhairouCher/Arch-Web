# ArchPresent — web editor

The client-facing part of ArchPresent: a browser-based editor for turning
architecture Photoshop presentation templates into ones a non-designer can
fill in — swap photos, edit text, reorder layers — and export as a
full-resolution PNG/JPG.

This is a Next.js 16 (App Router) app. Templates themselves are produced by
the separate PSD-to-web pipeline in [`../scripts`](../scripts) — see that
repo's README for how a `.psd` becomes the `template.json` + image assets
this app reads.

## Running it

```bash
npm install
npm run dev
```

Open [http://localhost:3000/editor](http://localhost:3000/editor). Pick a
template with `?template=<name>` (matches a folder under
`public/templates/`); defaults to `template`.

## How it works

- `app/editor/page.jsx` — the main editor component: state, the canvas
  render loop, and all mouse/drag interaction handling.
- `app/editor/components/` — the three presentational pieces used by the
  editor: `TextLayerRow` and `LayerRow` (sidebar rows), `PlaceholderOverlay`
  (the canvas label shown on empty photo slots).
- `app/editor/lib/canvas.js` — pure canvas/geometry helpers (word-wrap,
  image-fit math, mask contour tracing for the dashed selection border).
  No React, no component state — safe to reason about or test in isolation.
- `app/editor/lib/constants.js`, `lib/styles.js` — shared config and style
  helpers.

**Template data shape** (`public/templates/<name>/template.json`): a flat
list of `layers` (each with bounds, z-index, and optional `imagePath` /
`clipPath` / `shadowPath`), plus a `placeholders` array describing which
layers are user-editable (`PHOTO` / `PLAN` / `MODEL` / `LOGO` / `TEXT`) and
what mask/shadow assets back them. See `scripts/psd-to-json.py`'s docstring
for exactly how this gets generated from a PSD's layer names.

**Rendering**: everything is drawn to a single `<canvas>` in `renderCanvas()`
— layers, shadows, placeholder masks (with a tinted overlay + dashed
outline when empty), and text. It recomposites the whole scene on every
edit, throttled via `scheduleRender()` (coalesces bursts — e.g. every
mousemove during a drag — into one repaint per tick). Export re-runs the
same function at full PSD resolution instead of the capped preview width.

## Known gaps (prototype stage)

No persistence — state lives only in memory and is lost on refresh. No
auth. See the git history / commit messages for what's been fixed already;
nothing further is planned here until the client review has happened and
scope for the next phase is set.

## Updating this README

Update this file when the editor's structure changes in a way that would
mislead someone reading it — new top-level files/folders, a changed data
shape, a changed rendering approach. Not required for every commit, just
ones that change how the pieces fit together.
