import type { OxlintOverride } from "oxlint";

import {
  ADAPTER_FILES,
  AUTH_FILES,
  FEATURE_AREA_FILES,
  FEATURE_FILES,
  FEATURE_HANDLER_FILES,
  FEATURE_UI_FILES,
  HANDLER_FILES,
  NEW_SERVER_FILES,
  OPTIONAL_NULL_FILES,
  SERVER_FILES,
  UI_FILES,
} from "./studio-files.ts";
import { studioReview } from "./studio-review.ts";

const STUDIO_PLUGIN = "./lint/plugins/studio.js";

const AGGREGATORS = [
  "packages/common/actions/src/index.ts",
  "apps/desktop/src/server/main/live-layer.ts",
  "apps/desktop/src/server/http/mount-all.ts",
  "apps/desktop/src/server/mcp/registry.ts",
  "apps/desktop/src/server/agent-tools/registry.ts",
];

const DECISION_FILES = ["lint/decisions.ts"];

const CLOUD_FILES = ["apps/api/src/**/*.ts"];

const SERVER_TESTS = ["apps/desktop/src/server/**/*.test.ts"];

const SPEC_SERVICE_NAMES = [
  "apps/desktop/src/server/store/{authorizer,local-org-scope,local-principal,project-access}.ts",
  "apps/desktop/src/server/publish/cf-cli.ts",
  "apps/desktop/src/server/store/device-bindings.ts",
];

const LEGACY_SERVICE_NAMES = [
  "apps/desktop/src/server/cloud/cloud-session.ts",
  "apps/desktop/src/server/comments/comment-run-starter.ts",
  "apps/desktop/src/server/events/{change-feed,render-tracker}.ts",
  "apps/desktop/src/server/mcp-life/mcp-activity-log.ts",
  "apps/desktop/src/server/publish/{local-runtime,publish-planner,publish-service}.ts",
  "apps/desktop/src/server/share/{live-refresher,share-listener}.ts",
  "apps/desktop/src/server/store/studio-info.ts",
];

const LEGACY_SERVICE_CODE = [
  "apps/desktop/src/server/publish/local-runtime.ts",
];

const ACTION_FILES = ["packages/common/actions/src/**/*.ts"];

const LEGACY_UNTYPED_SCHEMAS = [
  "packages/common/actions/src/{canvas,comment,dev-server,pack,workspace}/schema.ts",
  "packages/common/actions/src/canvas/set-doc.ts",
  "packages/common/actions/src/direct-edit/{schema,apply-swap,create-component,delete-text,insert-component,insert-jsx,set-image,set-vector}.ts",
];

const LEGACY_DOMAIN_OBJECTS = [
  "packages/common/actions/src/direct-edit/{schema,apply-swap,create-component,delete-text,insert-component,insert-jsx,set-image,set-vector}.ts",
  "packages/common/actions/src/publish/{delete-comment,list-comments}.ts",
  "packages/common/actions/src/workspace/{get-tokens,list-projects,list-versions,search-projects}.ts",
  "packages/common/actions/src/direct-edit/{create-component,create-token,get-component-preview,insert-component,inspect-tokens,list-component-folders,list-components,update-tokens}.ts",
];

const LEGACY_TOOL_NAMES = [
  "packages/common/actions/src/canvas/{list-implicit-links,update-link}.ts",
  "packages/common/actions/src/version/list-hunks.ts",
];

const NO_READ_CHANGES = [
  "packages/common/actions/src/canvas/set-presence.ts",
  "packages/common/actions/src/share/set-cursor.ts",
  "packages/common/actions/src/comment/export.ts",
  "packages/common/actions/src/export/{export,export-folder,export-frame,export-handoff}.ts",
  "packages/common/actions/src/direct-edit/run.ts",
  "packages/common/actions/src/direct-edit/run-rules-test.ts",
  "packages/common/actions/src/viewport/run.ts",
];

const LEGACY_DOM_QUERIES = [
  "apps/desktop/src/ui/features/icons/use-icon-host.ts",
];

const LEGACY_CALLS = [
  "apps/desktop/src/server/http/{app-runs,components}-routes.ts",
];

