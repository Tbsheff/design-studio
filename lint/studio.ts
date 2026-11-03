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

const ADAPTER_FILES = [
  "src/server/http/**/*.ts",
  "src/server/mcp/**/*.ts",
  "src/server/agent-tools/**/*.ts",
];

const SPEC_SERVICE_NAMES = [
  "src/server/store/{authorizer,local-org-scope,local-principal,project-access}.ts",
  "src/server/publish/cf-cli.ts",
  "src/server/store/device-bindings.ts",
];

const LEGACY_SERVICE_NAMES = [
  "src/server/cloud/cloud-session.ts",
  "src/server/comments/comment-run-starter.ts",
  "src/server/events/{change-feed,render-tracker}.ts",
  "src/server/mcp-life/mcp-activity-log.ts",
  "src/server/publish/{local-runtime,publish-planner,publish-service}.ts",
  "src/server/share/{live-refresher,share-listener}.ts",
  "src/server/store/studio-info.ts",
];

const LEGACY_SERVICE_CODE = ["src/server/publish/local-runtime.ts"];

const AUTH_FILES = [
  "src/server/cloud/**/*.ts",
  "src/server/store/{command-rules,device-bindings,local-org-scope,local-principal,org-scope,org-visibility,principal}.ts",
  "src/shared/cloud-contracts.ts",
];

const OPTIONAL_NULL_FILES = [
  "src/server/{platform,events,run-log,project-source,page-probe,handlers,main,ship,agent-tools,mcp-life,http}/**/*.ts",
];

const ACTION_FILES = ["src/shared/actions/**/*.ts"];

const LEGACY_UNTYPED_SCHEMAS = [
  "src/shared/actions/project/schema.ts",
  "src/shared/actions/{canvas,comment,dev-server,pack,workspace}/**/*.ts",
  "src/shared/actions/direct-edit/**/*.ts",
];

const LEGACY_DOMAIN_OBJECTS = [
  "src/shared/actions/publish/{delete-comment,list-comments}.ts",
  "src/shared/actions/workspace/{get-tokens,list-projects,list-versions,search-projects}.ts",
  "src/shared/actions/direct-edit/{create-component,create-token,get-component-preview,insert-component,inspect-tokens,list-component-folders,list-components,update-tokens}.ts",
];

const LEGACY_TOOL_NAMES = [
  "src/shared/actions/canvas/{list-implicit-links,update-link}.ts",
  "src/shared/actions/version/list-hunks.ts",
];

const NO_READ_CHANGES = [
  "src/shared/actions/canvas/set-presence.ts",
  "src/shared/actions/share/set-cursor.ts",
  "src/shared/actions/comment/export.ts",
  "src/shared/actions/export/{export,export-folder,export-frame,export-handoff}.ts",
  "src/shared/actions/direct-edit/run.ts",
  "src/shared/actions/direct-edit/run-rules-test.ts",
  "src/shared/actions/viewport/run.ts",
];

const LEGACY_DOM_QUERIES = ["src/ui/features/icons/use-icon-host.ts"];

const LEGACY_RUNTIME_CALLS = [
  "src/server/mcp/legacy/projects-call.ts",
  "src/server/http/components-routes.ts",
  "src/server/mcp/{component-create-tools,component-preview-tools,arrange-tools,direct-edit-call,figma-import-tools,image-tools,insert-tools,jsx-insert-tools,layer-state-tools,move-tools,props-tools,review-tools,rules-tools,style-tools,tweak-tools,vector-tools}.ts",
];

const LEGACY_APP_IMPORTS = [
  "cloud/api/src/http/{errors,groups/wire-errors,middleware/member-auth,groups/authorizer,middleware/viewer,middleware/org-grant,middleware/agent-auth,groups/projects,groups/gates}.ts",
  "cloud/api/src/tenant/{resolver,viewer-db,repos/projects,db,current-org,blobs}.ts",
  "cloud/api/src/auth/{rate-limit,permissions}.ts",
];

const FEATURE_AREA_FILES = [
  "src/server/viewport/**/*.ts",
  "src/server/content/**/*.ts",
];

const FEATURE_FILES = [...FEATURE_AREA_FILES, "src/server/cloud/checkout.ts"];

const FEATURE_HANDLER_FILES = [
  "src/server/handlers/{content,viewport,direct-edit,cloud}/**/*.ts",
];

const PROMISE_TASK_FILES = ["src/server/content/write-content.ts"];

const NEW_SERVER_FILES = [
  ...FEATURE_AREA_FILES,
  "src/server/cloud/**/*.ts",
  "src/server/handlers/**/*.ts",
  "src/server/direct-edit/direct-edit-*.ts",
];

const CYCLE_DEEP_IMPORTS = [
  "src/server/direct-edit/direct-edit-ops.ts",
  "src/server/direct-edit/{direct-edit-props-ops,direct-edit-review-ops}.ts",
];

const ZOD_PARSE_FILES = [
  "src/server/direct-edit/{direct-edit-props-ops,direct-edit-review-ops}.ts",
];

const POST_READ_FILES = [
  "src/shared/actions/direct-edit/inspect-props-instance.ts",
];

const AREA_INDEX_FILES = [
  ...AUTH_FILES,
  "src/server/http/{app-canvas-routes,app-direct-edit-routes}.ts",
  ...FEATURE_AREA_FILES,
  "src/server/direct-edit/direct-edit-*.ts",
];

