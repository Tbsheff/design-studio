import type { OxlintOverride } from "oxlint";

const SERVER_FILES = ["src/server/**/*.ts"];

const SERVER_TESTS = ["src/server/**/*.test.ts"];

const HANDLER_FILES = ["src/server/handlers/**/*.ts"];

const CLOUD_FILES = ["cloud/api/src/**/*.ts"];

const FEATURE_UI_FILES = [
  "src/ui/features/**/*.ts",
  "src/ui/features/**/*.tsx",
];

const ADAPTER_IMPORT_FILES = [
  "src/server/http/**/*.ts",
  "src/server/mcp/**/*.ts",
  "src/server/agent-tools/**/*.ts",
  "src/server/variations/**/*.ts",
];

const PLATFORM_FILES = "cloud/api/src/platform/**";

const PROBE_FILES = "cloud/api/src/tenant/probes/**";

const CLOUD_ENTRY = ["cloud/api/src/index.ts", "cloud/api/src/auth/**"];

const LEGACY_CLOUD_ASYNC = [
  "cloud/api/src/mcp/mount.ts",
  "cloud/api/src/http/middleware/auth-calls.ts",
];

const TENANT_GATE_FILES = [
  "cloud/api/src/tenant/{blobs,viewer-db,sql,db}.ts",
  "cloud/api/src/tenant/{resolver,sweep-db}.ts",
  PLATFORM_FILES,
  "cloud/api/src/tenant/repos/key-perm.ts",
  PROBE_FILES,
];

const LEGACY_ORG_PROVIDERS = [
  "cloud/api/src/http/groups/gates.ts",
  "cloud/api/src/http/sync/sync-gate.ts",
];

const ORG_MIDDLEWARE = ["cloud/api/src/http/middleware/**", PROBE_FILES];

const ROUTE_FILES = [
  "cloud/api/src/http/**/*.ts",
  "src/server/publish/**/*.ts",
];

const UI_BUDGET_FILES = [
  "src/ui/{features,app,kit,domain}/**/*.ts",
  "src/ui/{features,app,kit,domain}/**/*.tsx",
];

const LINKED_FILES = [
  "src/shared/publish.ts",
  "src/shared/actions/{publish,share}/**/*.ts",
  "src/server/publish/**/*.ts",
  "src/ui/publishApi.ts",
  ...HANDLER_FILES,
  ...FEATURE_UI_FILES,
];

const DEAD_CODE_FILES = [
  "cloud/api/src/{viewer,share}/**/*.ts",
  "cloud/api/src/tenant/repos/share.ts",
  "cloud/api/src/cron.ts",
  "src/ui/publishApi.ts",
  "src/server/publish/cloud-links.ts",
];

const LEGACY_SERVICE_OPTIONS = ["src/server/store/authorizer.ts"];

const studioReview: OxlintOverride[] = [
  {
    files: ["lint/day-one.ts"],
    rules: {
      "anti-slop/no-conditional-empty-object-spread": "off",
      "max-lines": "off",
      "no-magic-numbers": "off",
      "no-ternary": "off",
      "oxc/no-map-spread": "off",
      "sonarjs/max-lines": "off",
      "studio/day-one-frozen": "error",
    },
  },
  {
    files: ["src/**/*.ts", "src/**/*.tsx", ...CLOUD_FILES],
    rules: { "studio/import-resolves": "error" },
  },
  {
    files: FEATURE_UI_FILES,
    rules: {
      "studio/no-finally-state-reset": "error",
      "studio/no-hook-component-import": "error",
      "studio/no-json-cast": "error",
      "studio/relative-import-js": "error",
    },
  },
  {
    files: [...FEATURE_UI_FILES, "src/ui/components/PublicationRow.tsx"],
    rules: { "studio/no-inline-copy": "error" },
  },
  { files: UI_BUDGET_FILES, rules: { "studio/no-ui-storage": "error" } },
  { files: LINKED_FILES, rules: { "studio/no-optional-flag": "error" } },
  {
    files: [...HANDLER_FILES, ...CLOUD_FILES],
    rules: { "studio/no-param-field-write": "error" },
  },
  { files: DEAD_CODE_FILES, rules: { "studio/no-unused-export": "error" } },
  {
    files: ROUTE_FILES,
    rules: {
      "studio/no-inline-decode": "error",
      "studio/no-string-coerce": "error",
    },
  },
  {
    excludeFiles: [...SERVER_TESTS, ...LEGACY_SERVICE_OPTIONS],
    files: SERVER_FILES,
    rules: { "studio/no-service-option": "error" },
  },
  {
    files: [...SERVER_FILES, ...CLOUD_FILES],
    rules: {
      "studio/no-identity-map": "error",
      "studio/read-service-no-stub": "error",
    },
  },
  {
    excludeFiles: [...CLOUD_ENTRY, ...LEGACY_CLOUD_ASYNC],
    files: CLOUD_FILES,
    rules: {
      "studio/cloud-platform-import": "error",
      "studio/no-cloud-async": "error",
      "studio/no-query-in-loop": "error",
    },
  },
  {
    excludeFiles: [PLATFORM_FILES],
    files: CLOUD_FILES,
    rules: { "studio/sql-write-org-filter": "error" },
  },
  {
    excludeFiles: [...CLOUD_ENTRY, ...TENANT_GATE_FILES],
    files: CLOUD_FILES,
    rules: { "studio/no-raw-prepare": "error" },
  },
  {
    excludeFiles: [...ORG_MIDDLEWARE, ...LEGACY_ORG_PROVIDERS],
    files: CLOUD_FILES,
    rules: { "studio/no-current-org-provide": "error" },
  },
  {
    excludeFiles: SERVER_TESTS,
    files: SERVER_FILES,
    rules: {
      "studio/no-action-name-reuse": "error",
      "studio/server-one-runtime": "error",
      "studio/server-run-entry": "error",
      "studio/span-name-match": "error",
    },
  },
  {
    excludeFiles: SERVER_TESTS,
    files: ADAPTER_IMPORT_FILES,
    rules: { "studio/adapter-import-index": "error" },
  },
  {
    files: ["src/shared/actions/**/*.ts"],
    rules: {
      "studio/no-json-schema": "error",
      "studio/project-scope-needs": "error",
    },
  },
  {
    files: FEATURE_UI_FILES,
    rules: {
      "studio/no-feature-fetch": "error",
      "studio/no-feature-interval": "error",
    },
  },
  {
    files: ["lint/plugins/studio/frozen.js", "lint/day-one.ts"],
    rules: { "studio/frozen-pin": "error" },
  },
  {
    excludeFiles: SERVER_TESTS,
    files: [
      "src/server/run-log/run-log-{store,writer,runtime,controls,reads}.ts",
    ],
    rules: {
      "studio/no-awaited-return-type": "error",
      "studio/no-feature-async": "error",
    },
  },
  {
    files: ["src/server/agent/{agent-sdk-client,run-runner}.ts"],
    rules: {
      "studio/no-undefined-type": "error",
      "studio/readonly-field": "error",
    },
  },
];

export { studioReview };
