const PROBE_FILES = "apps/api/src/tenant/probes/**";

const PLATFORM_FILES = "apps/api/src/platform/**";

const HANDLER_FILES = ["apps/desktop/src/server/handlers/**/*.ts"];

const SERVER_FILES = ["apps/desktop/src/server/**/*.ts"];

const FEATURE_UI_FILES = [
  "apps/desktop/src/ui/features/**/*.ts",
  "apps/desktop/src/ui/features/**/*.tsx",
];

const UI_FILES = [
  "apps/desktop/src/ui/**/*.ts",
  "apps/desktop/src/ui/**/*.tsx",
];

const ADAPTER_FILES = [
  "apps/desktop/src/server/http/**/*.ts",
  "apps/desktop/src/server/mcp/**/*.ts",
  "apps/desktop/src/server/agent-tools/**/*.ts",
];

const AUTH_FILES = [
  "apps/desktop/src/server/cloud/**/*.ts",
  "apps/desktop/src/server/store/{command-rules,device-bindings,local-org-scope,local-principal,org-scope,org-visibility,principal}.ts",
  "apps/desktop/src/shared/cloud-contracts.ts",
];

const OPTIONAL_NULL_FILES = [
  "apps/desktop/src/server/{platform,events,run-log,project-source,page-probe,handlers,main,ship,agent-tools,mcp-life,http}/**/*.ts",
];

const FEATURE_AREA_FILES = [
  "apps/desktop/src/server/viewport/**/*.ts",
  "apps/desktop/src/server/content/**/*.ts",
  "apps/desktop/src/server/{gallery,token-sweep,image-generate,project-ops}/**/*.ts",
];

const FEATURE_FILES = [
  ...FEATURE_AREA_FILES,
  "apps/desktop/src/server/cloud/checkout.ts",
];

const FEATURE_HANDLER_FILES = [
  "apps/desktop/src/server/handlers/{content,viewport,direct-edit,cloud,gallery,image,token,project}/**/*.ts",
];

const NEW_SERVER_FILES = [
  ...FEATURE_AREA_FILES,
  "apps/desktop/src/server/cloud/**/*.ts",
  ...HANDLER_FILES,
  "apps/desktop/src/server/direct-edit/direct-edit-*.ts",
];

const ADAPTER_IMPORT_FILES = [
  "apps/desktop/src/server/http/**/*.ts",
  "apps/desktop/src/server/mcp/**/*.ts",
  "apps/desktop/src/server/agent-tools/**/*.ts",
  "apps/desktop/src/server/variations/**/*.ts",
];

const TENANT_GATE_FILES = [
  "apps/api/src/tenant/{blobs,viewer-db,sql,db}.ts",
  "apps/api/src/tenant/{resolver,sweep-db}.ts",
  PLATFORM_FILES,
  "apps/api/src/tenant/repos/key-perm.ts",
  PROBE_FILES,
];

const ROUTE_FILES = [
  "apps/api/src/http/**/*.ts",
  "apps/desktop/src/server/publish/**/*.ts",
];

const UI_BUDGET_FILES = [
  "apps/desktop/src/ui/{features,app,kit,domain}/**/*.ts",
  "apps/desktop/src/ui/{features,app,kit,domain}/**/*.tsx",
];

const LINKED_FILES = [
  "apps/desktop/src/shared/publish.ts",
  "packages/common/actions/src/{publish,share}/**/*.ts",
  "apps/desktop/src/server/publish/**/*.ts",
  ...HANDLER_FILES,
  ...FEATURE_UI_FILES,
];

const DEAD_CODE_FILES = [
  "apps/api/src/{viewer,share}/**/*.ts",
  "apps/api/src/tenant/repos/share.ts",
  "apps/api/src/cron.ts",
  "apps/desktop/src/ui/features/share-publish-ship-export/publish-api.ts",
];

export {
  PROBE_FILES,
  PLATFORM_FILES,
  HANDLER_FILES,
  SERVER_FILES,
  ADAPTER_FILES,
  ADAPTER_IMPORT_FILES,
  AUTH_FILES,
  DEAD_CODE_FILES,
  FEATURE_AREA_FILES,
  FEATURE_FILES,
  FEATURE_HANDLER_FILES,
  FEATURE_UI_FILES,
  LINKED_FILES,
  NEW_SERVER_FILES,
  OPTIONAL_NULL_FILES,
  ROUTE_FILES,
  TENANT_GATE_FILES,
  UI_BUDGET_FILES,
  UI_FILES,
};
