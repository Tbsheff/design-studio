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
  ],
});
