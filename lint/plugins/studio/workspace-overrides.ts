import type { OxlintOverride } from "oxlint";

const SCRIPT_FILES = "apps/desktop/scripts/**/*.{ts,mjs}";

const TOOLING_FILES = [SCRIPT_FILES, "lint/**/*.{ts,js,cjs}"];

const WORKSPACE_FILES = [
  "apps/**/*.{ts,tsx,mjs}",
  "packages/**/*.{ts,tsx}",
  "lint/**/*.{ts,js}",
];

const LINT_LISTS = [
  "lint/{boundaries,coarse,day-one,decisions,server-order,studio,studio-files,studio-review}.ts",
  "lint/plugins/studio/frozen.js",
];

const RULE_SOURCE = "lint/plugins/studio/workspace-rules.js";

const OLD_PATH_OWNERS = [RULE_SOURCE];

const BIN_OWNERS = [
  "apps/desktop/scripts/workspace-root.ts",
  "apps/desktop/scripts/hooks/run-pre-commit.mjs",
  "lint/gen-day-one.ts",
  "lint/plugins/studio/reach-rules.js",
  RULE_SOURCE,
  "lint/plugins/studio/workspace-fact-rules.js",
];

const ANCHOR_FILES = ["lint/anchor.ts"];

const studioWorkspace: OxlintOverride[] = [
  {
    excludeFiles: BIN_OWNERS,
    files: [...TOOLING_FILES, "apps/desktop/e2e/**/*.ts"],
    rules: { "studio/no-stale-bin-path": "error" },
  },
  {
    excludeFiles: OLD_PATH_OWNERS,
    files: TOOLING_FILES,
    rules: { "studio/no-old-path-form": "error" },
  },
  {
    files: TOOLING_FILES,
    rules: { "studio/no-empty-output-fallback": "error" },
  },
  {
    files: [SCRIPT_FILES],
    rules: { "studio/no-app-root-join": "error" },
  },
  {
    excludeFiles: ["apps/desktop/scripts/check-ownership.ts"],
    files: ["apps/desktop/scripts/check-*.{ts,mjs}"],
    rules: { "studio/no-silent-skip": "error" },
  },
  {
    excludeFiles: [RULE_SOURCE, "apps/desktop/scripts/ac-safety/**"],
    files: [...TOOLING_FILES, "apps/desktop/src/server/publish/**/*.ts"],
    rules: { "studio/no-npm-text": "error" },
  },
  {
    files: WORKSPACE_FILES,
    rules: {
      "studio/generated-fresh": "error",
      "studio/no-package-forward-shim": "error",
      "studio/no-package-js-suffix": "error",
      "studio/package-export-specifier": "error",
    },
  },
  {
    files: ["packages/common/actions/src/_core/*.ts"],
    rules: { "studio/no-plain-core-module": "error" },
  },
  {
    files: LINT_LISTS,
    rules: { "studio/no-dead-glob": "error" },
  },
  {
    files: ANCHOR_FILES,
    rules: {
      "studio/boundary-package-element": "error",
      "studio/docs-link-resolves": "error",
      "studio/lint-covers-workspace": "error",
      "studio/package-export-named": "error",
      "studio/package-no-app-config": "error",
      "studio/package-typecheck-reference": "error",
      "studio/root-package-config": "error",
    },
  },
];

export { studioWorkspace };
