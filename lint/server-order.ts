import type { OxlintOverride } from "oxlint";

import { LAYERS, globsOf, layerOverride } from "./boundaries.ts";
import { LEGACY_GLOBS } from "./legacy.ts";

const isNew = (glob: string) => !LEGACY_GLOBS.includes(glob);

export const serverOrder: OxlintOverride[] = LAYERS.flatMap((layer, index) => {
  const files = globsOf(layer).filter(isNew);
  return files.length > 0 ? [layerOverride(index, files, "error")] : [];
});
