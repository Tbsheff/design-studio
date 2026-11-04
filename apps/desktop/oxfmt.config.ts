import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
  ...ultracite,
  ignorePatterns: [
    ...(ultracite.ignorePatterns ?? []),
    ".claude/**",
    "dist/**",
    "desktop/dist/**",
    "src/server/templates/**",
    "src/ui/ai/**",
    "lint/day-one.ts",
    "**/*.md",
    "**/*.html",
    "**/*.js",
    "**/*.mjs",
    "**/*.cjs",
    "**/*.cts",
    "**/*.mts",
    "**/*.jsx",
    "**/*.yml",
    "**/*.yaml",
    "**/*.toml",
    "**/*.scss",
    "**/package-lock.json",
    "e2e/fixtures/**",
    "**/__fixtures__/**",
    "src/server/design-system/packs/**",
  ],
  sortTailwindcss: false,
});
