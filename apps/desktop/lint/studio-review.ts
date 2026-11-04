import type { OxlintOverride } from "oxlint";

const SERVER_FILES = ["src/server/**/*.ts"];

const SERVER_TESTS = ["src/server/**/*.test.ts"];

const HANDLER_FILES = ["src/server/handlers/**/*.ts"];

const CLOUD_FILES = ["apps/api/src/**/*.ts"];

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

const PLATFORM_FILES = "apps/api/src/platform/**";

const PROBE_FILES = "apps/api/src/tenant/probes/**";

const CLOUD_ENTRY = ["apps/api/src/index.ts", "apps/api/src/auth/**"];

const LEGACY_CLOUD_ASYNC = [
  "apps/api/src/mcp/mount.ts",
  "apps/api/src/http/middleware/auth-calls.ts",
];

const TENANT_GATE_FILES = [
  "apps/api/src/tenant/{blobs,viewer-db,sql,db}.ts",
  "apps/api/src/tenant/{resolver,sweep-db}.ts",
  PLATFORM_FILES,
  "apps/api/src/tenant/repos/key-perm.ts",
  PROBE_FILES,
];

const LEGACY_ORG_PROVIDERS = [
  "apps/api/src/http/groups/gates.ts",
  "apps/api/src/http/sync/sync-gate.ts",
];

const ORG_MIDDLEWARE = ["apps/api/src/http/middleware/**", PROBE_FILES];

const ROUTE_FILES = [
  "apps/api/src/http/**/*.ts",
  "src/server/publish/**/*.ts",
];

const UI_BUDGET_FILES = [
  "src/ui/{features,app,kit,domain}/**/*.ts",
  "src/ui/{features,app,kit,domain}/**/*.tsx",
];

const LINKED_FILES = [
  "src/shared/publish.ts",
  "packages/common/actions/src/{publish,share}/**/*.ts",
  "src/server/publish/**/*.ts",
  ...HANDLER_FILES,
  ...FEATURE_UI_FILES,
];

const DEAD_CODE_FILES = [
  "apps/api/src/{viewer,share}/**/*.ts",
  "apps/api/src/tenant/repos/share.ts",
  "apps/api/src/cron.ts",
  "src/server/publish/cloud-links.ts",
  "src/ui/features/share-publish-ship-export/publish-api.ts",
];

const LEGACY_SERVICE_OPTIONS = ["src/server/store/authorizer.ts"];

const SPLIT_NAMING_FILES = [
  "desktop/{boot,pack-args}.ts",
  "src/ui/features/{home,inspector}/**/*.ts",
];

const NEW_FEATURE_FILES = ["src/ui/features/{home,inspector}/**"];

const BRIDGE_FILES = ["src/bridge/**/*.ts"];

const GUARD_UI_FILES = ["src/ui/**/*.ts", "src/ui/**/*.tsx"];

const UI_ROOT_FILES = ["src/ui/*.ts", "src/ui/*.tsx"];

const APP_FILES = ["src/ui/app/**/*.ts", "src/ui/app/**/*.tsx"];

const STATE_FILES = ["src/server/{mcp,http,agent-tools,store}/**/*.ts"];

const SCOPE_FILES = ["src/server/{store,preview,handlers}/**/*.ts"];

const AGENT_SPLIT_FILES = ["src/server/agent/{index,lifecycle,types}.ts"];

const APP_SOURCE_FILES = ["src/**/*.ts", "src/**/*.tsx", "desktop/**/*.ts"];

const COMPILER_IMPORT_FILES = [
  ...APP_SOURCE_FILES,
  "{scripts,e2e}/**/*.ts",
  ...CLOUD_FILES,
];

const COMPILER_PIN_ANCHORS = [
  "src/server/platform/ts-compiler/index.ts",
  "scripts/typecheck-diff.ts",
  ".pnpmfile.mjs",
];

const TSCONFIG_OWNER = ["scripts/tsconfig-projects.ts"];

const NEW_VERB_FILES = ["src/server/**/*.ts", "scripts/**/*.ts"];

const AGENT_TOOL_FILES = "src/server/agent/*-{tool,tools,tool-fields}.ts";

