import { defineConfig } from "oxlint";
import type { OxlintConfig, OxlintOverride } from "oxlint";

import {
  ELEMENTS,
  ROOT_POLICIES,
  UI_CROSS_FEATURE_OVERRIDES,
  dependencies,
} from "./lint/boundaries.ts";
import { coarse } from "./lint/coarse.ts";
import { dayOne } from "./lint/day-one.ts";
import {
  decisionOverrides,
  decisions,
  playwrightAll,
  vitestAll,
} from "./lint/decisions.ts";
import { toKeptOptions } from "./lint/keep-options.ts";
import { studioWorkspace } from "./lint/plugins/studio/workspace-overrides.ts";
import { antiSlop, core, js, jsPluginSettings, react } from "./lint/presets.ts";
import { serverOrder } from "./lint/server-order.ts";
import { STUDIO_PLUGIN, studio } from "./lint/studio.ts";

const LINT_IGNORES = [
  ...(core.ignorePatterns ?? []),
  ".claude/**",
  "**/dist/**",
  "apps/desktop/src/server/templates/**",
  "apps/*/node_modules/**",
  "apps/desktop/src/ui/assets/**",
  "**/__fixtures__/**",
  "test-results/**",
  "research/**",
  "apps/desktop/verification/**",
  "design-review/**",
  "apps/desktop/artifacts/**",
  "docs/patterns/golden/**",
  "lint/day-one.ts",
];

const BOUNDARY_SETTINGS = {
  "import/resolver": {
    [new URL("lint/ts-resolver.cjs", import.meta.url).pathname]: {},
  },
  "boundaries/elements": ELEMENTS,
};

const TEST_OVERRIDES: OxlintOverride[] = [
  {
    files: [
      "apps/desktop/src/**/*.test.ts",
      "apps/desktop/desktop/**/*.test.ts",
      "apps/desktop/e2e/support/**/*.test.ts",
    ],
    plugins: ["vitest"],
    rules: vitestAll,
  },
  { files: ["apps/desktop/e2e/**/*.spec.ts"], rules: playwrightAll },
  {
    files: ["oxlint.*.config.ts"],
    rules: { "github/filenames-match-regex": "off" },
  },
];

const BOUNDARY_OVERRIDES: OxlintOverride[] = [
  ...coarse,
  ...serverOrder,
  ...UI_CROSS_FEATURE_OVERRIDES,
  {
    files: ["apps/desktop/src/ui/**"],
    rules: { "import/no-cycle": ["error", { ignoreTypes: true }] },
  },
  {
    files: [
      "apps/desktop/src/ui/api.ts",
      "apps/desktop/src/ui/platform/query.ts",
      "apps/desktop/src/ui/platform/stream.ts",
    ],
    rules: { "import/no-cycle": ["warn", { ignoreTypes: true }] },
  },
];

const config = defineConfig<OxlintConfig>({
  env: core.env,
  extends: [core, react, js, antiSlop],
  jsPlugins: [
    ...(js.jsPlugins ?? []),
    "eslint-plugin-boundaries",
    "eslint-plugin-playwright",
    STUDIO_PLUGIN,
  ],
  options: { typeAware: false },
  ignorePatterns: LINT_IGNORES.filter(
    (pattern) => pattern !== "lint/day-one.ts"
  ),
  settings: { ...jsPluginSettings, ...BOUNDARY_SETTINGS },
  rules: {
    ...decisions.rules,
    "boundaries/dependencies": dependencies("error", ROOT_POLICIES),
  },
  overrides: [
    ...BOUNDARY_OVERRIDES,
    ...studio,
    ...studioWorkspace,
    ...decisionOverrides.map((override) => toKeptOptions(override)),
    ...TEST_OVERRIDES,
    ...dayOne,
  ],
});

export { BOUNDARY_OVERRIDES, BOUNDARY_SETTINGS, LINT_IGNORES, TEST_OVERRIDES };

export default config;