const LEGACY_APP_IMPORTS = [
  "apps/api/src/http/{errors,groups/wire-errors,middleware/member-auth,groups/authorizer,middleware/viewer,middleware/org-grant,middleware/agent-auth,groups/projects,groups/gates}.ts",
  "apps/api/src/tenant/{resolver,viewer-db,repos/projects,db,current-org,blobs}.ts",
  "apps/api/src/auth/{rate-limit,permissions}.ts",
];

const PROMISE_TASK_FILES = ["apps/desktop/src/server/content/write-content.ts"];

const LEGACY_DEEP_IMPORTS = [
  "apps/desktop/src/server/direct-edit/direct-edit-ops.ts",
];

const LEGACY_LIST_PAGES = [
  "packages/common/actions/src/canvas/{list-flow-links,list-flow-params,list-frame-states,list-implicit-links,list-links}.ts",
  "packages/common/actions/src/comment/search-mention.ts",
  "packages/common/actions/src/connection/{list-activity,list-approvals}.ts",
  "packages/common/actions/src/dev-server/list-routes.ts",
  "packages/common/actions/src/direct-edit/{list-component-folders,list-components,list-insertable,list-swap-candidates}.ts",
  "packages/common/actions/src/publish/{list,list-comments}.ts",
  "packages/common/actions/src/share/list.ts",
  "packages/common/actions/src/studio/list-skills.ts",
  "packages/common/actions/src/version/{list,list-history,list-hunks}.ts",
  "packages/common/actions/src/workspace/{list-files,list-found-apps,list-projects,list-routes,list-variants,list-versions,search-projects}.ts",
];

const LEGACY_DELETE_ACTIONS = [
  "packages/common/actions/src/canvas/delete-link.ts",
  "packages/common/actions/src/cloud/delete.ts",
  "packages/common/actions/src/comment/{delete,delete-reply}.ts",
  "packages/common/actions/src/direct-edit/delete-text.ts",
  "packages/common/actions/src/publish/{delete,delete-comment}.ts",
];

const TENANT_SQL_FILES = [
  "apps/api/src/tenant/repos/**",
  "apps/api/src/tenant/{blobs,viewer-db,sql,db}.ts",
  "apps/api/src/tenant/probes/**",
];

const LEGACY_RUNTIME_SLOTS = [
  "apps/desktop/src/server/run-log/run-log-runtime.ts",
  "apps/desktop/src/server/app/dev-server-runtime.ts",
  "apps/desktop/src/server/canvas/links/link-runtime.ts",
  "apps/desktop/src/server/comments/comment-core.ts",
  "apps/desktop/src/server/content/content-runtime.ts",
  "apps/desktop/src/server/design-system/ops/library-core.ts",
  "apps/desktop/src/server/direct-edit/direct-edit-core.ts",
  "apps/desktop/src/server/export/export-core.ts",
  "apps/desktop/src/server/gallery/{deps,gallery-runtime}.ts",
  "apps/desktop/src/server/image-generate/{deps,image-generate-runtime}.ts",
  "apps/desktop/src/server/mcp-life/mcp-life-runtime.ts",
  "apps/desktop/src/server/preview/mcp-read-core.ts",
  "apps/desktop/src/server/project-ops/project-ops-runtime.ts",
  "apps/desktop/src/server/publish/legacy-link.ts",
  "apps/desktop/src/server/ship/ship-core.ts",
  "apps/desktop/src/server/store/{project-library-runtime,project-runtime,version-read-core,version-write-core,workspace-runtime}.ts",
  "apps/desktop/src/server/token-sweep/{deps,token-sweep-runtime}.ts",
  "apps/desktop/src/server/viewport/{deps,viewport-runtime}.ts",
];

const LEGACY_FEATURE_ASYNC = [
  "apps/desktop/src/server/direct-edit/{direct-edit-props-ops,direct-edit-review-ops}.ts",
  "apps/desktop/src/server/gallery/{create-gallery,gallery-files,gallery-source}.ts",
  "apps/desktop/src/server/image-generate/{create-image,gemini,generate-bytes,openai,place,remote,reuse}.ts",
  "apps/desktop/src/server/project-ops/{project-ops-create,project-ops-detail,project-ops-hidden}.ts",
  "apps/desktop/src/server/token-sweep/{source-files,sweep-tokens}.ts",
];

