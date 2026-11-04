import type { OxlintOverride } from "oxlint";

import {
  LAYERS,
  ROOT_POLICIES,
  dependencies,
  globsOf,
  layerOverride,
} from "./boundaries.ts";

const WARN_GLOBS = [
  "src/server/http/**",
  "src/server/mcp/**",
  "src/server/agent/**",
  "src/server/store/**",
  "src/server/app/**",
  "src/server/direct-edit/**",
  "src/server/components/**",
  "src/server/preview/**",
  "src/server/canvas/**",
  "src/server/export/**",
  "src/server/design-system/**",
  "src/server/variations/**",
  "src/server/publish/**",
  "src/server/share/**",
  "src/server/git/**",
  "src/server/*.ts",
  "src/server/layers/**",
  "src/server/review/**",
  "src/server/tweaks/**",
  "src/server/figma/**",
  "src/server/design-rules/**",
  "src/server/comments/**",
  "desktop/**",
  "scripts/**",
  "e2e/**",
];

const isWarned = (glob: string): boolean => WARN_GLOBS.includes(glob);

const layerGlobs = new Set(LAYERS.flatMap((layer) => globsOf(layer)));

const toLayerRows = (
  layer: (typeof LAYERS)[number],
  index: number
): OxlintOverride[] => {
  const files = globsOf(layer);
  const rows: OxlintOverride[] = [];
  const strict = files.filter((glob) => !isWarned(glob));
  const warned = files.filter((glob) => isWarned(glob));

  if (strict.length > 0) {
    rows.push(layerOverride(index, strict, "error"));
  }

  if (warned.length > 0) {
    rows.push(layerOverride(index, warned, "warn"));
  }

  return rows;
};

const serverOrder: OxlintOverride[] = [
  {
    files: WARN_GLOBS.filter((glob) => !layerGlobs.has(glob)),
    rules: { "boundaries/dependencies": dependencies("warn", ROOT_POLICIES) },
  },
  ...LAYERS.flatMap((layer, index) => toLayerRows(layer, index)),
];

export { serverOrder };
