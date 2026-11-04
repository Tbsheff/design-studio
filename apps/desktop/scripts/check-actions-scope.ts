const ROOTS = [
  "apps/desktop/src/server",
  "packages/common/actions/src",
  "apps/desktop/src/ui",
  "apps/api",
];

const SERVER_MAIN = "apps/desktop/src/server/main/**";

const EFFECT_FOLDERS = [
  ..."platform events run-log project-source page-probe handlers ship"
    .split(" ")
    .map((dir) => `apps/desktop/src/server/${dir}/**`),
  "packages/common/actions/src/**",
  "apps/api/**",
];

const NEW_FOLDERS = [
  ...EFFECT_FOLDERS,
  SERVER_MAIN,
  "apps/desktop/src/server/agent-tools/**",
  ..."kit domain platform features app"
    .split(" ")
    .map((dir) => `apps/desktop/src/ui/${dir}/**`),
];

const RUNTIME_ENTRIES = [
  "apps/desktop/src/server/http/**",
  "apps/desktop/src/server/mcp/**",
  "apps/desktop/src/server/agent-tools/**",
  SERVER_MAIN,
  "apps/desktop/src/server/thumbnail-worker.ts",
  "apps/desktop/src/server/worker-serve.ts",
  "apps/desktop/src/server/preview/route-graph-worker.ts",
  "apps/desktop/src/server/publish/worker-build.ts",
];

const ALL = ROOTS.map((root) => `${root}/**`);

export {
  ALL,
  EFFECT_FOLDERS,
  NEW_FOLDERS,
  ROOTS,
  RUNTIME_ENTRIES,
  SERVER_MAIN,
};
