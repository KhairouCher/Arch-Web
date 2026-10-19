import fs from "fs";
import path from "path";

// Server-only: lists the models in public/models/*.json (name, tier, price in
// points, pages). Placeholder until models come from the database (T-020).
// The admin's changes to tier, price and visibility are layered on top in the
// browser by lib/mockStore.js (effectiveModel).
export function getModels() {
  const dir = path.join(process.cwd(), "public", "models");
  let files = [];
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
  return files
    .map((f) => {
      try {
        const d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8"));
        return {
          id: f.replace(/\.json$/, ""),
          name: d.name,
          tier: d.tier || "architect",
          pricePoints: d.pricePoints ?? 1000,
          published: d.published ?? true,
          pages: d.pages || [],
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}
