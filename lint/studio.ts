import type { OxlintOverride } from "oxlint";

const STUDIO_PLUGIN = "./lint/plugins/studio.js";

const AGGREGATORS = [
  "src/shared/actions/index.ts",
  "src/server/main/live-layer.ts",
  "src/server/http/mount-all.ts",
  "src/server/mcp/registry.ts",
  "src/server/agent-tools/registry.ts",
];

const SERVER_FILES = ["src/server/**/*.ts"];

const SERVER_TESTS = ["src/server/**/*.test.ts"];

const UI_FILES = ["src/ui/**/*.ts", "src/ui/**/*.tsx"];

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
    files: ["lint/plugins/studio/facts.js"],
    rules: { "node/no-sync": "off" },
  },
  {
    files: ["src/shared/actions/**/*.ts"],
    rules: {
      "studio/action-domain-name": "error",
      "studio/action-verb": "error",
      "studio/agent-off-reason": "error",
      "studio/write-needs-write-permission": "error",
    },
  },
  {
    files: ["src/server/handlers/**/*.ts"],
    rules: {
      "studio/handler-satisfies": "error",
      "studio/no-deep-area-import": "error",
      "studio/read-yields-read-service": "error",
    },
  },
  {
    excludeFiles: ["src/server/platform/attempt/**"],
    files: SERVER_FILES,
    rules: { "studio/no-local-error-bridge": "error" },
  },
  {
    excludeFiles: SERVER_TESTS,
    files: SERVER_FILES,
    rules: {
      "studio/no-async-in-service": "error",
      "studio/service-tag-area": "error",
    },
  },
  {
    excludeFiles: ["src/server/platform/runtime-slot/**"],
    files: SERVER_FILES,
    rules: { "studio/no-runtime-map": "error" },
  },
  {
    excludeFiles: [...SERVER_TESTS, "src/server/direct-edit/engine/**"],
    files: ["src/server/**/engine/**/*.ts"],
    rules: { "studio/engine-pure": "error" },
  },
  {
    excludeFiles: ["lint/studio.ts"],
    files: ["lint/*.ts"],
    rules: { "studio/no-studio-override": "error" },
  },
  {
    files: ["cloud/api/src/http/**/*.ts"],
    rules: { "studio/no-stub-route": "error" },
  },
  { files: AGGREGATORS, rules: { "studio/no-output-guess": "error" } },
  {
    files: UI_FILES,
    rules: {
      "studio/no-promise-cast": "error",
      "studio/no-then": "error",
      "studio/no-wildcard-reexport": "error",
      "studio/read-needs-input": "error",
    },
  },
  {
    excludeFiles: ["src/ui/platform/pack-api.ts"],
    files: UI_FILES,
    rules: { "studio/no-wire-cast": "error" },
  },
  {
    files: ["src/ui/platform/**/*.ts", "src/ui/platform/**/*.tsx"],
    rules: { "studio/no-cache-ttl": "error" },
  },
  {
    excludeFiles: ["src/ui/platform/**"],
    files: UI_FILES,
    rules: { "studio/no-desktop-global": "error" },
  },
];

export { STUDIO_PLUGIN, studio };
