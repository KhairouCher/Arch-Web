// Feature flags per build variant (Builds page, docs/project-docs.json). The
// variant comes from NEXT_PUBLIC_VARIANT: release (the default), staging, exp
// or demo. Each flag lists the variants it is on in; keep this in step with the
// flags in project-docs.json. Only F-print-quality is read by code so far; the
// others are listed so their code can be gated as it is written.
const ALL = ["release", "staging", "exp", "demo"];

export const FLAGS = {
  "F-print-quality":    ALL,
  "F-preview-assets":   ["exp"],
  "F-server-export":    ["exp"],
  "F-draft-sync":       ["exp"],
  "F-rtl-ar":           ["exp"],
  "F-queue-estimate":   ["exp"],
  "F-designer-accounts": [],
};

export const VARIANT = process.env.NEXT_PUBLIC_VARIANT || "release";

export function isOn(flag, variant = VARIANT) {
  return (FLAGS[flag] || []).includes(variant);
}
