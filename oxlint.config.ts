import { defineConfig } from "oxlint";
import type { OxlintOverride } from "oxlint";

import { ELEMENTS, ROOT_POLICIES, dependencies } from "./lint/boundaries.ts";
import { coarse } from "./lint/coarse.ts";
import { dayOne } from "./lint/day-one.ts";
import {
  decisionOverrides,
  decisions,
  playwrightAll,
  vitestAll,
} from "./lint/decisions.ts";
import { legacy } from "./lint/legacy.ts";
import { antiSlop, core, js, jsPluginSettings, react } from "./lint/presets.ts";
import { serverOrder } from "./lint/server-order.ts";
import { STUDIO_PLUGIN, studio } from "./lint/studio.ts";

export const LINT_IGNORES = [
  ...(core.ignorePatterns ?? []),
  ".claude/**",
  "dist/**",
  "desktop/dist/**",
  "src/server/templates/**",
  "cloud/*/node_modules/**",
  "src/ui/assets/**",
  "**/__fixtures__/**",
  "test-results/**",
  "research/**",
  "verification/**",
  "design-review/**",
  "artifacts/**",
  "docs/patterns/golden/**",
  "lint/day-one.ts",
];

export const BOUNDARY_SETTINGS = {
  "import/resolver": {
    [new URL("lint/ts-resolver.cjs", import.meta.url).pathname]: {},
  },
  "boundaries/elements": ELEMENTS,
};

export const TEST_OVERRIDES: OxlintOverride[] = [
  {
    files: [
      "src/**/*.test.ts",
      "desktop/**/*.test.ts",
      "e2e/support/**/*.test.ts",
    ],
    plugins: ["vitest"],
    rules: vitestAll,
  },
  { files: ["e2e/**/*.spec.ts"], rules: playwrightAll },
  {
    files: ["oxlint.*.config.ts"],
    rules: { "github/filenames-match-regex": "off" },
  },
];

export const BOUNDARY_OVERRIDES: OxlintOverride[] = [
  ...coarse,
  ...serverOrder,
  ...legacy,
];

export default defineConfig({
  env: core.env,
  extends: [core, react, js, antiSlop],
  jsPlugins: [
    ...(js.jsPlugins ?? []),
    "eslint-plugin-boundaries",
    "eslint-plugin-playwright",
    STUDIO_PLUGIN,
  ],
  options: { typeAware: false },
  ignorePatterns: LINT_IGNORES,
  settings: { ...jsPluginSettings, ...BOUNDARY_SETTINGS },
  rules: {
    ...decisions.rules,
    "boundaries/dependencies": dependencies("error", ROOT_POLICIES),
  },
  overrides: [
    ...BOUNDARY_OVERRIDES,
    ...studio,
    ...decisionOverrides,
    ...TEST_OVERRIDES,
    ...dayOne,
  ],
});
