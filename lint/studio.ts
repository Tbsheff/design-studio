import type { OxlintOverride } from "oxlint";

const STUDIO_PLUGIN = "./lint/plugins/studio.js";

const AGGREGATORS = [
  "src/shared/actions/index.ts",
  "src/server/main/live-layer.ts",
  "src/server/http/mount-all.ts",
  "src/server/mcp/registry.ts",
  "src/server/agent-tools/registry.ts",
];

const studio: OxlintOverride[] = [
  {
    files: ["lint/plugins/studio/*.js"],
    rules: { "sonarjs/function-name": "off" },
  },
  {
    files: ["lint/plugins/studio.js"],
    rules: { "import/no-default-export": "off" },
  },
  {
    files: ["src/shared/actions/**/*.ts"],
    rules: {
      "studio/action-verb": "error",
      "studio/agent-off-reason": "error",
    },
  },
  {
    files: ["src/server/handlers/**/*.ts"],
    rules: { "studio/no-deep-area-import": "error" },
  },
  {
    excludeFiles: ["src/server/platform/attempt/**"],
    files: ["src/server/**/*.ts"],
    rules: { "studio/no-local-error-bridge": "error" },
  },
  {
    files: ["cloud/api/src/http/**/*.ts"],
    rules: { "studio/no-stub-route": "error" },
  },
  { files: AGGREGATORS, rules: { "studio/no-output-guess": "error" } },
  {
    files: ["src/ui/**/*.ts", "src/ui/**/*.tsx"],
    rules: {
      "studio/no-promise-cast": "error",
      "studio/no-wildcard-reexport": "error",
      "studio/read-needs-input": "error",
    },
  },
  {
    files: ["src/ui/platform/**/*.ts", "src/ui/platform/**/*.tsx"],
    rules: { "studio/no-cache-ttl": "error" },
  },
  {
    excludeFiles: ["src/ui/platform/**"],
    files: ["src/ui/**/*.ts", "src/ui/**/*.tsx"],
    rules: { "studio/no-desktop-global": "error" },
  },
];

export { STUDIO_PLUGIN, studio };