const AREA_INDEX_FILES = [
  ...AUTH_FILES,
  "apps/desktop/src/server/http/{app-canvas-routes,app-direct-edit-routes}.ts",
  ...FEATURE_AREA_FILES,
  "apps/desktop/src/server/direct-edit/direct-edit-*.ts",
  "apps/desktop/src/server/{gallery,token-sweep,image-generate,project-ops}/deps.ts",
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
    files: [
      "lint/plugins/studio/{facts,tool-facts,dead-code-rules,import-rules,boundary-rules,freeze-rules,probe-rules,catchup-rules,slice-rules,tsconfig-rules,autofix-rules,port-rules,reach-rules}.js",
    ],
    rules: { "node/no-sync": "off" },
  },
  {
    files: [
      "packages/common/actions/src/**",
      "apps/desktop/src/server/**",
      "apps/api/**",
    ],
    rules: { "unicorn/throw-new-error": "off" },
  },
  {
    files: ACTION_FILES,
    rules: {
      "studio/action-domain-name": "error",
      "studio/action-verb": "error",
      "studio/agent-off-reason": "error",
      "studio/bootstrap-off-reason": "error",
      "studio/description-tool-name": "error",
      "studio/mcp-off-reason": "error",
      "studio/read-verb-access": "error",
      "studio/write-needs-write-permission": "error",
    },
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
    files: [...SERVER_FILES, "packages/common/actions/src/_core/errors/*.ts"],
    rules: { "studio/error-name-unique": "error" },
  },
  {
    excludeFiles: SERVER_TESTS,
    files: SERVER_FILES,
    rules: {
      "studio/function-verb": "error",
      "studio/no-async-in-service": "error",
      "studio/not-ready-unavailable": "error",
      "studio/read-service-io": "error",
      "studio/service-api-effect": "error",
      "studio/service-file-name": "error",
      "studio/service-import-index": "error",
      "studio/service-tag-area": "error",
      "studio/service-wired": "error",
    },
  },
  {
    excludeFiles: [...SERVER_TESTS, ...LEGACY_CALLS],
    files: ADAPTER_FILES,
    rules: { "studio/no-adapter-runtime-call": "error" },
  },
  {
    files: FEATURE_HANDLER_FILES,
    rules: { "studio/no-input-default": "error" },
  },
  {
    excludeFiles: [
      ...SERVER_TESTS,
      ...PROMISE_TASK_FILES,
      ...LEGACY_FEATURE_ASYNC,
    ],
    files: FEATURE_FILES,
    rules: { "studio/no-feature-async": "error" },
  },
  {
    excludeFiles: [...SERVER_TESTS, ...AUTH_FILES],
    files: NEW_SERVER_FILES,
    rules: { "studio/no-zod-import": "error" },
  },
  {
    excludeFiles: [...SERVER_TESTS, ...AUTH_FILES, ...LEGACY_DEEP_IMPORTS],
    files: AREA_INDEX_FILES,
    rules: { "studio/area-import-index": "error" },
  },
  {
    excludeFiles: LEGACY_DOM_QUERIES,
    files: FEATURE_UI_FILES,
    rules: { "studio/no-dom-query": "error" },
  },
  {
    files: FEATURE_UI_FILES,
    rules: { "studio/await-write": "error", "studio/no-busy-flag": "error" },
  },
  {
    excludeFiles: LEGACY_APP_IMPORTS,
    files: CLOUD_FILES,
    rules: { "studio/no-app-import": "error" },
  },
  {
    files: DECISION_FILES,
    rules: {
      "studio/narrow-override": "error",
      "studio/override-needs-rule": "error",
    },
  },
  {
    files: ["lint/studio.ts", "lint/studio-review.ts", "lint/boundaries.ts"],
    rules: { "studio/frozen-exemption": "error" },
  },
  {
    files: HANDLER_FILES,
    rules: {
      "studio/derived-type-name": "error",
      "studio/handler-satisfies": "error",
      "studio/no-deep-area-import": "error",
      "studio/no-handler-node-global": "error",
      "studio/read-yields-read-service": "error",
    },
  },
  {
    excludeFiles: ["apps/desktop/src/server/platform/attempt/**"],
    files: SERVER_FILES,
    rules: { "studio/no-local-error-bridge": "error" },
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
    files: ["apps/desktop/src/server/main/live-layer.ts"],
    rules: { "studio/live-layer-domain": "error" },
  },
  {
    files: DECISION_FILES,
    rules: { "studio/no-fixable-off": "error" },
  },
  {
    excludeFiles: SERVER_TESTS,
    files: OPTIONAL_NULL_FILES,
    rules: { "studio/no-optional-null": "error" },
  },
  {
    excludeFiles: ["apps/desktop/src/server/platform/runtime-slot/**"],
    files: SERVER_FILES,
    rules: { "studio/no-runtime-map": "error" },
  },
  {
    excludeFiles: [
      ...SERVER_TESTS,
      "apps/desktop/src/server/direct-edit/engine/**",
    ],
    files: ["apps/desktop/src/server/**/engine/**/*.ts"],
    rules: { "studio/engine-pure": "error" },
  },
  {
    excludeFiles: ["lint/studio.ts", "lint/studio-review.ts"],
    files: ["lint/*.ts"],
    rules: { "studio/no-studio-override": "error" },
  },
  {
    files: ["apps/api/src/http/**/*.ts"],
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
    excludeFiles: ["apps/desktop/src/ui/platform/pack-api.ts"],
    files: UI_FILES,
    rules: { "studio/no-wire-cast": "error" },
  },
  {
    files: ["apps/desktop/src/ui/platform/**/*.ts"],
    rules: { "studio/no-cache-ttl": "error" },
  },
  {
    excludeFiles: ["apps/desktop/src/ui/platform/**"],
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
    excludeFiles: [...SERVER_TESTS, "apps/desktop/src/server/**/engine/**"],
    files: AUTH_FILES,
    rules: {
      "studio/module-function-verb": "error",
      "studio/predicate-name": "error",
    },
  },
  {
    excludeFiles: LEGACY_LIST_PAGES,
    files: ACTION_FILES,
    rules: { "studio/list-page": "error" },
  },
  {
    excludeFiles: LEGACY_DELETE_ACTIONS,
    files: ACTION_FILES,
    rules: { "studio/delete-destructive": "error" },
  },
  {
    excludeFiles: TENANT_SQL_FILES,
    files: CLOUD_FILES,
    rules: { "studio/tenant-sql-in-repos": "error" },
  },
  {
    files: ["apps/api/src/tenant/repos/**/*.ts"],
    rules: {
      "studio/no-org-id-param": "error",
      "studio/repo-no-viewer-scope": "error",
    },
  },
  {
    excludeFiles: ["apps/api/src/tenant/repos/key-perm.ts"],
    files: ["apps/api/src/tenant/repos/**/*.ts"],
    rules: { "studio/repo-uses-tq": "error" },
  },
  {
    files: ["apps/api/src/mcp/**/*.ts"],
    rules: { "studio/cloud-tool-verb": "error" },
  },
  {
    files: ["lint/plugins/studio/frozen.js", ...DECISION_FILES],
    rules: { "studio/wide-exemption": "error" },
  },
  {
    excludeFiles: [...SERVER_TESTS, ...LEGACY_RUNTIME_SLOTS],
    files: SERVER_FILES,
    rules: { "studio/no-new-runtime-slot": "error" },
  },
  {
    files: ["apps/api/src/tenant/**/*.ts"],
    rules: { "studio/no-scope-param": "error" },
  },
  {
    files: CLOUD_FILES,
    rules: {
      "studio/cloud-one-runtime": "error",
      "studio/cloud-platform-layer": "error",
      "studio/cloud-run-entry": "error",
      "studio/no-direct-bindings": "error",
      "studio/no-local-http-status": "error",
      "studio/no-open-tag": "error",
      "studio/no-plain-error": "error",
    },
  },
  ...studioReview,
];

export { STUDIO_PLUGIN, studio };