const LOWER_AREA_FILES = [
  "src/server/{canvas,comments,components,design-system,direct-edit}/**/*.ts",
  "src/server/{events,export,layers,page-probe,review,share,store}/**/*.ts",
];

const PORT_FILES = [
  AGENT_TOOL_FILES,
  "src/server/agent-tools/*.ts",
  "src/server/{icons,image-search,text-styles}/*.ts",
];

const DECODE_OWNER_FILES = [
  "src/server/agent/{clarify,critic-reply}.ts",
  AGENT_TOOL_FILES,
  "src/server/{icons,image-search,text-styles}/*.ts",
];

const LINTED_FILES = ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.mjs", "**/*.cjs"];

const studioReview: OxlintOverride[] = [
  {
    files: LINTED_FILES,
    rules: { "studio/slice-owned-change": "error" },
  },
  {
    files: NEW_VERB_FILES,
    rules: { "studio/new-function-verb": "error" },
  },
  {
    files: ["scripts/**/*.ts"],
    rules: { "studio/no-tsconfig-list": "error" },
  },
  {
    files: TSCONFIG_OWNER,
    rules: {
      "studio/tsconfig-dom-lib": "error",
      "studio/tsconfig-leaf-minimal": "error",
      "studio/typecheck-wired": "error",
    },
  },
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
      "studio/day-one-pairs": "error",
    },
  },
  {
    files: [...APP_SOURCE_FILES.slice(0, 2), ...CLOUD_FILES],
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
    files: [...FEATURE_UI_FILES],
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
    files: ["packages/common/actions/src/**/*.ts"],
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
    files: [
      "lint/plugins/studio/frozen.js",
      "lint/plugins/studio/frozen-port.js",
      "lint/day-one.ts",
      "lint/boundaries.ts",
      "lint/server-order.ts",
    ],
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
  {
    files: ["lint/decisions.ts"],
    rules: {
      "studio/no-style-off": "error",
      "studio/one-override-per-files": "error",
    },
  },
  {
    files: ["src/ui/**/*.ts", "src/ui/**/*.tsx"],
    rules: {
      "studio/feature-index-import": "error",
      "studio/no-reexport-shim": "error",
    },
  },
  {
    files: NEW_FEATURE_FILES,
    rules: { "studio/feature-file-layout": "error" },
  },
  {
    files: ["src/server/**/*.probe.ts", "desktop/**/*.renderer.ts"],
    rules: { "studio/dom-project-wired": "error" },
  },
  {
    files: ["src/server/**/*.probe.ts"],
    rules: {
      "studio/area-import-index": "error",
      "studio/probe-has-function": "error",
    },
  },
  {
    files: ["desktop/**/*.renderer.ts"],
    rules: { "studio/renderer-has-function": "error" },
  },
  {
    files: [...SERVER_FILES, "desktop/**/*.ts"],
    rules: { "studio/serialized-fn-name-shim": "error" },
  },
  {
    files: SERVER_FILES,
    rules: { "studio/no-dynamic-app-import": "error" },
  },
  {
    files: BRIDGE_FILES,
    rules: {
      "studio/bridge-type-import": "error",
      "studio/no-floating-async": "error",
    },
  },
  {
    files: ["packages/common/actions/src/**/*.ts"],
    rules: { "studio/no-catch-all-union": "error" },
  },
  {
    files: ["src/bridge/bridge-types.ts"],
    rules: { "studio/boolean-name": "error" },
  },
  {
    files: SPLIT_NAMING_FILES,
    rules: {
      "studio/boolean-name": "error",
      "studio/module-function-verb": "error",
      "studio/no-undefined-type": "error",
      "studio/predicate-name": "error",
      "studio/readonly-field": "error",
    },
  },
  { files: GUARD_UI_FILES, rules: { "studio/lazy-default-export": "error" } },
  { files: UI_ROOT_FILES, rules: { "studio/no-ui-root-hub": "error" } },
  {
    files: ["src/ui/features/*/index.ts"],
    rules: { "studio/feature-index-lazy": "error" },
  },
  {
    files: APP_FILES,
    rules: {
      "studio/no-busy-flag": "error",
      "studio/no-dom-query": "error",
      "studio/no-feature-interval": "error",
    },
  },
  {
    files: APP_SOURCE_FILES,
    rules: { "studio/no-void-placeholder": "error" },
  },
  { files: BRIDGE_FILES, rules: { "studio/no-message-data-cast": "error" } },
  {
    files: ["src/bridge/session.ts"],
    rules: { "studio/readonly-field": "error" },
  },
  {
    files: [...BRIDGE_FILES, "src/shared/**/*.ts"],
    rules: { "studio/typed-string-list": "error" },
  },
  {
    excludeFiles: SERVER_TESTS,
    files: STATE_FILES,
    rules: { "studio/no-module-let": "error" },
  },
  {
    excludeFiles: SERVER_TESTS,
    files: [
      "src/server/store/{command-rules,device-bindings,local-org-scope,local-principal,org-scope,org-visibility,principal,project-org}.ts",
    ],
    rules: { "studio/no-hand-json-read": "error" },
  },
  {
    excludeFiles: SERVER_TESTS,
    files: SCOPE_FILES,
    rules: { "studio/no-server-scope-param": "error" },
  },
  {
    excludeFiles: SERVER_TESTS,
    files: SERVER_FILES,
    rules: { "studio/no-deep-store-import": "error" },
  },
  {
    files: AGENT_SPLIT_FILES,
    rules: { "studio/boolean-name": "error" },
  },
  {
    files: ["lint/decisions.ts"],
    rules: { "studio/override-file-once": "error" },
  },
  {
    files: COMPILER_IMPORT_FILES,
    rules: { "studio/ts-compiler-owner": "error" },
  },
  {
    files: COMPILER_PIN_ANCHORS,
    rules: { "studio/exact-compiler-pin": "error" },
  },
  {
    files: COMPILER_IMPORT_FILES,
    rules: {
      "studio/import-case-exact": "error",
      "studio/no-file-growth": "error",
    },
  },
  {
    files: GUARD_UI_FILES,
    rules: {
      "studio/no-hook-in-tsx": "error",
      "studio/no-module-box": "error",
      "studio/no-void-async-iife": "error",
    },
  },
  { files: FEATURE_UI_FILES, rules: { "studio/pure-model-import": "error" } },
  { files: STATE_FILES, rules: { "studio/no-module-box": "error" } },
  { files: SERVER_FILES, rules: { "studio/no-boot-file-read": "error" } },
  { files: ["e2e/**/*.ts"], rules: { "studio/no-soft-expect": "error" } },
  {
    files: APP_SOURCE_FILES,
    rules: { "studio/import-name-exported": "error" },
  },
  { files: LINTED_FILES, rules: { "studio/typecheck-clean": "error" } },
  {
    files: ["lint/plugins/studio/freeze-rules.js"],
    rules: { "studio/frozen-list-live": "error" },
  },
  {
    excludeFiles: SERVER_TESTS,
    files: SERVER_FILES,
    rules: {
      "studio/area-target-index": "error",
      "studio/no-zod-bridge": "error",
    },
  },
  {
    excludeFiles: SERVER_TESTS,
    files: [...SERVER_FILES, ...GUARD_UI_FILES],
    rules: { "studio/no-export-only-file": "error" },
  },
  {
    excludeFiles: SERVER_TESTS,
    files: LOWER_AREA_FILES,
    rules: { "studio/no-preview-barrel": "error" },
  },
  {
    excludeFiles: SERVER_TESTS,
    files: SERVER_FILES,
    rules: { "studio/no-unbound-name": "error" },
  },
  {
    excludeFiles: SERVER_TESTS,
    files: [AGENT_TOOL_FILES],
    rules: { "studio/no-erased-sdk-fields": "error" },
  },
  {
    excludeFiles: SERVER_TESTS,
    files: DECODE_OWNER_FILES,
    rules: { "studio/decode-owner": "error" },
  },
  {
    excludeFiles: SERVER_TESTS,
    files: PORT_FILES,
    rules: {
      "studio/field-builder-verb": "error",
      "studio/no-banned-type-word": "error",
      "studio/no-loose-tool-type": "error",
    },
  },
];

export { studioReview };