const studio: OxlintOverride[] = [
  {
    files: SERVER_FILES,
    rules: { "react-doctor/no-barrel-import": "off" },
  },
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
    files: ACTION_FILES,
    rules: { "studio/mcp-off-reason": "error" },
  },
  {
    excludeFiles: POST_READ_FILES,
    files: ACTION_FILES,
    rules: { "studio/read-verb-access": "error" },
  },
  {
    excludeFiles: LEGACY_UNTYPED_SCHEMAS,
    files: ACTION_FILES,
    rules: { "studio/action-schema-typed": "error" },
  },
  {
    excludeFiles: LEGACY_DOMAIN_OBJECTS,
    files: ACTION_FILES,
    rules: { "studio/action-domain-object": "error" },
  },
  {
    excludeFiles: LEGACY_TOOL_NAMES,
    files: ACTION_FILES,
    rules: { "studio/derived-tool-name": "error" },
  },
  {
    excludeFiles: NO_READ_CHANGES,
    files: ACTION_FILES,
    rules: { "studio/edit-invalidates": "error" },
  },
  {
    excludeFiles: SERVER_TESTS,
    files: [...SERVER_FILES, "src/shared/actions/_core/errors/*.ts"],
    rules: { "studio/error-name-unique": "error" },
  },
  {
    excludeFiles: SERVER_TESTS,
    files: SERVER_FILES,
    rules: {
      "studio/not-ready-unavailable": "error",
      "studio/read-service-io": "error",
      "studio/service-wired": "error",
    },
  },
  {
    excludeFiles: [...SERVER_TESTS, ...LEGACY_RUNTIME_CALLS],
    files: ADAPTER_FILES,
    rules: { "studio/no-adapter-runtime-call": "error" },
  },
  {
    files: FEATURE_HANDLER_FILES,
    rules: { "studio/no-input-default": "error" },
  },
  {
    excludeFiles: [...SERVER_TESTS, ...PROMISE_TASK_FILES],
    files: FEATURE_FILES,
    rules: { "studio/no-feature-async": "error" },
  },
  {
    excludeFiles: [...SERVER_TESTS, ...AUTH_FILES, ...ZOD_PARSE_FILES],
    files: NEW_SERVER_FILES,
    rules: { "studio/no-zod-import": "error" },
  },
  {
    excludeFiles: [...SERVER_TESTS, ...AUTH_FILES, ...CYCLE_DEEP_IMPORTS],
    files: AREA_INDEX_FILES,
    rules: { "studio/area-import-index": "error" },
  },
  {
    excludeFiles: LEGACY_DOM_QUERIES,
    files: ["src/ui/features/**/*.ts", "src/ui/features/**/*.tsx"],
    rules: { "studio/no-dom-query": "error" },
  },
  {
    files: ["src/ui/features/**/*.ts", "src/ui/features/**/*.tsx"],
    rules: { "studio/await-write": "error" },
  },
  {
    excludeFiles: [...LEGACY_APP_IMPORTS, "cloud/api/src/shared-actions.ts"],
    files: ["cloud/api/src/**/*.ts"],
    rules: { "studio/no-app-import": "error" },
  },
  {
    files: ["lint/decisions.ts"],
    rules: { "studio/narrow-override": "error" },
  },
  {
    files: ["lint/studio.ts", "lint/boundaries.ts"],
    rules: { "studio/frozen-exemption": "error" },
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
    excludeFiles: SERVER_TESTS,
    files: SERVER_FILES,
    rules: {
      "studio/function-verb": "error",
      "studio/service-api-effect": "error",
      "studio/service-file-name": "error",
      "studio/service-import-index": "error",
    },
  },
  {
    excludeFiles: [...SERVER_TESTS, ...LEGACY_SERVICE_CODE],
    files: SERVER_FILES,
    rules: {
      "studio/service-effect-only": "error",
      "studio/service-file-exports": "error",
    },
  },
  {
    excludeFiles: [
      ...SERVER_TESTS,
      ...SPEC_SERVICE_NAMES,
      ...LEGACY_SERVICE_NAMES,
    ],
    files: SERVER_FILES,
    rules: { "studio/service-role": "error" },
  },
  {
    excludeFiles: SERVER_TESTS,
    files: ADAPTER_FILES,
    rules: { "studio/no-adapter-service": "error" },
  },
  {
    files: ["src/server/main/live-layer.ts"],
    rules: { "studio/live-layer-domain": "error" },
  },
  {
    files: ["lint/decisions.ts"],
    rules: { "studio/no-fixable-off": "error" },
  },
  {
    excludeFiles: SERVER_TESTS,
    files: OPTIONAL_NULL_FILES,
    rules: { "studio/no-optional-null": "error" },
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
  {
    excludeFiles: SERVER_TESTS,
    files: AUTH_FILES,
    rules: {
      "studio/area-import-index": "error",
      "studio/boolean-name": "error",
      "studio/export-blocks": "error",
      "studio/no-short-name": "error",
      "studio/no-sync-fs": "error",
      "studio/no-undefined-type": "error",
      "studio/no-zod-import": "error",
      "studio/readonly-field": "error",
    },
  },
  {
    excludeFiles: [...SERVER_TESTS, "src/server/**/engine/**"],
    files: AUTH_FILES,
    rules: {
      "studio/module-function-verb": "error",
      "studio/predicate-name": "error",
    },
  },
];

export { STUDIO_PLUGIN, studio };
