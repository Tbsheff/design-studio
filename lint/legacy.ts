import type { OxlintOverride } from "oxlint";

import {
  LAYERS,
  ROOT_POLICIES,
  dependencies,
  globsOf,
  layerOverride,
} from "./boundaries.ts";

export const LEGACY_GLOBS = [
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

const UI_GLOBALS = [
  "fetch",
  "localStorage",
  "sessionStorage",
  "EventSource",
  "BroadcastChannel",
].map((name) => ({
  name,
  message: "Only src/ui/platform may touch browser I/O.",
}));

const STUDIO_DESKTOP = [
  {
    object: "window",
    property: "studioDesktop",
    message: "Only src/ui/platform may use window.studioDesktop.",
  },
];

export const SHARED_DOM = ["document", "window"].map((name) => ({
  name,
  message: "src/shared runs on every platform.",
}));

const isLegacy = (glob: string) => LEGACY_GLOBS.includes(glob);

const layerEntries = LAYERS.flatMap((layer, index) => {
  const files = globsOf(layer).filter(isLegacy);
  return files.length > 0 ? [layerOverride(index, files, "warn")] : [];
});

const layerGlobs = new Set(LAYERS.flatMap(globsOf));

const rootEntry = {
  files: LEGACY_GLOBS.filter((glob) => !layerGlobs.has(glob)),
  rules: { "boundaries/dependencies": dependencies("warn", ROOT_POLICIES) },
};

export const legacy: OxlintOverride[] = [
  rootEntry,
  ...layerEntries,
  {
    files: ["src/ui/**"],
    rules: {
      "no-restricted-globals": ["warn", ...UI_GLOBALS],
      "no-restricted-properties": ["warn", ...STUDIO_DESKTOP],
    },
  },
  {
    files: ["src/ui/platform/**"],
    rules: {
      "no-restricted-globals": "off",
      "no-restricted-properties": "off",
    },
  },
  {
    files: ["src/shared/app.ts"],
    rules: { "no-restricted-globals": ["warn", ...SHARED_DOM] },
  },
];
