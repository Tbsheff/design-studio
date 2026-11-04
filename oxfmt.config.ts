import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
  ...ultracite,
  ignorePatterns: [
    ...(ultracite.ignorePatterns ?? []),
    ".claude/**",
    "**/dist/**",
    "apps/desktop/src/server/templates/**",
    "apps/desktop/src/ui/ai/**",
    "lint/day-one.ts",
    "**/*.md",
    "**/*.html",
    "**/*.js",
    "**/*.mjs",
    "**/*.cjs",
    "**/*.cts",
    "research/**",
    "docs/patterns/golden/**",
    "**/*.mts",
    "**/*.jsx",
    "**/*.yml",
    "**/*.yaml",
    "**/*.toml",
    "**/*.scss",
    "**/package-lock.json",
    "apps/desktop/e2e/fixtures/**",
    "**/__fixtures__/**",
    "apps/desktop/src/server/design-system/packs/**",
  ],
  sortTailwindcss: false,
});
