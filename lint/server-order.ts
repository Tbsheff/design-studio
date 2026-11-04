import type { OxlintOverride } from "oxlint";

import {
  LAYERS,
  ROOT_POLICIES,
  dependencies,
  globsOf,
  layerOverride,
} from "./boundaries.ts";

const WARN_GLOBS = [
  "apps/desktop/src/server/http/**",
  "apps/desktop/src/server/mcp/**",
  "apps/desktop/src/server/agent/**",
  "apps/desktop/src/server/store/**",
  "apps/desktop/src/server/app/**",
  "apps/desktop/src/server/direct-edit/**",
  "apps/desktop/src/server/components/**",
  "apps/desktop/src/server/preview/**",
  "apps/desktop/src/server/canvas/**",
  "apps/desktop/src/server/export/**",
  "apps/desktop/src/server/design-system/**",
  "apps/desktop/src/server/variations/**",
  "apps/desktop/src/server/publish/**",
  "apps/desktop/src/server/share/**",
  "apps/desktop/src/server/git/**",
  "apps/desktop/src/server/*.ts",
  "apps/desktop/src/server/review/**",
  "apps/desktop/src/server/tweaks/**",
  "apps/desktop/src/server/figma/**",
  "apps/desktop/src/server/design-rules/**",
  "apps/desktop/src/server/comments/**",
  "apps/desktop/desktop/**",
  "apps/desktop/scripts/**",
  "apps/desktop/e2e/**",
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
