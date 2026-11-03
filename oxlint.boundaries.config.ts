import { defineConfig } from "oxlint";
import type { OxlintOverride } from "oxlint";

import { ROOT_POLICIES, dependencies } from "./lint/boundaries.ts";
import {
  BOUNDARY_OVERRIDES,
  BOUNDARY_SETTINGS,
  LINT_IGNORES,
} from "./oxlint.config.ts";

const KEPT = new Set([
  "boundaries/dependencies",
  "import/no-cycle",
  "no-restricted-imports",
]);

type RuleMap = NonNullable<OxlintOverride["rules"]>;

const keepBoundaryRules = (rules: RuleMap = {}): RuleMap =>
  Object.fromEntries(Object.entries(rules).filter(([key]) => KEPT.has(key)));

const overrides = BOUNDARY_OVERRIDES.map((entry) => ({
  files: entry.files,
  rules: keepBoundaryRules(entry.rules),
})).filter((entry) => Object.keys(entry.rules).length > 0);

export default defineConfig({
  categories: { correctness: "off" },
  plugins: ["import"],
  jsPlugins: ["eslint-plugin-boundaries"],
  ignorePatterns: LINT_IGNORES,
  settings: BOUNDARY_SETTINGS,
  rules: {
    "boundaries/dependencies": dependencies("error", ROOT_POLICIES),
    "import/no-cycle": ["warn", { ignoreTypes: false }],
    "no-restricted-imports": "error",
  },
  overrides,
});
