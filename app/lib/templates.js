import fs from "fs";
import path from "path";

// Server-only: reads public/templates/ directly off disk (skipping
// backups/) so every page listing templates — the public gallery, the
// admin view, the dashboard — stays accurate automatically as templates
// are added via the conversion pipeline, with no separate data source to
// keep in sync.

function dirSize(dir) {
  let total = 0;
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    total += e.isDirectory() ? dirSize(p) : fs.statSync(p).size;
  }
  return total;
}

function fileCount(dir) {
  try {
    return fs.readdirSync(dir).length;
  } catch {
    return 0;
  }
}

export function getTemplates() {
  const templatesDir = path.join(process.cwd(), "public", "templates");
  let entries = [];
  try {
    entries = fs.readdirSync(templatesDir, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries
    .filter((e) => e.isDirectory() && e.name !== "backups")
    .map((e) => {
      const base = path.join(templatesDir, e.name);
      const jsonPath = path.join(base, "template.json");
      try {
        const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
        const photos = data.placeholders.filter((p) => p.type !== "TEXT");
        const texts  = data.placeholders.filter((p) => p.type === "TEXT");
        return {
          id: e.name,
          source: data.meta.source,
          convertedAt: data.meta.convertedAt,
          width: data.meta.canvasWidth,
          height: data.meta.canvasHeight,
          photos,
          texts,
          layerCount: fileCount(path.join(base, "layers")),
          clipCount:  fileCount(path.join(base, "clips")),
          sizeBytes:  dirSize(base),
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}
