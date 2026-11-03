import { createRequire } from "node:module";

import type { OxlintOverride } from "oxlint";

import { presetRules, vitestRules } from "./presets.ts";

type RuleModule = {
  meta?: { deprecated?: unknown; docs?: { requiresTypeChecking?: boolean } };
  framework?: string;
  tags?: string[];
};

type RuleMap = Record<string, RuleModule>;

const load = createRequire(import.meta.url);

const rulesOf = (specifier: string): RuleMap => {
  const loaded: { rules?: RuleMap; default?: { rules?: RuleMap } } =
    load(specifier);
  return loaded.rules ?? loaded.default?.rules ?? {};
};

const levelOf = (value: unknown) => (Array.isArray(value) ? value[0] : value);

const isUnset = (key: string) => {
  const level = levelOf(presetRules[key]);
  return level === undefined || level === "off" || level === 0;
};

const NATIVE_ON: Record<string, unknown> = {
  "capitalized-comments": "error",
  complexity: ["error", 20],
  "id-length": "error",
  "init-declarations": "error",
  "max-depth": ["error", 4],
  "max-lines": ["error", 500],
  "max-lines-per-function": ["error", 80],
  "max-params": ["error", 4],
  "max-statements": ["error", 30],
  "new-cap": [
    "error",
    {
      capIsNewExceptionPattern: String.raw`^(Schema|Context|Data|Layer|Effect|Stream|PubSub|Option)\.`,
    },
  ],
  "no-console": "error",
  "no-continue": "error",
  "no-implicit-coercion": "error",
  "no-magic-numbers": ["error", { ignore: [-1, 0, 1, 2] }],
  "no-ternary": "error",
  "no-undefined": "error",
  "no-underscore-dangle": ["error", { allow: ["_tag"] }],
  "import/exports-last": "error",
  "import/extensions": "error",
  "import/group-exports": "error",
  "import/max-dependencies": ["error", { max: 20 }],
  "import/no-anonymous-default-export": "error",
  "import/no-commonjs": "error",
  "import/no-cycle": ["warn", { ignoreTypes: true }],
  "import/no-default-export": "error",
  "import/no-dynamic-require": "error",
  "import/no-namespace": "error",
  "import/no-nodejs-modules": "error",
  "import/no-relative-parent-imports": "error",
  "import/no-unassigned-import": "error",
  "import/unambiguous": "error",
  "jsdoc/require-param": "error",
  "jsdoc/require-param-type": "error",
  "jsdoc/require-returns": "error",
  "jsdoc/require-returns-type": "error",
  "jsx-a11y/no-autofocus": "error",
  "node/no-process-env": "error",
  "node/no-sync": "error",
  "oxc/no-map-spread": "error",
  "promise/prefer-await-to-then": "error",
  "react/forbid-component-props": "error",
  "react/forward-ref-uses-ref": "error",
  "react/jsx-boolean-value": "error",
  "react/jsx-filename-extension": ["error", { extensions: [".tsx"] }],
  "react/jsx-max-depth": "error",
  "react/jsx-no-literals": "error",
  "react/jsx-props-no-spreading": "error",
  "react/no-array-index-key": "error",
  "react/no-multi-comp": "error",
  "react/no-unknown-property": "error",
  "react/only-export-components": "error",
  "react-perf/jsx-no-jsx-as-prop": "error",
  "react-perf/jsx-no-new-array-as-prop": "error",
  "react-perf/jsx-no-new-function-as-prop": "error",
  "react-perf/jsx-no-new-object-as-prop": "error",
  "typescript/consistent-indexed-object-style": "error",
  "typescript/explicit-function-return-type": "error",
  "typescript/explicit-member-accessibility": "error",
  "typescript/explicit-module-boundary-types": "error",
  "typescript/no-require-imports": "error",
  "typescript/no-var-requires": "error",
  "typescript/prefer-readonly-parameter-types": "error",
  "typescript/require-await": "error",
  "unicorn/explicit-length-check": "error",
  "unicorn/max-nested-calls": "error",
  "unicorn/no-array-callback-reference": "error",
  "unicorn/no-immediate-mutation": "error",
  "unicorn/no-nested-ternary": "error",
  "unicorn/no-process-exit": "error",
  "unicorn/prefer-global-this": "error",
  "unicorn/prefer-string-raw": "error",
  "unicorn/prefer-top-level-await": "error",
  "sonarjs/cognitive-complexity": ["error", 20],
  "sonarjs/cyclomatic-complexity": ["error", { threshold: 20 }],
  "sonarjs/max-lines": ["error", { maximum: 500 }],
  "sonarjs/max-lines-per-function": ["error", { maximum: 80 }],
};

export const OFF_REASONS: Record<string, string> = {
  "anti-slop/require-safety-comment-for-type-assertion":
    "Requires a comment; Tyler chose the comment rules off (no-comments hook).",
  "jsdoc-js/require-jsdoc":
    "Requires a comment; Tyler chose the comment rules off. The plugin is not loaded.",
  "tsdoc/syntax":
    "Comment rule family; Tyler chose it off. The plugin is not loaded.",
  "sonarjs/file-header":
    "Requires a header comment, which the no-comments hook forbids.",
  "sort-imports": "oxfmt sortImports owns import order; the two orders fight.",
  "sonarjs/arrow-function-convention":
    "Fights the formatter (arrowParens: always).",
  "import/prefer-default-export": "Contradicts import/no-default-export.",
  "import/no-named-export":
    "With import/no-default-export it bans every export.",
  "node/no-top-level-await": "Contradicts unicorn/prefer-top-level-await.",
  "oxc/no-async-await":
    "Bans ES2017 syntax the ES2023 target has; contradicts promise/prefer-await-to-then.",
  "oxc/no-optional-chaining":
    "Bans ES2020 syntax the ES2023 target has; contradicts typescript/prefer-optional-chain.",
  "oxc/no-rest-spread-properties":
    "Bans ES2018 syntax the ES2023 target has; contradicts prefer-object-spread.",
  "react/react-in-jsx-scope":
    "tsconfig uses jsx react-jsx; React is not in scope by design.",
  "unicorn/no-null":
    "The wire contract uses null; no-undefined stays on as the other side.",
  "unicorn/number-literal-case":
    "Broken upstream (oxc-project/oxc#21949), so Ultracite keeps it off.",
  "unicorn/prefer-reflect-apply": "Contradicts anti-slop/no-reflect-apply.",
  "github/no-dataset": "Contradicts unicorn/prefer-dom-node-dataset.",
  "sonarjs/no-reference-error":
    "The JS plugin bridge gives no globals, so it flags every identifier.",
  "vitest/no-importing-vitest-globals":
    "Contradicts vitest/prefer-importing-vitest-globals; tests import from vitest.",
};

const REACT_DOCTOR_SKIP_TAGS = new Set([
  "ink",
  "r3f",
  "webgl",
  "three",
  "react-native",
  "server-action",
  "project-analysis",
]);

const NATIVE_REACT_IDS = new Set(
  [...Object.keys(presetRules), ...Object.keys(NATIVE_ON)]
    .filter((key) => /^(react|jsx-a11y|react-perf)\//u.test(key))
    .map((key) => key.split("/")[1])
);

const reactDoctorKeeps = (id: string, rule: RuleModule) =>
  rule.framework === "global" &&
  !(rule.tags ?? []).some((tag) => REACT_DOCTOR_SKIP_TAGS.has(tag)) &&
  !NATIVE_REACT_IDS.has(id);

const eslintKeeps = (_id: string, rule: RuleModule) =>
  !rule.meta?.deprecated && !rule.meta?.docs?.requiresTypeChecking;

const PLUGINS: [string, string, (id: string, rule: RuleModule) => boolean][] = [
  ["github", "eslint-plugin-github", eslintKeeps],
  ["sonarjs", "eslint-plugin-sonarjs", eslintKeeps],
  ["react-doctor", "oxlint-plugin-react-doctor", reactDoctorKeeps],
];

const pluginRules = (
  prefix: string,
  specifier: string,
  keeps: (id: string, rule: RuleModule) => boolean
) =>
  Object.entries(rulesOf(specifier))
    .filter(([id, rule]) => keeps(id, rule) && isUnset(`${prefix}/${id}`))
    .map(([id]) => [`${prefix}/${id}`, "error"] as const);

const typeAwareSonar = Object.entries(rulesOf("eslint-plugin-sonarjs"))
  .filter(([, rule]) => rule.meta?.docs?.requiresTypeChecking)
  .map(([id]) => `sonarjs/${id}`);

const off = (keys: string[]) =>
  Object.fromEntries(keys.map((key) => [key, "off"]));

export const decisions = {
  rules: {
    ...Object.fromEntries(
      PLUGINS.flatMap(([prefix, specifier, keeps]) =>
        pluginRules(prefix, specifier, keeps)
      )
    ),
    ...NATIVE_ON,
    ...off(typeAwareSonar),
    ...off(
      Object.keys(OFF_REASONS).filter(
        (key) => !/^(jsdoc-js|tsdoc|vitest)\//u.test(key)
      )
    ),
  },
};

type LintRules = NonNullable<OxlintOverride["rules"]>;

export const vitestAll: LintRules = Object.fromEntries(
  Object.entries(vitestRules).map(([key, value]) => [
    key,
    levelOf(value) === "off" ? ("error" as const) : value,
  ])
);
vitestAll["vitest/no-importing-vitest-globals"] = "off";
vitestAll["vitest/valid-title"] = ["error", { allowArguments: true }];

export const playwrightAll: LintRules = Object.fromEntries(
  Object.entries(rulesOf("eslint-plugin-playwright"))
    .filter(([id, rule]) => eslintKeeps(id, rule))
    .map(([id]) => [`playwright/${id}`, "error" as const])
);

const SERVER_MAIN = "src/server/main/**";

const NODE_RUNTIMES = [
  "src/server/**",
  "src/**/*.test.ts",
  "desktop/**",
  "scripts/**",
  "e2e/**",
  "cloud/**",
  "lint/**",
  "*.config.ts",
];

export const SCOPED_OFF_REASONS: Record<string, string> = {
  "import/no-relative-parent-imports":
    "Off in src/ui/app files: the app composes sibling folders (features, platform, domain, kit) and the studio files import from the parent app folder. The budget-0 app folder has no shim to avoid this.",
  "github/filenames-match-regex":
    "Off in src/ui/app/App.tsx: the Vite entry and importers fix the file name App.tsx.",
  "unicorn/filename-case":
    "Off in src/ui/app/App.tsx: the Vite entry and importers fix the file name App.tsx.",
  "import/no-unassigned-import":
    "Off in src/ui/app/main.tsx: the Vite entry imports the global css file for its side effect.",
  "react/only-export-components":
    "Off in src/ui/app/screens.tsx: the preload wrapper exports lazy screens next to a helper.",
  "react/jsx-props-no-spreading":
    "Off in src/ui/app/screens.tsx: the preload wrapper forwards props to a lazy component.",
  "import/no-nodejs-modules":
    "Off where the code runs on Node: it can never reach 0 there. The coarse ban covers browser code.",
  "no-console":
    "Off in the logger and in scripts only (plan 5.2). Other server code logs through platform/logger.",
  "node/no-process-env":
    "Off in the config module, desktop/env.ts and the server entry, which own env access (plan 5.2).",
  "unicorn/no-process-exit":
    "Off in the server entry, which owns the process and its exit codes.",
  "node/no-sync":
    "Off in desktop/build.ts, the data lock, the resource lookup, the path checks and the event log exit flush, whose callers are sync (plan 5.2).",
  "import/no-default-export":
    "Off in *.config.ts and the cloud/api Worker entry: the tools and the Workers runtime load a default export.",
  "sonarjs/no-implicit-dependencies":
    "Off in cloud/api platform files that import cloudflare:workers (a runtime module), and in auth/options.ts until cloud/api/package.json lists @better-auth/api-key and @better-auth/passkey.",
  "unicorn/throw-new-error":
    "Off in src/shared/contract, src/server and cloud/api: its autofix breaks every TaggedError class (D29).",
  "import/max-dependencies":
    "Off in generated files and the per-context index, routes and handlers files, which import every op of a context (D29).",
  "max-lines":
    "Off in generated files and the per-context index, routes and handlers files, which list every op of a context (D29).",
};

export const APP_BUDGET_ZERO_GLOBS = ["src/ui/app/**"];

export const decisionOverrides: OxlintOverride[] = [
  {
    files: [
      "src/ui/app/App.tsx",
      "src/ui/app/app-notice.tsx",
      "src/ui/app/app-screen.tsx",
      "src/ui/app/main.tsx",
      "src/ui/app/screen-boundary.tsx",
      "src/ui/app/screens.tsx",
      "src/ui/app/studio.tsx",
      "src/ui/app/studio/bind-studio-commands.ts",
      "src/ui/app/studio/center-bars.ts",
      "src/ui/app/studio/center-props.ts",
      "src/ui/app/studio/export-layer.tsx",
      "src/ui/app/studio/left-props-panels.tsx",
      "src/ui/app/studio/left-props.ts",
      "src/ui/app/studio/project-model.ts",
      "src/ui/app/studio/request-model.ts",
      "src/ui/app/studio/rules-slot.tsx",
      "src/ui/app/studio/run-model.ts",
      "src/ui/app/studio/share-layer.tsx",
      "src/ui/app/studio/ship-layer.tsx",
      "src/ui/app/studio/studio-center.tsx",
      "src/ui/app/studio/studio-context.ts",
      "src/ui/app/studio/studio-core-types.ts",
      "src/ui/app/studio/studio-left.tsx",
      "src/ui/app/studio/studio-ready.tsx",
      "src/ui/app/studio/studio-right.tsx",
      "src/ui/app/studio/studio-run-types.ts",
      "src/ui/app/studio/studio-system.tsx",
      "src/ui/app/studio/studio-ui-types.ts",
      "src/ui/app/studio/token-model.ts",
      "src/ui/app/studio/use-home-variations-handoff.ts",
      "src/ui/app/studio/use-studio-base.ts",
      "src/ui/app/studio/use-studio-compose.ts",
      "src/ui/app/studio/use-studio-edit.ts",
      "src/ui/app/studio/use-studio-effects.ts",
      "src/ui/app/studio/use-studio-history.ts",
      "src/ui/app/studio/use-studio-panes.ts",
      "src/ui/app/studio/use-studio-run.ts",
      "src/ui/app/studio/use-studio-state.ts",
      "src/ui/app/use-command-layer.ts",
      "src/ui/app/use-session.ts",
    ],
    rules: {
      "import/no-relative-parent-imports": "off",
    },
  },
  {
    files: ["src/ui/app/App.tsx"],
    rules: {
      "github/filenames-match-regex": "off",
      "unicorn/filename-case": "off",
    },
  },
  {
    files: ["src/ui/app/main.tsx"],
    rules: {
      "import/no-unassigned-import": "off",
    },
  },
  {
    files: ["src/ui/app/screens.tsx"],
    rules: {
      "react-doctor/only-export-components": "off",
      "react/jsx-props-no-spreading": "off",
      "react/only-export-components": "off",
    },
  },
  {
    files: [
      "src/server/cloud/cloud-fetch.ts",
      "src/server/cloud/cloud-link-client.ts",
      "src/server/cloud/cloud-link-rows.ts",
      "src/server/cloud/cloud-list-client.ts",
      "src/server/publish/linked-publication-store.ts",
      "src/server/publish/linked-publication-writer.ts",
      "src/server/share/linked-share-writer.ts",
      "src/ui/domain/deps.ts",
      "src/ui/features/commands/deps.ts",
      "src/ui/features/comments/deps.ts",
      "src/ui/features/design-system/deps.ts",
      "src/ui/features/home/deps.ts",
      "src/ui/features/inspector/deps.ts",
      "src/ui/features/versions-layers-tokens/deps.ts",
    ],
    rules: {
      "import/no-relative-parent-imports": "off",
    },
  },
  {
    files: [
      "cloud/api/src/http/share-routes.ts",
      "cloud/api/src/http/viewer-routes.ts",
      "cloud/api/src/mcp/layer.ts",
      "cloud/api/src/mcp/mount.ts",
      "cloud/api/src/mcp/rpc.ts",
      "cloud/api/src/mcp/tools.ts",
      "cloud/api/src/tenant/repos/agent-request.ts",
      "cloud/api/src/viewer/gate.ts",
      "cloud/api/src/viewer/layer.ts",
      "cloud/api/src/viewer/read-password.ts",
      "cloud/api/src/viewer/read-site-file.ts",
      "cloud/api/src/viewer/unlock.ts",
      "cloud/api/src/share/add-comment.ts",
      "cloud/api/src/share/layer.ts",
      "cloud/api/src/share/read-share.ts",
      "cloud/api/src/platform/share-live.ts",
      "cloud/api/src/tenant/repos/share.ts",
      "cloud/api/src/tenant/sweep-db.ts",
      "src/server/handlers/run/get-context.ts",
      "src/server/handlers/run/get.ts",
      "src/server/handlers/run/handlers.ts",
      "src/server/handlers/run/list.ts",
      "src/server/handlers/run/live.ts",
      "src/server/handlers/run/rename.ts",
      "src/server/handlers/run/set-permission.ts",
      "src/server/handlers/run/set-queue.ts",
      "src/server/handlers/run/set-steer.ts",
      "src/server/handlers/run/start.ts",
      "src/server/handlers/run/stop.ts",
      "src/server/run-log/run-log-controls.ts",
      "src/server/run-log/run-log-reads.ts",
      "src/server/run-log/run-log-runtime.ts",
      "src/server/run-log/run-log-store.ts",
      "src/server/run-log/run-log-writer.ts",
      "src/server/http/app-run-start.ts",
      "src/shared/actions/run/get-context.ts",
      "src/shared/actions/run/get.ts",
      "src/shared/actions/run/list.ts",
      "src/shared/actions/run/rename.ts",
      "src/shared/actions/run/set-permission.ts",
      "src/shared/actions/run/set-queue.ts",
      "src/shared/actions/run/set-steer.ts",
      "src/shared/actions/run/start.ts",
      "src/shared/actions/run/stop.ts",
    ],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: [
      "src/shared/actions/run/list.ts",
      "src/server/run-log/run-log-reads.ts",
    ],
    rules: { "id-length": "off" },
  },
  {
    files: ["cloud/api/src/mcp/rpc.ts", "cloud/api/src/mcp/tools.ts"],
    rules: {
      "anti-slop/no-known-value-widening": "off",
      "anti-slop/no-unknown-parameters": "off",
      "anti-slop/no-unsafe-dictionary-type": "off",
    },
  },
  {
    files: [
      "cloud/api/src/tenant/repos/comments.ts",
      "src/shared/actions/token/apply.ts",
      "src/server/handlers/token/{apply,handlers,live}.ts",
      "src/shared/actions/token/errors/status.ts",
      "src/server/token-sweep/deps.ts",
      "src/ui/features/token-sweep/deps.ts",
      "src/shared/actions/gallery/{create,inspect}.ts",
      "src/server/handlers/gallery/{create,handlers,inspect,live}.ts",
      "src/shared/actions/gallery/errors/status.ts",
      "src/server/gallery/deps.ts",
      "src/server/gallery/engine/axes.ts",
      "src/ui/features/gallery/deps.ts",
    ],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: ["src/server/gallery/engine/page.ts"],
    rules: { "github/unescaped-html-literal": "off" },
  },
  {
    files: ["src/server/image-generate/openai.ts"],
    rules: { "id-length": "off" },
  },
  {
    files: ["src/server/image-generate/mock-image.ts"],
    rules: {
      "id-length": "off",
      "no-magic-numbers": "off",
      "sonarjs/shorthand-property-grouping": "off",
    },
  },
  {
    files: ["src/server/image-generate/provider-env.ts"],
    rules: { "node/no-process-env": "off" },
  },
  {
    files: [
      "src/shared/actions/image/{create,inspect}.ts",
      "src/shared/actions/image/errors/status.ts",
      "src/server/handlers/image/{create,handlers,inspect,live}.ts",
      "src/server/image-generate/deps.ts",
      "src/ui/features/image-generate/deps.ts",
    ],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: [
      "src/server/viewport/engine/cells.ts",
      "src/ui/features/viewport/matrix-model.ts",
    ],
    rules: { "no-magic-numbers": "off" },
  },
  {
    files: [
      "src/server/gallery/create-gallery.ts",
      "src/server/viewport/create-matrix.ts",
    ],
    rules: { "id-length": "off" },
  },
  {
    files: [
      "src/server/handlers/viewport/{create,handlers,live,run}.ts",
      "src/server/viewport/{deps,probe}.ts",
      "src/shared/actions/viewport/{create,run}.ts",
      "src/shared/actions/viewport/errors/status.ts",
      "src/ui/features/viewport/deps.ts",
    ],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: [
      "src/server/content/{content-runtime,content-writer,write-content}.ts",
      "src/server/handlers/content/{apply,handlers,live}.ts",
      "src/shared/actions/content/apply.ts",
      "src/shared/actions/content/errors/status.ts",
      "src/ui/features/content/deps.ts",
    ],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: ["src/server/content/engine/random.ts"],
    rules: { "no-bitwise": "off" },
  },
  { files: NODE_RUNTIMES, rules: { "import/no-nodejs-modules": "off" } },
  {
    files: ["src/server/platform/logger/**", "scripts/**"],
    rules: { "no-console": "off" },
  },
  {
    files: ["src/server/platform/config/**", "desktop/env.ts"],
    rules: { "node/no-process-env": "off" },
  },
  {
    files: [SERVER_MAIN],
    rules: { "node/no-process-env": "off", "unicorn/no-process-exit": "off" },
  },
  {
    files: [
      "src/server/events/{bus,event-queue,event-core,event-log,event-writer,render-tracker,save-lanes,save-queue}.ts",
      "src/server/handlers/events/live.ts",
      "src/server/events/{change-feed,source-change}.ts",
      "src/server/events/planned-feed.ts",
      "src/server/events/render-wait.ts",
      "src/server/platform/config/index.ts",
      "src/server/platform/call-origin/index.ts",
      "src/server/platform/git/batch-reader.ts",
      "src/server/platform/git/objects.ts",
      "src/server/platform/git/run-git.ts",
      "src/server/platform/git/user-git.ts",
      "src/server/platform/process/worker-client.ts",
      "src/server/platform/resources/index.ts",
      "src/server/platform/tool-policy/**",
      "src/ui/platform/{http,pack-api,session}.ts",
      "src/server/project-source/source.ts",
      "src/server/run-log/run-list.ts",
      SERVER_MAIN,
      "src/server/direct-edit/change-feed.ts",
      "src/server/direct-edit/planned-feed.ts",
      "src/server/git/user-git.ts",
      "src/server/preview/{ports,render-contract,render-wait}.ts",
      "src/server/cloud/{cloud-migration-runner,outbox-store,sync-runner}.ts",
      "src/server/store/{device-bindings,authorizer,data-lock,default-folder,events,git-objects,local-principal,principal,mutex,project-access,project-org,skill-store,starters,studio-info}.ts",
      "src/{server/handlers/_core/handler,server/handlers/_core/run-action,server/handlers/studio/handlers,server/handlers/studio/health,server/handlers/studio/list-skills,server/handlers/studio/live,shared/actions/studio/health,shared/actions/studio/list-skills}.ts",
      "src/server/{http/mount,http/mount-all,handlers/_core/wire-error,mcp/registry,agent-tools/registry,agent-tools/sdk-shape}.ts",
      "{cloud/publish-worker/src/protocol,src/server/handlers/version/{live,handlers,list,get,inspect-diff,list-history,list-hunks,apply-history,apply-hunk,create-session,delete-session,rename,restore,restore-history},src/server/store/version-{read,read-core,store,write,write-core,writer},src/shared/actions/version/{schema,list,get,inspect-diff,list-history,list-hunks,apply-history,apply-hunk,create-session,delete-session,rename,restore,restore-history},src/server/handlers/publish/{live,get,handlers,inspect,list,list-comments,publish,unpublish,restore,delete-comment,start,stop,delete,set,apply},src/server/publish/{cf-cli,publish-service,publish-core,publish-store,legacy-link,plan-card,plan-input,plan-legacy,publish-planner,publish-remote-reads,publish-remote-writes},src/shared/actions/_core/http-status,src/shared/actions/_core/errors/all,src/shared/actions/publish/{errors/status,get,inspect,list,list-comments,publish,unpublish,restore,delete-comment,start,stop,delete,set,apply},src/server/handlers/share/{live,handlers,list,create,delete,update,set-cursor,set-lan},src/server/share/{share-core,share-store,share-listener,live-refresher,share-attempt,share-cards,share-link-store,share-links},src/shared/actions/share/{list,create,delete,update,set-cursor,set-lan},src/server/handlers/comment/{live,handlers,list,search-mention,create,update,delete,delete-reply,create-reply,export,insert,move,set-resolved,start},src/server/comments/{comment-core,comment-reads,comment-run-ops,comment-store,comment-thread-ops,comment-thread-store,comment-page,work-tree,index,comment-insert,frame-target,comment-run-starter,run-payload,run-watch},src/shared/actions/comment/{schema,errors/status,list,search-mention,create,update,delete,delete-reply,create-reply,export,insert,move,set-resolved,start},src/server/handlers/ship/{live,handlers,get-plan,inspect,publish,get-settings,set-settings},src/server/ship/{ship-core,ship-plans,ship-settings,ship-store,ship-runner},src/shared/actions/ship/{schema,get-plan,inspect,publish,get-settings,set-settings},src/server/handlers/export/{live,handlers,get-code,export,export-frame,export-folder,export-handoff,get-handoff},src/server/export/{export-core,export-store,copy-target,export-writer,export-file,export-runs,export-frames,export-write,folder-export,frame-selector},src/shared/actions/export/{schema,get-code,export,export-frame,export-folder,export-handoff,get-handoff},src/server/handlers/pack/{live,handlers,list,get-pack,inspect-pack,get-draft,inspect-draft,apply-pack,create-draft,create-pack,delete-pack,duplicate-pack,export-pack,import-pack,list-summary,list-problem,publish-draft,set-pack,start-editor,update-pack},src/server/design-system/ops/{library-core,library-reads,pack-store,library-backing,library-cards,library-draft-input,library-drafts,library-writes,pack-writer},src/shared/actions/pack/{schema,list,get-pack,inspect-pack,get-draft,inspect-draft,errors/status,errors/pack-exists,apply-pack,create-draft,create-pack,delete-pack,duplicate-pack,export-pack,import-pack,list-summary,list-problem,publish-draft,set-pack,start-editor,update-pack},src/server/handlers/workspace/{live,handlers,get-doctor,get-port-plan,get-usage,list-projects,search-projects,list-found-apps,list-versions,list-files,get-file,list-variants,list-routes,get-frame-html,get-tokens,get-design-md,get-screenshot,get-run-context},src/server/variations/element-variants,src/server/preview/{mcp-read-core,mcp-read-store,doctor-read,usage-read,project-list-read,project-search-read,found-apps-read,version-list-read,file-read,variant-read,route-read,frame-source,frame-html-read,frame-shot-pick,frame-shot-read,token-read,warm-upstream,run-context-read},src/server/mcp/tool-result,src/server/platform/attempt/index,src/shared/actions/workspace/{schema,get-doctor,get-port-plan,get-usage,list-projects,search-projects,list-found-apps,list-versions,list-files,get-file,list-variants,list-routes,get-frame-html,get-tokens,get-design-md,get-screenshot,get-run-context}}.ts",
      "src/server/agent/legacy/agent-ops.ts",
      "src/server/agent/legacy/direct-edit.ts",
      "scripts/stamp/{names,templates,templates-ui,write}.ts",
      "scripts/stamp/probes/*.ts",
    ],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: [
      "src/server/direct-edit/{direct-edit-core,direct-edit-insert-ops,direct-edit-ops}.ts",
      "src/server/handlers/direct-edit/{get-review,get-rules,import-figma,inspect-props-instance,list-props-components,run-review,run-rules-test,set-props,set-rules,set-variant-classes,apply-review-fix,apply-swap,apply,create-component,create-token,delete-text,get-component-preview,get-design-system,get-preview,get-tree,get-tweaks,handlers,insert-component,insert-jsx,inspect-tokens,list-component-folders,list-components,list-insertable,list-swap-candidates,live,run,set-image,set-vector,update-tokens,update-tweaks}.ts",
      "src/server/http/app-direct-edit-routes.ts",
      "src/shared/actions/direct-edit/{get-review,get-rules,import-figma,inspect-props-instance,list-props-components,run-review,run-rules-test,set-props,set-rules,set-variant-classes,apply-review-fix,apply-swap,apply,create-component,create-token,delete-text,get-component-preview,get-design-system,get-preview,get-tree,get-tweaks,insert-component,insert-jsx,inspect-tokens,list-component-folders,list-components,list-insertable,list-swap-candidates,run,set-image,set-vector,update-tokens,update-tweaks}.ts",
      "src/shared/actions/direct-edit/errors/{direct-edit-conflict,direct-edit-failed,direct-edit-not-found,status}.ts",
    ],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: [
      "src/server/direct-edit/{direct-edit-props-ops,direct-edit-review-ops}.ts",
    ],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: ["src/server/agent/types.ts"],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: ["src/server/direct-edit/direct-edit-core.ts"],
    rules: { "sonarjs/max-union-size": "off" },
  },
  {
    files: ["src/server/direct-edit/{direct-edit-ops,direct-edit-ref}.ts"],
    rules: { "anti-slop/no-unsafe-dictionary-type": "off" },
  },
  {
    files: [
      "src/server/{cloud/{cloud-session,cloud-session-store,cloud-client,cloud-session-writer},handlers/cloud/{get,set,delete,live,handlers}}.ts",
      "src/shared/actions/cloud/{get,set,delete}.ts",
      "src/server/canvas/links/link-{ops,runtime,store,writer}.ts",
      "src/server/canvas/canvas-{ops,runtime,store,writer}.ts",
      "src/server/handlers/canvas/{apply-implicit-link,create-flow,create-link,delete-link,get-doc,handlers,list-flow-links,list-flow-params,list-frame-states,list-implicit-links,list-links,live,set-doc,set-frame-state,set-presence,set-start-link,update-frame-session,update-link}.ts",
      "src/shared/actions/canvas/{apply-implicit-link,create-flow,create-link,delete-link,get-doc,index,list-flow-links,list-flow-params,list-frame-states,list-implicit-links,list-links,routes,schema,set-doc,set-frame-state,set-presence,set-start-link,update-frame-session,update-link}.ts",
    ],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: [
      "src/server/canvas/canvas-ops.ts",
      "src/server/canvas/links/link-{ops,tools}.ts",
      "src/ui/frameStates.ts",
    ],
    rules: {
      "anti-slop/no-conditional-empty-object-spread": "warn",
      "anti-slop/require-readable-spacing": "warn",
      "eslint/max-params": "warn",
      "eslint/no-ternary": "warn",
      "eslint/no-undefined": "warn",
      "sonarjs/shorthand-property-grouping": "warn",
      "typescript/explicit-module-boundary-types": "warn",
    },
  },
  {
    files: [
      "src/shared/actions/canvas/{schema,create-flow,set-frame-state,update-frame-session}.ts",
    ],
    rules: {
      "eslint/no-magic-numbers": "off",
      "unicorn/max-nested-calls": "off",
    },
  },
  {
    files: [
      "src/server/app/dev-server-{attempt,ops,runner,runtime,store}.ts",
      "src/server/handlers/dev-server/{create,get,handlers,list-routes,live,run,set,start,stop}.ts",
      "src/shared/actions/dev-server/{create,get,index,list-routes,routes,run,schema,set,start,stop}.ts",
    ],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: ["src/shared/actions/dev-server/{create,set}.ts"],
    rules: { "unicorn/max-nested-calls": "off" },
  },
  {
    files: ["src/server/app/dev-server-{ops,runner}.ts"],
    rules: {
      "anti-slop/no-conditional-empty-object-spread": "warn",
      "anti-slop/no-runtime-typeof": "warn",
      "eslint/no-ternary": "warn",
      "eslint/no-undefined": "warn",
      "eslint/prefer-destructuring": "warn",
      "eslint/sort-keys": "warn",
      "github/no-then": "warn",
      "promise/prefer-await-to-then": "warn",
      "typescript/explicit-function-return-type": "warn",
      "typescript/explicit-module-boundary-types": "warn",
      "unicorn/no-useless-undefined": "warn",
    },
  },
  {
    files: [
      "src/server/handlers/connection/{get-status,handlers,list-activity,list-approvals,live,set-approval,set-status}.ts",
      "src/shared/actions/connection/{get-status,index,list-activity,list-approvals,routes,schema,set-approval,set-status}.ts",
      "src/server/mcp-life/{approval-window-queue,index,mcp-activity-log,mcp-approval-store,mcp-life-runtime,mcp-listener-runner,mcp-settings-store,mcp-settings-writer}.ts",
      "src/server/platform/runtime-slot/index.ts",
    ],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: [
      "src/shared/actions/connection/{set-approval,get-status,list-activity,list-approvals,set-status}.ts",
    ],
    rules: { "unicorn/max-nested-calls": "off" },
  },
  {
    files: ["src/server/platform/git/encoding.ts"],
    rules: { "sonarjs/hashing": "off" },
  },
  {
    files: ["src/server/platform/git/user-git.ts"],
    rules: { "node/no-process-env": "off" },
  },
  {
    files: ["src/server/platform/git/run-git.ts"],
    rules: { "sonarjs/no-os-command-from-path": "off" },
  },
  {
    files: ["lint/plugins/studio/freeze-rules.js"],
    rules: { "sonarjs/no-os-command-from-path": "off" },
  },
  {
    files: ["src/ui/features/design-system/component-insert-api.ts"],
    rules: { "anti-slop/no-unknown-parameters": "off" },
  },
  {
    files: [
      "desktop/build.ts",
      "src/server/platform/data-lock/**",
      "src/server/platform/paths/**",
      "src/server/platform/resources/**",
    ],
    rules: { "node/no-sync": "off" },
  },
  {
    files: [
      "src/server/main/public.ts",
      "src/server/mcp/edit-tools.ts",
      "src/server/mcp/server.ts",
      "src/server/preview/route-stamp.ts",
      "src/server/project-source/source.ts",
      "src/server/run-log/run-list.ts",
      "src/server/{http/edit-history-routes,mcp/history-tools}.ts",
      "src/server/{http/mcp-routes,http/stream-routes,main/live-layer}.ts",
      "src/server/cloud/cloud-migration-runner.ts",
    ],
    rules: { "react-doctor/no-barrel-import": "off" },
  },
  {
    files: [
      "src/server/mcp/legacy/attach-app.ts",
      "src/server/mcp/legacy/caller-scope.ts",
      "src/server/mcp/legacy/guard.ts",
      "src/server/mcp/legacy/canvas-frames.ts",
      "src/server/mcp/legacy/canvas-result.ts",
      "src/server/mcp/legacy/canvas-schema.ts",
      "src/server/mcp/legacy/canvas.ts",
      "src/server/mcp/legacy/cloud.ts",
      "src/server/mcp/legacy/comments.ts",
      "src/server/mcp/legacy/create-project.ts",
      "src/server/mcp/legacy/devserver.ts",
      "src/server/mcp/legacy/direct-edit-inline.ts",
      "src/server/mcp/legacy/direct-edit-result.ts",
      "src/server/mcp/legacy/direct-edit-schema.ts",
      "src/server/mcp/legacy/direct-edit.ts",
      "src/server/mcp/legacy/edit-element.ts",
      "src/server/mcp/legacy/events.ts",
      "src/server/mcp/legacy/mcp-life.ts",
      "src/server/mcp/legacy/mcp-read.ts",
      "src/server/mcp/legacy/open-folder.ts",
      "src/server/mcp/legacy/org-scope.ts",
      "src/server/mcp/legacy/pack-of.ts",
      "src/server/mcp/legacy/packs-result.ts",
      "src/server/mcp/legacy/packs-schema.ts",
      "src/server/mcp/legacy/packs.ts",
      "src/server/mcp/legacy/projects-result.ts",
      "src/server/mcp/legacy/projects-schema.ts",
      "src/server/mcp/legacy/projects.ts",
      "src/server/mcp/legacy/publish.ts",
      "src/server/mcp/legacy/session.ts",
      "src/server/mcp/legacy/set-token.ts",
      "src/server/mcp/legacy/structure-element.ts",
      "src/server/mcp/legacy/studio.ts",
      "src/server/mcp/legacy/versions.ts",
      "src/server/mcp/legacy/write-file.ts",
      "src/server/mcp/run-edit.ts",
    ],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: ["src/server/mcp/legacy/direct-edit.ts"],
    rules: { "import/max-dependencies": "off" },
  },
  {
    files: ["src/ui/platform/query.ts"],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: [
      "src/server/mcp/legacy/canvas-result.ts",
      "src/server/mcp/legacy/canvas-schema.ts",
      "src/server/mcp/legacy/direct-edit-result.ts",
      "src/server/mcp/legacy/direct-edit-schema.ts",
      "src/server/mcp/legacy/export-result.ts",
      "src/server/mcp/legacy/export-schema.ts",
      "src/server/mcp/legacy/packs-result.ts",
      "src/server/mcp/legacy/packs-schema.ts",
      "src/server/mcp/legacy/projects-result.ts",
      "src/server/mcp/legacy/projects-schema.ts",
      "src/server/mcp/legacy/versions-result.ts",
      "src/server/mcp/legacy/versions-schema.ts",
    ],
    rules: { "eslint/sort-keys": "off" },
  },
  {
    files: ["src/server/mcp/{key-auth,key-introspect}.ts"],
    rules: {
      "anti-slop/require-readable-spacing": "warn",
      "import/no-relative-parent-imports": "off",
      "sonarjs/no-nested-functions": "warn",
    },
  },
  {
    files: [
      "src/server/{agent/icon-tool,http/icon-routes,icons/deps,mcp/icon-tools}.ts",
      "src/server/{mcp/text-style-tools,agent/text-style-tool,text-styles/deps}.ts",
      "src/server/{mcp/motion-tools,agent/motion-tool,motion/deps}.ts",
      "src/server/{mcp/fill-tools,agent/fill-tool,fill/deps}.ts",
      "src/server/{design-system/model/index,design-system/ops/index,spacing/deps,mcp/spacing-tools,agent/spacing-tool,components/variant-write/deps,mcp/component-variant-tools,agent/component-variant-tool,canvas/links/link-interaction,canvas/links/link-interaction-input,canvas/links/link-target,mcp/link-interaction-tools,agent/link-interaction-tool,page-import/deps,mcp/page-import-tools,agent/page-import-tool,text-search/deps,mcp/text-search-tools,agent/text-search-tool,breakpoints/deps,mcp/breakpoints-tools,agent/breakpoints-tool,state-styles/deps,mcp/state-styles-tools,agent/state-styles-tool,style-scope/engine/deps,stacking/deps,stacking/engine/deps,mcp/stacking-tools,agent/stacking-tool,image-search/deps,mcp/image-search-tools,agent/image-search-tool,accessibility/deps,mcp/accessibility-tools,agent/accessibility-tool}.ts",
      "src/server/{mcp/copy-code-tools,agent/copy-code-tool}.ts",
      "cloud/api/src/http/{api,groups/*,groups/keys/*,sync/*}.ts",
      "cloud/api/src/{tenant/{probes/{planted-tq,cross-org},repos/{projects,changes,versions,key-perm},blobs,current-org,db,resolver,viewer-db},auth/{gateway,permissions,rate-limit},http/{errors,middleware/{agent-auth,member-auth,member-directory,org-grant,viewer}}}.ts",
      "src/server/export/copy-handler.ts",
      "src/server/export/copy-react.ts",
      "src/server/http/text-style-routes.ts",
      "src/ui/features/icons/deps.ts",
      "src/ui/features/text-styles/deps.ts",
      "src/ui/features/motion/deps.ts",
      "src/server/http/{{fill,spacing,component-variant,link-interaction,page-import,text-search,motion,state-style,stacking,image-search,accessibility}-routes,app-{context,errors,project-files,request,run-parse,*-routes},loopback-guard}.ts",
      "src/{ui/features/{account,settings,fill,spacing,component-variant,link-interaction,page-import,text-search,state-styles,stacking,image-search,accessibility,agent-approval}/deps,bridge/play-triggers}.ts",
    ],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: [
      "src/{server/comments/frame-target,server/comments/run-payload,shared/run-target,server/http/spacing-routes,ui/features/spacing/spacing-bands,server/share/share-links,shared/actions/comment/schema}.ts",
    ],
    rules: { "eslint/id-length": "off" },
  },
  {
    files: [
      "src/server/http/app-{context,project-files,request,run-parse,*-routes}.ts",
      "cloud/api/src/http/{api,groups/*,groups/keys/*,sync/*}.ts",
      "{src/ui/api,lint/decisions,src/shared/actions/version/{index,routes},src/server/handlers/version/handlers}.ts",
      "src/server/mcp/run-edit.ts",
    ],
    rules: Object.fromEntries(
      "eslint/max-classes-per-file eslint/new-cap anti-slop/no-chained-type-assertions eslint/no-await-in-loop eslint/no-nested-ternary react-doctor/async-await-in-loop sonarjs/no-nested-conditional unicorn/max-nested-calls unicorn/no-nested-ternary anti-slop/no-conditional-empty-object-spread anti-slop/no-runtime-typeof anti-slop/no-unknown-parameters anti-slop/no-unsafe-dictionary-type anti-slop/require-readable-spacing eslint/func-style eslint/id-length eslint/init-declarations eslint/max-lines eslint/max-lines-per-function eslint/max-statements eslint/no-console eslint/no-continue eslint/no-empty-function eslint/no-magic-numbers eslint/no-promise-executor-return eslint/no-ternary eslint/no-undefined eslint/no-use-before-define eslint/require-unicode-regexp eslint/sort-keys github/no-then import/max-dependencies node/no-sync promise/avoid-new promise/prefer-await-to-callbacks promise/prefer-await-to-then react-doctor/server-sequential-independent-await sonarjs/elseif-without-else sonarjs/max-lines sonarjs/max-lines-per-function sonarjs/no-duplicate-string sonarjs/shorthand-property-grouping sonarjs/too-many-break-or-continue-in-loop typescript/explicit-function-return-type typescript/explicit-module-boundary-types unicorn/no-await-expression-member unicorn/no-useless-undefined unicorn/prefer-number-coercion eslint/no-loop-func eslint/no-unmodified-loop-condition sonarjs/max-union-size sonarjs/expression-complexity sonarjs/super-linear-regex"
        .split(" ")
        .map((rule) => [rule, "warn"])
    ),
  },
  {
    files: [
      "src/server/mcp/run-edit.ts",
      "src/ui/{appStream,eventHub,liveStore}.ts",
      "src/ui/platform/{stream,event-hub,live-store}.ts",
    ],
    rules: Object.fromEntries(
      "anti-slop/no-chained-type-assertions anti-slop/no-known-value-widening anti-slop/no-runtime-typeof anti-slop/no-unknown-parameters anti-slop/no-unknown-returns anti-slop/require-readable-spacing eslint/curly eslint/default-case eslint/func-style eslint/id-length eslint/init-declarations eslint/max-classes-per-file eslint/max-lines-per-function eslint/no-console eslint/no-continue eslint/no-magic-numbers eslint/no-promise-executor-return eslint/no-ternary eslint/no-undefined eslint/prefer-destructuring eslint/sort-keys github/no-then import/consistent-type-specifier-style import/exports-last import/group-exports import/no-relative-parent-imports promise/avoid-new promise/prefer-await-to-callbacks promise/prefer-await-to-then sonarjs/elseif-without-else sonarjs/no-undefined-assignment typescript/explicit-function-return-type typescript/explicit-member-accessibility typescript/method-signature-style typescript/parameter-properties unicorn/no-array-sort unicorn/no-useless-spread unicorn/no-useless-undefined unicorn/prefer-add-event-listener unicorn/prefer-global-this unicorn/require-post-message-target-origin sonarjs/max-lines-per-function"
        .split(" ")
        .map((rule) => [rule, "warn"])
    ),
  },
  {
    files: [
      "src/ui/{desktop,storage,folderPicker,openAppRequest}.ts",
      "src/ui/platform/{desktop,storage,app-events}.ts",
    ],
    rules: Object.fromEntries(
      "anti-slop/no-conditional-empty-object-spread unicorn/prefer-set-has eslint/sort-keys eslint/no-useless-return react/refs unicorn/no-array-reverse react-doctor/no-ref-current-in-render anti-slop/no-chained-type-assertions anti-slop/no-runtime-typeof anti-slop/no-unknown-parameters anti-slop/require-readable-spacing eslint/func-style eslint/id-length eslint/no-magic-numbers eslint/no-ternary eslint/no-undefined github/array-foreach import/exports-last import/group-exports import/no-relative-parent-imports sonarjs/max-union-size sonarjs/no-duplicate-string typescript/explicit-function-return-type typescript/explicit-module-boundary-types unicorn/no-array-for-each unicorn/no-useless-undefined unicorn/prefer-global-this"
        .split(" ")
        .map((rule) => [rule, "warn"])
    ),
  },
  {
    files: ["src/ui/platform/{router,telemetry}.ts"],
    rules: Object.fromEntries(
      "anti-slop/no-chained-type-assertions anti-slop/no-runtime-typeof eslint/func-style eslint/init-declarations eslint/no-continue eslint/no-ternary eslint/no-undefined eslint/prefer-named-capture-group eslint/require-unicode-regexp eslint/sort-keys import/exports-last import/group-exports import/no-relative-parent-imports sonarjs/no-undefined-assignment sonarjs/shorthand-property-grouping typescript/explicit-function-return-type unicorn/no-useless-undefined unicorn/prefer-global-this"
        .split(" ")
        .map((rule) => [rule, "warn"])
    ),
  },
  {
    files: [
      "src/ui/components/{LazySelect,SlashMenu,UnfinishedBanner,ThemeButton,HomeComposerParts,Disclosure,ComposerComments,CommentAvatar}.tsx",
    ],
    rules: { "import/no-relative-parent-imports": "warn" },
  },
  {
    files: ["src/ui/kit/**", "src/ui/domain/**"],
    rules: Object.fromEntries(
      "anti-slop/no-known-value-widening anti-slop/no-runtime-typeof eslint/func-style eslint/id-length eslint/max-lines-per-function eslint/no-magic-numbers eslint/no-nested-ternary eslint/no-plusplus eslint/no-ternary eslint/no-undefined eslint/prefer-arrow-callback eslint/prefer-destructuring eslint/sort-keys github/filenames-match-regex github/prefer-observers import/exports-last import/group-exports import/no-relative-parent-imports jsx-a11y/click-events-have-key-events jsx-a11y/interactive-supports-focus jsx-a11y/prefer-tag-over-role react-doctor/advanced-event-handler-refs react-doctor/only-export-components react-perf/jsx-no-new-function-as-prop react/jsx-max-depth react/only-export-components react/refs sonarjs/no-nested-conditional typescript/explicit-function-return-type typescript/explicit-module-boundary-types unicorn/consistent-existence-index-check unicorn/filename-case unicorn/no-nested-ternary unicorn/prefer-global-this react/function-component-definition"
        .split(" ")
        .map((rule) => [rule, "warn"])
    ),
  },
  {
    files: ["src/server/app/index.ts"],
    rules: { "oxc/no-barrel-file": "off" },
  },
  {
    files: [
      "src/ui/useChatState.ts",
      "src/ui/useComposerKeys.ts",
      "src/ui/useMentions.ts",
      "src/ui/useRunControls.ts",
      "src/ui/useRunLevel.ts",
      "src/ui/useRunNotice.ts",
      "src/ui/useRunCanvas.ts",
      "src/ui/useRewind.ts",
      "src/ui/useMcpFeed.ts",
      "src/ui/useInlinePrompt.ts",
      "src/ui/useFirstBuild.ts",
      "src/ui/useEscapeStop.ts",
      "src/ui/usePresence.ts",
      "src/ui/runState.ts",
      "src/ui/runFeedback.ts",
      "src/ui/runHistoryApi.ts",
      "src/ui/skills.ts",
      "src/ui/toolLabels.ts",
      "src/ui/chatSearchState.ts",
      "src/ui/mcpApi.ts",
      "src/ui/settingsDraft.ts",
      "src/ui/approvalSpot.ts",
    ],
    rules: { "oxc/no-barrel-file": "off" },
  },
  {
    files: [
      "src/server/direct-edit/{classes,css,errors,html,jsx-snippet,jsx,splice,structure-docs,structure-ops,structure,tokens,validate,variant-css,vector-boolean,vector-geometry,vector-snippet,vector-source}.ts",
      "src/server/direct-edit/tailwind/{classes,color,copy,html-site,index,jsx-site,map,plan,units}.ts",
      "src/server/direct-edit/commit/imports.ts",
      "src/server/{components/{insert,swap,extract,extract-file,extract-shape,import-cleanup},direct-edit/components-ops/index,store/version-hunk,agent/usage-scope,export/capture}.ts",
      "src/server/{mcp/{element,layer-ref,layer-ids,line-map,source-loc},layers/lock-probe,components/owner-probe,page-probe/index,app/{route-eval,route-links,route-flow,frame-state-service},canvas/{index,links/index,app-flow/index}}.ts",
      "src/server/direct-edit/{arrange-probe,arrange,batch,class-info,edit-site,follow-moves,history,image-attrs,image-find,image-source,image,imports,jsx-insert,props,replace,run-record,save-queue,structure-apply,style-scan,text-source-files,text-source,text-trace,vector-ops}.ts",
    ],
    rules: {
      "import/no-relative-parent-imports": "off",
      "oxc/no-barrel-file": "off",
      "sonarjs/no-wildcard-import": "off",
    },
  },
  {
    files: [
      "src/server/components/model.ts",
      "src/server/direct-edit/commit/index.ts",
      "src/server/direct-edit/engine/index.ts",
      "src/server/direct-edit/index.ts",
    ],
    rules: {
      "oxc/no-barrel-file": "off",
      "sonarjs/no-wildcard-import": "off",
    },
  },
  {
    files: ["*.config.ts", "cloud/api/src/index.ts"],
    rules: { "import/no-default-export": "off" },
  },
  {
    files: [
      "cloud/api/src/{platform/{bindings,rate-limiter,share-live,unlock-lockout},auth/options}.ts",
    ],
    rules: { "sonarjs/no-implicit-dependencies": "off" },
  },
  {
    files: [
      "**/*.generated.ts",
      "src/shared/actions/*/index.ts",
      "src/shared/actions/*/routes.ts",
      "src/server/handlers/*/handlers.ts",
      "src/server/main/{live-layer,runtime-check}.ts",
      "src/server/preview/mcp-read-store.ts",
    ],
    rules: {
      "import/max-dependencies": "off",
      "max-lines": "off",
      "sonarjs/no-duplicate-string": "off",
    },
  },
  {
    files: ["desktop/boot.ts"],
    rules: {
      "eslint/no-console": "off",
      "eslint/no-use-before-define": "off",
      "eslint/no-void": "off",
      "node/no-process-env": "off",
      "sonarjs/shorthand-property-grouping": "off",
    },
  },
  {
    files: ["desktop/first-run-page.renderer.ts", "desktop/first-run-page.ts"],
    rules: {
      "eslint/no-void": "off",
      "unicorn/prefer-top-level-await": "off",
    },
  },
  {
    files: ["desktop/auth.ts"],
    rules: {
      "anti-slop/no-known-value-widening": "warn",
      "anti-slop/no-runtime-typeof": "warn",
      "anti-slop/no-unknown-parameters": "warn",
      "anti-slop/no-unknown-returns": "warn",
      "anti-slop/no-unsafe-dictionary-type": "warn",
      "anti-slop/require-readable-spacing": "warn",
      "class-methods-use-this": "warn",
      curly: "warn",
      "func-style": "warn",
      "id-length": "warn",
      "no-console": "warn",
      "no-continue": "warn",
      "no-magic-numbers": "warn",
      "no-ternary": "warn",
      "no-void": "warn",
      "prefer-destructuring": "warn",
      "require-await": "warn",
      "sort-keys": "warn",
      "import/consistent-type-specifier-style": "warn",
      "node/no-sync": "warn",
      "sonarjs/shorthand-property-grouping": "warn",
      "typescript/explicit-member-accessibility": "warn",
      "typescript/parameter-properties": "warn",
      "unicorn/numeric-separators-style": "warn",
    },
  },
  {
    files: ["src/ui/kit/chip-button.tsx"],
    rules: { "react/function-component-definition": "off" },
  },
  {
    files: ["cloud/api/src/shared-actions.ts"],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: [
      "src/server/store/projects.ts",
      "src/server/store/project-{core,create,files,helpers,types}.ts",
    ],
    rules: {
      "anti-slop/no-conditional-empty-object-spread": "warn",
      "anti-slop/no-known-value-widening": "warn",
      "anti-slop/no-runtime-typeof": "warn",
      "anti-slop/no-unknown-parameters": "warn",
      "anti-slop/no-unknown-returns": "warn",
      "anti-slop/no-unsafe-dictionary-type": "warn",
      "eslint/func-style": "warn",
      "eslint/id-length": "warn",
      "eslint/init-declarations": "warn",
      "eslint/max-lines-per-function": "warn",
      "eslint/max-params": "warn",
      "eslint/no-await-in-loop": "warn",
      "eslint/no-console": "warn",
      "eslint/no-continue": "warn",
      "eslint/no-magic-numbers": "warn",
      "eslint/no-ternary": "warn",
      "eslint/no-undefined": "warn",
      "eslint/no-unused-vars": "warn",
      "eslint/no-use-before-define": "warn",
      "eslint/prefer-named-capture-group": "warn",
      "eslint/require-unicode-regexp": "warn",
      "eslint/sort-keys": "warn",
      "github/no-then": "warn",
      "import/first": "warn",
      "import/group-exports": "warn",
      "node/no-sync": "warn",
      "promise/avoid-new": "warn",
      "promise/prefer-await-to-callbacks": "warn",
      "promise/prefer-await-to-then": "warn",
      "react-doctor/async-await-in-loop": "warn",
      "sonarjs/max-lines-per-function": "warn",
      "sonarjs/no-duplicate-string": "warn",
      "sonarjs/no-invariant-returns": "warn",
      "typescript/explicit-function-return-type": "warn",
      "typescript/explicit-module-boundary-types": "warn",
      "typescript/method-signature-style": "warn",
      "unicorn/max-nested-calls": "warn",
      "unicorn/no-array-sort": "warn",
      "unicorn/no-await-expression-member": "warn",
      "unicorn/prefer-export-from": "warn",
      "unicorn/prefer-import-meta-properties": "warn",
      "import/no-relative-parent-imports": "off",
    },
  },
  {
    files: [
      "src/server/store/{project-store,project-writer,project-runtime,project-library-runtime,project-library-store,project-library-writer,workspace-runtime,workspace-store,workspace-writer}.ts",
      "src/server/handlers/project/{create,create-attachment,delete-command-rule,get,get-design-md,get-file,get-hidden,handlers,import,list,list-command-rules,live,move-hidden,search,set-design-md,update}.ts",
      "src/server/project-ops/{project-ops-create,project-ops-detail,project-ops-hidden,project-ops-runtime,project-ops-store,project-ops-writer}.ts",
      "src/shared/actions/project/{create,create-attachment,delete-command-rule,get,get-design-md,get-file,get-hidden,import,list,list-command-rules,move-hidden,schema,search,set-design-md,update}.ts",
    ],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: [
      "src/ui/commands/CommandLayer.tsx",
      "src/ui/commands/Palette.tsx",
      "src/ui/commands/ShortcutSheet.tsx",
      "src/ui/commands/composerCommands.ts",
      "src/ui/commands/fuzzy.ts",
      "src/ui/commands/globalCommands.ts",
      "src/ui/commands/keys.tsx",
      "src/ui/commands/paletteRows.ts",
      "src/ui/commands/registry.ts",
      "src/ui/commands/useCanvasCommands.ts",
      "src/ui/commands/useStudioCommands.ts",
      "src/ui/components/CommandRules.tsx",
    ],
    rules: {
      "github/filenames-match-regex": "off",
      "import/no-relative-parent-imports": "off",
      "react/only-export-components": "off",
      "unicorn/filename-case": "off",
    },
  },
  {
    files: [
      "src/ui/components/CommentAvatar.tsx",
      "src/ui/components/CommentComposer.tsx",
      "src/ui/components/CommentLayer.tsx",
      "src/ui/components/CommentPopover.tsx",
      "src/ui/components/CommentsPanel.tsx",
      "src/ui/components/ComposerComments.tsx",
    ],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: [
      "src/ui/components/CommentAvatar.tsx",
      "src/ui/components/CommentComposer.tsx",
      "src/ui/components/CommentLayer.tsx",
      "src/ui/components/CommentPopover.tsx",
      "src/ui/components/CommentsPanel.tsx",
      "src/ui/components/ComposerComments.tsx",
      "src/ui/useComments.ts",
      "src/ui/useCommentMode.ts",
      "src/ui/useCommentPrefill.ts",
      "src/ui/commentAnchors.ts",
      "src/ui/commentPlacement.ts",
    ],
    rules: {
      "github/filenames-match-regex": "off",
      "react/only-export-components": "off",
      "unicorn/filename-case": "off",
    },
  },
  {
    files: [
      "src/ui/features/versions-layers-tokens/compare-code.tsx",
      "src/ui/features/versions-layers-tokens/compare-frame.tsx",
      "src/ui/features/versions-layers-tokens/compare-modes.tsx",
      "src/ui/features/versions-layers-tokens/compare-view.tsx",
      "src/ui/features/versions-layers-tokens/create-token-dialog.tsx",
      "src/ui/features/versions-layers-tokens/layers-panel.tsx",
      "src/ui/features/versions-layers-tokens/layers-tree.ts",
      "src/ui/features/versions-layers-tokens/token-control.tsx",
      "src/ui/features/versions-layers-tokens/token-draft.ts",
      "src/ui/features/versions-layers-tokens/token-inputs.tsx",
      "src/ui/features/versions-layers-tokens/token-lint.test.ts",
      "src/ui/features/versions-layers-tokens/token-lint.ts",
      "src/ui/features/versions-layers-tokens/token-picker.tsx",
      "src/ui/features/versions-layers-tokens/token-row.tsx",
      "src/ui/features/versions-layers-tokens/tokens-panel.tsx",
      "src/ui/features/versions-layers-tokens/use-layer-edits.ts",
      "src/ui/features/versions-layers-tokens/use-layer-locks.ts",
      "src/ui/features/versions-layers-tokens/use-studio-tokens.ts",
      "src/ui/features/versions-layers-tokens/use-hunk-review.ts",
      "src/ui/features/versions-layers-tokens/use-token-draft.ts",
      "src/ui/features/versions-layers-tokens/version-labels.test.ts",
      "src/ui/features/versions-layers-tokens/version-labels.ts",
      "src/ui/features/versions-layers-tokens/version-row.tsx",
      "src/ui/features/versions-layers-tokens/version-thumb.tsx",
      "src/ui/features/versions-layers-tokens/versions-api.ts",
      "src/ui/features/versions-layers-tokens/versions-panel.tsx",
      "src/ui/components/CompareView.tsx",
      "src/ui/components/CompareFrame.tsx",
      "src/ui/components/CompareModes.tsx",
      "src/ui/components/CompareCode.tsx",
      "src/ui/components/TokenControl.tsx",
      "src/ui/components/TokenInputs.tsx",
      "src/ui/components/TokenPicker.tsx",
      "src/ui/components/TokenRow.tsx",
      "src/ui/components/TokensPanel.tsx",
      "src/ui/components/CreateTokenDialog.tsx",
      "src/ui/components/VersionRow.tsx",
      "src/ui/components/VersionThumb.tsx",
      "src/ui/components/VersionsPanel.tsx",
      "src/ui/components/TokenSweepBridge.tsx",
      "src/ui/components/LayersPanel.tsx",
    ],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: [
      "src/ui/components/CompareView.tsx",
      "src/ui/components/CompareFrame.tsx",
      "src/ui/components/CompareModes.tsx",
      "src/ui/components/CompareCode.tsx",
      "src/ui/components/TokenControl.tsx",
      "src/ui/components/TokenInputs.tsx",
      "src/ui/components/TokenPicker.tsx",
      "src/ui/components/TokenRow.tsx",
      "src/ui/components/TokensPanel.tsx",
      "src/ui/components/CreateTokenDialog.tsx",
      "src/ui/components/VersionRow.tsx",
      "src/ui/components/VersionThumb.tsx",
      "src/ui/components/VersionsPanel.tsx",
      "src/ui/components/TokenSweepBridge.tsx",
      "src/ui/components/LayersPanel.tsx",
      "src/ui/useLayerLocks.ts",
      "src/ui/useLayerEdits.ts",
      "src/ui/useTokenDraft.ts",
      "src/ui/useStudioTokens.ts",
      "src/ui/layersTree.ts",
      "src/ui/versionLabels.ts",
      "src/ui/versionsApi.ts",
      "src/ui/tokenDraft.ts",
      "src/ui/tokenLint.ts",
    ],
    rules: {
      "github/filenames-match-regex": "off",
      "react/only-export-components": "off",
      "unicorn/filename-case": "off",
    },
  },
  {
    files: [
      "src/ui/componentCreateApi.ts",
      "src/ui/components/ComponentInsert.tsx",
      "src/ui/components/ComponentPreviewThumb.tsx",
      "src/ui/components/ComponentsPanel.tsx",
      "src/ui/components/CreateComponentDialog.tsx",
      "src/ui/components/DesignMdModal.tsx",
      "src/ui/components/DesignSystemChip.tsx",
      "src/ui/components/DesignSystemDialogs.tsx",
      "src/ui/components/DesignSystems.tsx",
      "src/ui/components/DoctorCard.tsx",
      "src/ui/components/LibraryDialogs.tsx",
      "src/ui/components/NewDesignSystem.tsx",
      "src/ui/components/PackBadges.tsx",
      "src/ui/components/PackDetail.tsx",
      "src/ui/components/PackList.tsx",
      "src/ui/components/PackPicker.tsx",
      "src/ui/components/PackPreview.tsx",
      "src/ui/components/PortToAppDialog.tsx",
      "src/ui/designMdOutline.ts",
      "src/ui/useComponentInsert.ts",
      "src/ui/useDesignSystemState.ts",
      "src/ui/usePackActions.ts",
    ],
    rules: {
      "github/filenames-match-regex": "off",
    },
  },
  {
    files: [
      "src/ui/components/ComponentInsert.tsx",
      "src/ui/components/ComponentPreviewThumb.tsx",
      "src/ui/components/ComponentsPanel.tsx",
      "src/ui/components/CreateComponentDialog.tsx",
      "src/ui/components/DesignMdModal.tsx",
      "src/ui/components/DesignSystemChip.tsx",
      "src/ui/components/DesignSystemDialogs.tsx",
      "src/ui/components/DesignSystems.tsx",
      "src/ui/components/DoctorCard.tsx",
      "src/ui/components/LibraryDialogs.tsx",
      "src/ui/components/NewDesignSystem.tsx",
      "src/ui/components/PackBadges.tsx",
      "src/ui/components/PackDetail.tsx",
      "src/ui/components/PackList.tsx",
      "src/ui/components/PackPicker.tsx",
      "src/ui/components/PackPreview.tsx",
      "src/ui/components/PortToAppDialog.tsx",
    ],
    rules: {
      "import/no-relative-parent-imports": "off",
    },
  },
  {
    files: [
      "src/ui/components/ComponentInsert.tsx",
      "src/ui/components/ComponentPreviewThumb.tsx",
      "src/ui/components/DesignSystemChip.tsx",
    ],
    rules: {
      "react/only-export-components": "off",
    },
  },
  {
    files: [
      "src/ui/componentCreateApi.ts",
      "src/ui/componentInsert.ts",
      "src/ui/components/ComponentInsert.tsx",
      "src/ui/components/ComponentPreviewThumb.tsx",
      "src/ui/components/ComponentsPanel.tsx",
      "src/ui/components/CreateComponentDialog.tsx",
      "src/ui/components/DesignMdModal.tsx",
      "src/ui/components/DesignSystemChip.tsx",
      "src/ui/components/DesignSystemDialogs.tsx",
      "src/ui/components/DesignSystems.tsx",
      "src/ui/components/DoctorCard.tsx",
      "src/ui/components/LibraryDialogs.tsx",
      "src/ui/components/NewDesignSystem.tsx",
      "src/ui/components/PackBadges.tsx",
      "src/ui/components/PackDetail.tsx",
      "src/ui/components/PackList.tsx",
      "src/ui/components/PackPicker.tsx",
      "src/ui/components/PackPreview.tsx",
      "src/ui/components/PortToAppDialog.tsx",
      "src/ui/designMdOutline.ts",
      "src/ui/portApi.ts",
      "src/ui/useComponentInsert.ts",
      "src/ui/useComponents.ts",
      "src/ui/useDesignSystemState.ts",
      "src/ui/usePackActions.ts",
    ],
    rules: {
      "unicorn/filename-case": "off",
    },
  },
  {
    files: ["src/server/mcp/action-call.ts", "src/server/mcp/studio-ports.ts"],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: [
      "src/bridge/anchor-tracker.ts",
      "src/bridge/bridge-types.ts",
      "src/bridge/dev-reload.ts",
      "src/bridge/element-info.ts",
      "src/bridge/live-preview.ts",
      "src/bridge/session.ts",
      "src/bridge/zoom-forward.ts",
    ],
    rules: {
      "import/no-relative-parent-imports": "off",
    },
  },
  {
    files: [
      "src/bridge/anchor-tracker.ts",
      "src/bridge/dom-input.ts",
      "src/bridge/element-info.ts",
      "src/bridge/live-preview.ts",
      "src/bridge/rect-tracker.ts",
      "src/bridge/session.ts",
      "src/bridge/zoom-forward.ts",
    ],
    rules: {
      "unicorn/prefer-global-this": "off",
    },
  },
  {
    files: ["src/bridge/dom-input.ts", "src/bridge/session.ts"],
    rules: {
      "react-doctor/no-unguarded-browser-global-at-module-scope": "off",
    },
  },
  {
    files: [
      "src/bridge/element-info.ts",
      "src/bridge/live-preview.ts",
      "src/bridge/rect-tracker.ts",
    ],
    rules: {
      "eslint/id-length": "off",
    },
  },
  {
    files: ["src/bridge/element-info.ts"],
    rules: {
      "eslint/prefer-named-capture-group": "off",
    },
  },
  {
    files: ["src/bridge/anchor-tracker.ts", "src/bridge/element-info.ts"],
    rules: {
      "github/no-innerText": "off",
      "unicorn/prefer-dom-node-text-content": "off",
    },
  },
  {
    files: [
      "src/bridge/element-info.ts",
      "src/bridge/rect-tracker.ts",
      "src/bridge/zoom-forward.ts",
    ],
    rules: {
      "sonarjs/shorthand-property-grouping": "off",
    },
  },
  {
    files: ["src/bridge/element-info.ts", "src/bridge/rect-tracker.ts"],
    rules: {
      "anti-slop/no-known-value-widening": "off",
    },
  },
  {
    files: [
      "src/bridge/anchor-tracker.ts",
      "src/bridge/dom-input.ts",
      "src/bridge/live-preview.ts",
    ],
    rules: {
      "unicorn/prefer-query-selector": "off",
    },
  },
  {
    files: ["src/bridge/dom-input.ts", "src/bridge/live-preview.ts"],
    rules: {
      "unicorn/prefer-dom-node-append": "off",
    },
  },
  {
    files: [
      "src/bridge/anchor-tracker.ts",
      "src/bridge/dom-input.ts",
      "src/bridge/live-preview.ts",
      "src/bridge/rect-tracker.ts",
      "src/bridge/theme-control.ts",
    ],
    rules: {
      "anti-slop/no-unknown-parameters": "off",
    },
  },
  {
    files: ["src/bridge/anchor-tracker.ts", "src/bridge/dom-input.ts"],
    rules: {
      "sonarjs/expression-complexity": "off",
    },
  },
  {
    files: ["src/bridge/zoom-forward.ts"],
    rules: {
      "github/require-passive-events": "off",
    },
  },
  {
    files: ["src/bridge/live-preview.ts"],
    rules: {
      "anti-slop/no-unsafe-dictionary-type": "off",
      "eslint/no-continue": "off",
    },
  },
  {
    files: ["src/bridge/anchor-tracker.ts", "src/bridge/rect-tracker.ts"],
    rules: {
      "eslint/no-use-before-define": "off",
      "unicorn/no-array-callback-reference": "off",
    },
  },
  {
    files: ["src/bridge/rect-tracker.ts"],
    rules: {
      "react-doctor/js-combine-iterations": "off",
    },
  },
  {
    files: ["src/bridge/bridge.ts"],
    rules: {
      "anti-slop/no-chained-type-assertions": "off",
      "anti-slop/no-unsafe-dictionary-type": "off",
      "import/max-dependencies": "off",
      "react-doctor/no-unguarded-browser-global-at-module-scope": "off",
      "unicorn/prefer-dom-node-append": "off",
      "unicorn/prefer-query-selector": "off",
    },
  },
  {
    files: ["src/bridge/hover-select.ts", "src/bridge/message-handlers.ts"],
    rules: {
      "anti-slop/no-unknown-parameters": "off",
    },
  },
  {
    files: [
      "src/bridge/bridge.ts",
      "src/bridge/hover-select.ts",
      "src/bridge/keyboard.ts",
      "src/bridge/message-handlers.ts",
      "src/bridge/outgoing.ts",
      "src/bridge/pointer-drag.ts",
    ],
    rules: {
      "unicorn/prefer-global-this": "off",
    },
  },
  {
    files: ["src/bridge/bridge-types.ts", "src/bridge/hover-select.ts"],
    rules: {
      "eslint/id-length": "off",
    },
  },
  {
    files: ["src/bridge/outgoing.ts"],
    rules: {
      "eslint/no-console": "off",
      "github/prefer-observers": "off",
      "oxc/no-map-spread": "off",
    },
  },
  {
    files: [
      "src/bridge/hover-select.ts",
      "src/bridge/keyboard.ts",
      "src/bridge/message-handlers.ts",
    ],
    rules: {
      "sonarjs/elseif-without-else": "off",
    },
  },
  {
    files: ["src/bridge/keyboard.ts", "src/bridge/pointer-drag.ts"],
    rules: {
      "eslint/no-void": "off",
    },
  },
  {
    files: ["src/bridge/hover-select.ts", "src/bridge/outgoing.ts"],
    rules: {
      "github/no-useless-passive": "off",
    },
  },
  {
    files: [
      "src/bridge/bridge.ts",
      "src/bridge/keyboard.ts",
      "src/bridge/message-handlers.ts",
      "src/bridge/outgoing.ts",
      "src/bridge/pointer-drag.ts",
    ],
    rules: {
      "import/no-relative-parent-imports": "off",
    },
  },
  {
    files: ["src/bridge/message-handlers.ts", "src/bridge/outgoing.ts"],
    rules: {
      "promise/always-return": "off",
      "unicorn/no-array-callback-reference": "off",
    },
  },
  {
    files: [
      "src/bridge/bridge.ts",
      "src/bridge/message-handlers.ts",
      "src/bridge/outgoing.ts",
      "src/bridge/pointer-drag.ts",
    ],
    rules: {
      "sonarjs/shorthand-property-grouping": "off",
    },
  },
  {
    files: ["desktop/build.ts"],
    rules: {
      "import/no-relative-parent-imports": "off",
    },
  },
  {
    files: [
      "src/ui/features/inspector/accessibility-section.tsx",
      "src/ui/features/inspector/alt-field.tsx",
      "src/ui/features/inspector/box-model.tsx",
      "src/ui/features/inspector/component-section.tsx",
      "src/ui/features/inspector/components-tab.tsx",
      "src/ui/features/inspector/effects-model.ts",
      "src/ui/features/inspector/empty-state.tsx",
      "src/ui/features/inspector/focal-pad.tsx",
      "src/ui/features/inspector/image-model.ts",
      "src/ui/features/inspector/image-section.tsx",
      "src/ui/features/inspector/inspector-breadcrumb.tsx",
      "src/ui/features/inspector/inspector-classes.tsx",
      "src/ui/features/inspector/inspector-code.tsx",
      "src/ui/features/inspector/inspector-corners.test.ts",
      "src/ui/features/inspector/inspector-corners.tsx",
      "src/ui/features/inspector/inspector-effects.tsx",
      "src/ui/features/inspector/inspector-fields.tsx",
      "src/ui/features/inspector/inspector-image.tsx",
      "src/ui/features/inspector/inspector-model.ts",
      "src/ui/features/inspector/inspector-multi.tsx",
      "src/ui/features/inspector/inspector-other-styles.tsx",
      "src/ui/features/inspector/inspector.tsx",
      "src/ui/features/inspector/leave-dialog.tsx",
      "src/ui/features/inspector/leave-prompt.tsx",
      "src/ui/features/inspector/number-field-model.ts",
      "src/ui/features/inspector/number-field.tsx",
      "src/ui/features/inspector/number-input.tsx",
      "src/ui/features/inspector/pro-tab.tsx",
      "src/ui/features/inspector/same-props.ts",
      "src/ui/features/inspector/session-header.tsx",
      "src/ui/features/inspector/shadow-row.tsx",
      "src/ui/features/inspector/simple-tab.tsx",
      "src/ui/features/inspector/stacking-section.tsx",
      "src/ui/features/inspector/tab-bar.tsx",
      "src/ui/features/inspector/tweaks-note.tsx",
      "src/ui/features/inspector/use-image-set.ts",
      "src/ui/features/inspector/use-paste-image.ts",
      "src/ui/features/inspector/use-scrub.ts",
      "src/ui/features/inspector/use-session-handle.ts",
      "src/ui/features/inspector/use-stable-callbacks.ts",
      "src/ui/features/inspector/use-use-site.ts",
      "src/ui/features/inspector/vector-section.tsx",
      "src/ui/features/inspector/layout-keys.ts",
      "src/ui/features/inspector/auto-layout-section.tsx",
      "src/ui/features/inspector/size-row.tsx",
      "src/ui/features/inspector/size-limits.tsx",
      "src/ui/features/inspector/position-rows.tsx",
      "src/ui/features/inspector/inspector-layout.tsx",
      "src/ui/features/inspector/match-scan.ts",
      "src/ui/features/inspector/match-candidates.tsx",
      "src/ui/features/inspector/match-token-picker.tsx",
      "src/ui/features/inspector/match-rows.tsx",
      "src/ui/features/inspector/inspector-match.tsx",
      "src/ui/features/inspector/arrange-model.ts",
      "src/ui/features/inspector/use-arrange.ts",
      "src/ui/features/inspector/inspector-arrange.tsx",
      "src/ui/features/inspector/inspector-rows.tsx",
      "src/ui/features/inspector/inspector-shared.tsx",
      "src/ui/features/inspector/inspector-source.tsx",
      "src/ui/components/InspectorLayout.tsx",
      "src/ui/components/InspectorMatch.tsx",
      "src/ui/components/InspectorArrange.tsx",
      "src/ui/components/InspectorRows.tsx",
      "src/ui/components/InspectorShared.tsx",
      "src/ui/components/InspectorSource.tsx",
      "src/ui/features/inspector/inspector-props.tsx",
      "src/ui/features/inspector/inspector-simple.tsx",
      "src/ui/features/inspector/inspector-tokens.tsx",
      "src/ui/features/inspector/inspector-tools.tsx",
      "src/ui/features/inspector/inspector-tweaks.tsx",
      "src/ui/features/inspector/inspector-variant-bar.tsx",
      "src/ui/features/inspector/inspector-vector.tsx",
      "src/ui/features/inspector/tweaks-panel.tsx",
      "src/ui/features/inspector/swap-instance-menu.tsx",
      "src/ui/features/inspector/element-variants-dialog.tsx",
      "src/ui/features/inspector/swatches.tsx",
      "src/ui/components/InspectorProps.tsx",
      "src/ui/components/InspectorSimple.tsx",
      "src/ui/components/InspectorTokens.tsx",
      "src/ui/components/InspectorTools.tsx",
      "src/ui/components/InspectorTweaks.tsx",
      "src/ui/components/InspectorVariantBar.tsx",
      "src/ui/components/InspectorVector.tsx",
      "src/ui/components/TweaksPanel.tsx",
      "src/ui/components/SwapInstanceMenu.tsx",
      "src/ui/components/ElementVariantsDialog.tsx",
      "src/ui/components/Swatches.tsx",
      "src/ui/components/Inspector.tsx",
      "src/ui/components/InspectorBreadcrumb.tsx",
      "src/ui/components/InspectorClasses.tsx",
      "src/ui/components/InspectorCode.tsx",
      "src/ui/components/InspectorCorners.tsx",
      "src/ui/components/InspectorEffects.tsx",
      "src/ui/components/InspectorFields.tsx",
      "src/ui/components/InspectorImage.tsx",
      "src/ui/components/InspectorMulti.tsx",
      "src/ui/components/InspectorOtherStyles.tsx",
      "src/ui/components/NumberField.tsx",
      "src/ui/inspector-slots.ts",
      "src/ui/components/BoxModel.tsx",
      "src/ui/features/inspector/use-direct-edit.ts",
      "src/ui/useDirectEdit.ts",
      "src/ui/features/inspector/use-direct-edits.ts",
      "src/ui/useDirectEdits.ts",
      "src/ui/features/inspector/use-layer-edits.ts",
      "src/ui/useLayerEdits.ts",
      "src/ui/features/inspector/use-tweaks.ts",
      "src/ui/useTweaks.ts",
      "src/ui/features/inspector/use-token-snap.ts",
      "src/ui/useTokenSnap.ts",
      "src/ui/features/inspector/use-element-nudge.ts",
      "src/ui/useElementNudge.ts",
      "src/ui/features/inspector/use-edit-session.ts",
      "src/ui/useEditSession.ts",
      "src/ui/features/inspector/use-edit-history.ts",
      "src/ui/useEditHistory.ts",
      "src/ui/features/inspector/use-planned-edits.ts",
      "src/ui/usePlannedEdits.ts",
      "src/ui/features/inspector/use-swap-gate.ts",
      "src/ui/useSwapGate.ts",
      "src/ui/features/inspector/use-component-insert.ts",
      "src/ui/useComponentInsert.ts",
      "src/ui/features/inspector/use-authored-css.ts",
      "src/ui/useAuthoredCss.ts",
      "src/ui/features/inspector/use-image-drop.ts",
      "src/ui/useImageDrop.ts",
      "src/ui/features/inspector/edit-variant.ts",
      "src/ui/editVariant.ts",
      "src/ui/features/inspector/optimistic-edit.ts",
      "src/ui/optimisticEdit.ts",
      "src/ui/features/inspector/proxy-edit.ts",
      "src/ui/proxyEdit.ts",
      "src/ui/features/inspector/structure-edits.ts",
      "src/ui/structureEdits.ts",
      "src/ui/features/inspector/stable-props.ts",
      "src/ui/stableProps.ts",
      "src/ui/features/inspector/shadows.ts",
      "src/ui/shadows.ts",
      "src/ui/features/inspector/sizing.ts",
      "src/ui/sizing.ts",
      "src/ui/features/inspector/mixed-values.ts",
      "src/ui/mixedValues.ts",
      "src/ui/features/inspector/css-values.ts",
      "src/ui/cssValues.ts",
      "src/ui/features/inspector/math-input.ts",
      "src/ui/mathInput.ts",
      "src/ui/features/inspector/constraints.ts",
      "src/ui/constraints.ts",
      "src/ui/features/inspector/props-api.ts",
      "src/ui/propsApi.ts",
      "src/ui/features/inspector/component-insert.ts",
      "src/ui/componentInsert.ts",
      "src/ui/features/inspector/delta-batch.ts",
      "src/ui/deltaBatch.ts",
      "src/ui/features/inspector/authored-css.ts",
      "src/ui/authoredCss.ts",
      "src/ui/features/inspector/paste-jsx.ts",
      "src/ui/pasteJsx.ts",
      "src/ui/features/inspector/image-api.ts",
      "src/ui/imageApi.ts",
      "src/ui/features/inspector/api-error.ts",
    ],
    rules: Object.fromEntries(
      "anti-slop/no-known-value-widening eslint/logical-assignment-operators eslint/max-statements eslint/no-alert eslint/no-await-in-loop eslint/no-plusplus github/unescaped-html-literal promise/avoid-new promise/catch-or-return promise/no-callback-in-promise react-doctor/async-await-in-loop react-doctor/no-adjust-state-on-prop-change react-doctor/no-barrel-import react-doctor/no-pass-live-state-to-parent react-doctor/no-stale-timer-ref react/hook-use-state react/immutability react/memo-dependencies react/preserve-manual-memoization react/todo sonarjs/max-lines-per-function sonarjs/max-union-size sonarjs/no-nested-functions sonarjs/no-nested-incdec sonarjs/no-nested-template-literals sonarjs/no-unused-vars studio/no-finally-state-reset typescript/explicit-member-accessibility typescript/method-signature-style typescript/no-dynamic-delete typescript/no-non-null-assertion unicorn/no-array-callback-reference unicorn/no-array-method-this-argument unicorn/no-array-reduce unicorn/no-await-expression-member unicorn/no-useless-undefined unicorn/prefer-at unicorn/prefer-code-point unicorn/prefer-export-from unicorn/prefer-logical-operator-over-ternary unicorn/prefer-number-coercion unicorn/prefer-number-properties vitest/max-expects vitest/no-conditional-in-test vitest/prefer-strict-equal vitest/prefer-to-be-falsy vitest/prefer-to-be-truthy vitest/require-hook vitest/require-test-timeout vitest/valid-expect studio/no-wildcard-reexport sonarjs/no-wildcard-import oxc/no-barrel-file anti-slop/no-array-filter-map anti-slop/no-chained-type-assertions anti-slop/no-conditional-empty-object-spread anti-slop/no-object-parameters anti-slop/no-runtime-typeof anti-slop/no-shape-in-symbol-names anti-slop/no-unknown-parameters anti-slop/no-unknown-returns anti-slop/no-unsafe-dictionary-type anti-slop/require-readable-spacing boundaries/dependencies eslint/arrow-body-style eslint/curly eslint/func-style eslint/id-length eslint/max-lines-per-function eslint/max-params eslint/no-continue eslint/no-magic-numbers eslint/no-nested-ternary eslint/no-restricted-globals eslint/no-shadow eslint/no-ternary eslint/no-undefined eslint/no-unused-vars eslint/no-use-before-define eslint/no-useless-return eslint/no-void eslint/prefer-destructuring eslint/prefer-named-capture-group eslint/require-unicode-regexp eslint/sort-keys github/array-foreach github/filenames-match-regex github/no-blur github/no-inner-html github/no-then import/consistent-type-specifier-style import/exports-last import/group-exports import/no-default-export import/no-relative-parent-imports import/no-unassigned-import oxc/no-map-spread promise/always-return promise/prefer-await-to-callbacks promise/prefer-await-to-then react-doctor/js-combine-iterations react-doctor/no-array-index-as-key react-doctor/no-enter-submit-without-ime-composition-guard react-doctor/no-floating-then-in-jsx-handler react-doctor/no-high-complexity-react-function react-doctor/no-ref-current-in-render react-doctor/no-self-updating-effect react-doctor/only-export-components react-doctor/pointer-capture-needs-cancel-handler react-doctor/prefer-module-scope-pure-function react-doctor/rerender-lazy-ref-init react-hooks/exhaustive-deps react-perf/jsx-no-jsx-as-prop react-perf/jsx-no-new-array-as-prop react-perf/jsx-no-new-function-as-prop react-perf/jsx-no-new-object-as-prop react/exhaustive-effect-dependencies react/forbid-component-props react/function-component-definition react/jsx-handler-names react/jsx-max-depth react/jsx-no-constructed-context-values react/jsx-no-literals react/jsx-no-undef react/jsx-props-no-spreading react/no-array-index-key react/no-multi-comp react/only-export-components react/purity react/refs react/set-state-in-effect sonarjs/elseif-without-else sonarjs/expression-complexity sonarjs/function-name sonarjs/no-duplicate-string sonarjs/no-nested-conditional sonarjs/shorthand-property-grouping sonarjs/super-linear-regex sonarjs/too-many-break-or-continue-in-loop studio/boolean-name studio/feature-file-layout studio/feature-index-import studio/import-resolves studio/module-function-verb studio/no-busy-flag studio/no-dom-query studio/no-hook-component-import studio/no-inline-copy studio/no-then studio/no-ui-storage studio/no-undefined-type studio/predicate-name studio/readonly-field typescript/explicit-function-return-type typescript/explicit-module-boundary-types typescript/no-import-type-side-effects unicorn/catch-error-name unicorn/consistent-function-scoping unicorn/filename-case unicorn/max-nested-calls unicorn/no-array-for-each unicorn/no-nested-ternary unicorn/prefer-global-this unicorn/prefer-spread vitest/prefer-expect-assertions vitest/require-test-timeout github/a11y-role-supports-aria-props jsx-a11y/interactive-supports-focus jsx-a11y/no-noninteractive-element-interactions jsx-a11y/no-noninteractive-tabindex jsx-a11y/prefer-tag-over-role jsx-a11y/role-has-required-aria-props"
        .split(" ")
        .map((rule) => [rule, "warn"])
    ),
  },
  {
    files: [
      "src/ui/features/inspector/layout-keys.ts",
      "src/ui/features/inspector/auto-layout-section.tsx",
      "src/ui/features/inspector/size-row.tsx",
      "src/ui/features/inspector/size-limits.tsx",
      "src/ui/features/inspector/position-rows.tsx",
      "src/ui/features/inspector/inspector-layout.tsx",
      "src/ui/features/inspector/match-scan.ts",
      "src/ui/features/inspector/match-candidates.tsx",
      "src/ui/features/inspector/match-token-picker.tsx",
      "src/ui/features/inspector/match-rows.tsx",
      "src/ui/features/inspector/inspector-match.tsx",
      "src/ui/features/inspector/arrange-model.ts",
      "src/ui/features/inspector/use-arrange.ts",
      "src/ui/features/inspector/inspector-arrange.tsx",
      "src/ui/features/inspector/inspector-rows.tsx",
      "src/ui/features/inspector/inspector-shared.tsx",
      "src/ui/features/inspector/inspector-source.tsx",
      "src/ui/features/inspector/inspector-props.tsx",
      "src/ui/features/inspector/inspector-simple.tsx",
      "src/ui/features/inspector/inspector-tokens.tsx",
      "src/ui/features/inspector/inspector-tools.tsx",
      "src/ui/features/inspector/inspector-tweaks.tsx",
      "src/ui/features/inspector/inspector-variant-bar.tsx",
      "src/ui/features/inspector/inspector-vector.tsx",
      "src/ui/features/inspector/tweaks-panel.tsx",
      "src/ui/features/inspector/swap-instance-menu.tsx",
      "src/ui/features/inspector/element-variants-dialog.tsx",
      "src/ui/features/inspector/swatches.tsx",
    ],
    rules: Object.fromEntries(
      "anti-slop/no-known-value-widening jsx-a11y/role-supports-aria-props oxc/no-accumulating-spread promise/avoid-new promise/no-callback-in-promise react-doctor/no-adjust-state-on-prop-change react-doctor/no-pass-data-to-parent react-doctor/no-pass-live-state-to-parent react-doctor/no-reset-all-state-on-prop-change react-doctor/no-spread-accumulator-in-reduce react/memo-dependencies react/todo react/use-memo sonarjs/no-nested-template-literals studio/no-finally-state-reset typescript/consistent-type-definitions unicorn/no-array-callback-reference unicorn/no-array-reduce unicorn/no-array-sort unicorn/prefer-number-coercion unicorn/prefer-number-properties"
        .split(" ")
        .map((rule) => [rule, "warn"])
    ),
  },
  {
    files: [
      "src/ui/features/inspector/inspector-props.tsx",
      "src/ui/features/inspector/inspector-simple.tsx",
      "src/ui/features/inspector/inspector-tokens.tsx",
      "src/ui/features/inspector/inspector-tools.tsx",
      "src/ui/features/inspector/inspector-tweaks.tsx",
      "src/ui/features/inspector/inspector-variant-bar.tsx",
      "src/ui/features/inspector/inspector-vector.tsx",
      "src/ui/features/inspector/tweaks-panel.tsx",
      "src/ui/features/inspector/swap-instance-menu.tsx",
      "src/ui/features/inspector/element-variants-dialog.tsx",
      "src/ui/features/inspector/swatches.tsx",
    ],
    rules: Object.fromEntries(
      "eslint/max-lines eslint/no-plusplus import/max-dependencies jsx-a11y/control-has-associated-label promise/catch-or-return react-doctor/prefer-html-dialog react-doctor/rerender-lazy-state-init react/button-has-type sonarjs/max-lines sonarjs/max-union-size sonarjs/no-built-in-override sonarjs/no-identical-functions sonarjs/no-nested-incdec unicorn/no-useless-collection-argument unicorn/no-useless-undefined"
        .split(" ")
        .map((rule) => [rule, "warn"])
    ),
  },
  {
    files: [
      "src/ui/features/home/app-slot.tsx",
      "src/ui/features/home/chip-menu-slot.tsx",
      "src/ui/features/home/composer-bar.tsx",
      "src/ui/features/home/doctor-model.ts",
      "src/ui/features/home/drop-hint.tsx",
      "src/ui/features/home/hero-notes.tsx",
      "src/ui/features/home/home-composer-parts.tsx",
      "src/ui/features/home/home-empty.tsx",
      "src/ui/features/home/home-extras.tsx",
      "src/ui/features/home/home-header.tsx",
      "src/ui/features/home/home-library.tsx",
      "src/ui/features/home/home-model.ts",
      "src/ui/features/home/home-overlays.tsx",
      "src/ui/features/home/home-sections.tsx",
      "src/ui/features/home/home-slash.tsx",
      "src/ui/features/home/home-starters.tsx",
      "src/ui/features/home/home-templates.tsx",
      "src/ui/features/home/home.tsx",
      "src/ui/features/home/lazy-parts.ts",
      "src/ui/features/home/library-area.tsx",
      "src/ui/features/home/library-panel.tsx",
      "src/ui/features/home/pill-select.tsx",
      "src/ui/features/home/prompt-area.tsx",
      "src/ui/features/home/send-button.tsx",
      "src/ui/features/home/starter-row.tsx",
      "src/ui/features/home/templates-section.tsx",
      "src/ui/features/home/use-chip-flow.ts",
      "src/ui/features/home/use-doctor-gate.ts",
      "src/ui/features/home/use-example.ts",
      "src/ui/features/home/use-home-screen.tsx",
      "src/ui/features/home/use-module.ts",
      "src/ui/features/home/use-open-app-requests.ts",
      "src/ui/features/home/use-open-flows.ts",
      "src/ui/features/home/use-root-drop.ts",
      "src/ui/components/Home.tsx",
      "src/ui/components/HomeSections.tsx",
      "src/ui/components/HomeEmpty.tsx",
      "src/ui/components/HomeExtras.tsx",
      "src/ui/components/HomeLibrary.tsx",
      "src/ui/components/HomeStarters.tsx",
      "src/ui/components/HomeTemplates.tsx",
      "src/ui/components/HomeSlash.tsx",
      "src/ui/components/HomeComposerParts.tsx",
      "src/ui/home-commands.ts",
      "src/ui/features/home/project-grid.tsx",
      "src/ui/features/home/project-rail.tsx",
      "src/ui/features/home/project-thumb.tsx",
      "src/ui/features/home/project-card-menus.tsx",
      "src/ui/features/home/home-app-chip.tsx",
      "src/ui/features/home/home-app-menu.tsx",
      "src/ui/features/home/home-popovers.tsx",
      "src/ui/features/home/home-trash.tsx",
      "src/ui/features/home/home-doctor.tsx",
      "src/ui/features/home/new-project-advanced.tsx",
      "src/ui/features/home/folder-controls.tsx",
      "src/ui/components/ProjectGrid.tsx",
      "src/ui/components/ProjectRail.tsx",
      "src/ui/components/ProjectThumb.tsx",
      "src/ui/components/ProjectCardMenus.tsx",
      "src/ui/components/HomeAppChip.tsx",
      "src/ui/components/HomeAppMenu.tsx",
      "src/ui/components/HomePopovers.tsx",
      "src/ui/components/HomeTrash.tsx",
      "src/ui/components/HomeDoctor.tsx",
      "src/ui/components/NewProjectAdvanced.tsx",
      "src/ui/components/FolderControls.tsx",
      "src/ui/features/home/home-prefs-model.ts",
      "src/ui/features/home/projects-store-model.ts",
      "src/ui/features/home/project-hits-model.ts",
      "src/ui/features/home/use-workspaces.ts",
      "src/ui/features/home/use-folder-chooser.ts",
      "src/ui/features/home/use-profile-initial.ts",
      "src/ui/features/home/use-studio-data.ts",
      "src/ui/homePrefs.ts",
      "src/ui/projectsStore.ts",
      "src/ui/projectHits.ts",
      "src/ui/useWorkspaces.ts",
      "src/ui/useFolderChooser.ts",
      "src/ui/useProfileInitial.ts",
      "src/ui/useStudioData.ts",
    ],
    rules: Object.fromEntries(
      "anti-slop/no-array-filter-map anti-slop/no-conditional-empty-object-spread anti-slop/no-known-value-widening anti-slop/no-unknown-parameters anti-slop/no-unsafe-dictionary-type anti-slop/require-readable-spacing eslint/func-style eslint/id-length eslint/max-lines eslint/max-lines-per-function eslint/max-params eslint/max-statements eslint/no-magic-numbers eslint/no-nested-ternary eslint/no-ternary eslint/no-undefined eslint/no-unused-vars eslint/no-void eslint/prefer-destructuring eslint/prefer-named-capture-group eslint/require-unicode-regexp eslint/sort-imports eslint/sort-keys github/array-foreach github/filenames-match-regex github/no-then import/consistent-type-specifier-style import/exports-last import/group-exports import/max-dependencies import/no-default-export import/no-relative-parent-imports import/prefer-default-export promise/always-return promise/no-callback-in-promise promise/prefer-await-to-callbacks promise/prefer-await-to-then react-doctor/js-combine-iterations react-doctor/no-adjust-state-on-prop-change react-doctor/no-create-object-url-without-revoke react-doctor/no-img-without-dimensions react-doctor/no-loading-flag-reset-outside-finally react-doctor/no-ref-current-in-render react-doctor/only-export-components react-doctor/prefer-module-scope-pure-function react-doctor/rerender-memo-with-default-value react-doctor/rerender-state-only-in-handlers react-perf/jsx-no-jsx-as-prop react-perf/jsx-no-new-array-as-prop react-perf/jsx-no-new-function-as-prop react-perf/jsx-no-new-object-as-prop react/exhaustive-effect-dependencies react/forbid-component-props react/function-component-definition react/immutability react/jsx-handler-names react/jsx-max-depth react/jsx-no-literals react/jsx-props-no-spreading react/no-multi-comp react/no-object-type-as-default-prop react/only-export-components react/refs react/set-state-in-effect react/todo sonarjs/expression-complexity sonarjs/max-lines sonarjs/max-lines-per-function sonarjs/max-union-size sonarjs/no-dead-store sonarjs/no-duplicate-string sonarjs/no-nested-conditional sonarjs/no-unused-vars sonarjs/shorthand-property-grouping studio/boolean-name studio/feature-file-layout studio/feature-index-import studio/module-function-verb studio/no-busy-flag studio/no-dom-query studio/no-feature-interval studio/no-finally-state-reset studio/no-hook-component-import studio/no-inline-copy studio/no-json-cast studio/no-then studio/no-undefined-type studio/readonly-field typescript/consistent-type-definitions typescript/consistent-type-imports typescript/explicit-function-return-type typescript/explicit-module-boundary-types unicorn/catch-error-name unicorn/consistent-function-scoping unicorn/filename-case unicorn/no-array-callback-reference unicorn/no-array-for-each unicorn/no-array-sort unicorn/no-await-expression-member unicorn/no-nested-ternary unicorn/no-useless-undefined unicorn/prefer-global-this unicorn/prefer-spread"
        .split(" ")
        .map((rule) => [rule, "warn"])
    ),
  },
  {
    files: [
      "src/ui/features/home/home-extras.tsx",
      "src/ui/features/home/home-sections.tsx",
      "src/ui/features/home/home-templates.tsx",
      "src/ui/features/home/prompt-area.tsx",
    ],
    rules: {
      "jsx-a11y/no-autofocus": "off",
      "jsx-a11y/prefer-tag-over-role": "off",
      "promise/prefer-await-to-callbacks": "off",
    },
  },
  {
    files: [
      "src/ui/home-commands.ts",
      "src/ui/features/home/project-grid.tsx",
      "src/ui/features/home/project-rail.tsx",
      "src/ui/features/home/project-thumb.tsx",
      "src/ui/features/home/project-card-menus.tsx",
      "src/ui/features/home/home-app-chip.tsx",
      "src/ui/features/home/home-app-menu.tsx",
      "src/ui/features/home/home-popovers.tsx",
      "src/ui/features/home/home-trash.tsx",
      "src/ui/features/home/home-doctor.tsx",
      "src/ui/features/home/new-project-advanced.tsx",
      "src/ui/features/home/folder-controls.tsx",
      "src/ui/components/ProjectGrid.tsx",
      "src/ui/components/ProjectRail.tsx",
      "src/ui/components/ProjectThumb.tsx",
      "src/ui/components/ProjectCardMenus.tsx",
      "src/ui/components/HomeAppChip.tsx",
      "src/ui/components/HomeAppMenu.tsx",
      "src/ui/components/HomePopovers.tsx",
      "src/ui/components/HomeTrash.tsx",
      "src/ui/components/HomeDoctor.tsx",
      "src/ui/components/NewProjectAdvanced.tsx",
      "src/ui/components/FolderControls.tsx",
      "src/ui/features/home/home-prefs-model.ts",
      "src/ui/features/home/projects-store-model.ts",
      "src/ui/features/home/project-hits-model.ts",
      "src/ui/features/home/use-workspaces.ts",
      "src/ui/features/home/use-folder-chooser.ts",
      "src/ui/features/home/use-profile-initial.ts",
      "src/ui/features/home/use-studio-data.ts",
      "src/ui/homePrefs.ts",
      "src/ui/projectsStore.ts",
      "src/ui/projectHits.ts",
      "src/ui/useWorkspaces.ts",
      "src/ui/useFolderChooser.ts",
      "src/ui/useProfileInitial.ts",
      "src/ui/useStudioData.ts",
    ],
    rules: Object.fromEntries(
      "anti-slop/no-runtime-typeof anti-slop/require-readable-spacing eslint/curly eslint/no-await-in-loop eslint/no-continue eslint/no-duplicate-imports eslint/no-promise-executor-return eslint/no-use-before-define eslint/no-useless-return import/no-duplicates import/no-unassigned-import promise/avoid-new promise/catch-or-return promise/prefer-catch react/no-array-index-key react-doctor/design-no-vague-button-label react-doctor/form-control-requires-name react-doctor/js-set-map-lookups react-doctor/no-enter-submit-without-ime-composition-guard react-doctor/no-high-complexity-react-function react-doctor/no-prop-callback-in-render react-doctor/no-derived-useState react-hooks/rules-of-hooks sonarjs/elseif-without-else sonarjs/no-nested-template-literals sonarjs/no-wildcard-import studio/no-reexport-shim studio/no-ui-storage studio/no-wildcard-reexport unicorn/prefer-array-find jsx-a11y/no-autofocus jsx-a11y/prefer-tag-over-role jsx-a11y/no-noninteractive-element-interactions jsx-a11y/interactive-supports-focus jsx-a11y/no-static-element-interactions jsx-a11y/control-has-associated-label github/a11y-no-title-attribute promise/prefer-await-to-callbacks studio/feature-index-import unicorn/prefer-set-has sonarjs/no-nested-functions react/purity react/memo-dependencies eslint/no-shadow unicorn/no-array-reduce unicorn/prefer-ternary eslint/init-declarations sonarjs/no-undefined-assignment react/hook-use-state eslint/default-case react-doctor/rerender-lazy-ref-init react-doctor/async-await-in-loop react-doctor/no-chain-state-updates"
        .split(" ")
        .map((rule) => [rule, "warn"])
    ),
  },
  {
    files: [
      "src/ui/features/chat/budget-indicator.tsx",
      "src/ui/features/chat/chat-feedback.tsx",
      "src/ui/features/chat/chat-panel-parts.tsx",
      "src/ui/features/chat/chat-panel-window.tsx",
      "src/ui/features/chat/chat-panel.tsx",
      "src/ui/features/chat/chat-parts.tsx",
      "src/ui/features/chat/chat-rewind.tsx",
      "src/ui/features/chat/chat-run-entry.tsx",
      "src/ui/features/chat/chat-run-parts.tsx",
      "src/ui/features/chat/chat-search.tsx",
      "src/ui/features/chat/chat-splitter.tsx",
      "src/ui/features/chat/chat-turn-model.ts",
      "src/ui/features/chat/clarify-form.tsx",
      "src/ui/features/chat/context-meter.tsx",
      "src/ui/features/chat/index.ts",
      "src/ui/features/chat/latency-breakdown.tsx",
      "src/ui/features/chat/permission-prompt.tsx",
      "src/ui/features/chat/queued-messages.tsx",
      "src/ui/features/chat/todo-panel.tsx",
      "src/ui/features/chat/unfinished-banner.tsx",
      "src/ui/features/chat/use-chat-panel.ts",
      "src/ui/components/ChatPanel.tsx",
      "src/ui/components/ChatPanelWindow.tsx",
      "src/ui/components/ChatParts.tsx",
      "src/ui/components/ChatRewind.tsx",
      "src/ui/components/ChatSearch.tsx",
      "src/ui/components/ChatSplitter.tsx",
      "src/ui/components/ChatFeedback.tsx",
      "src/ui/components/ClarifyForm.tsx",
      "src/ui/components/QueuedMessages.tsx",
      "src/ui/components/UnfinishedBanner.tsx",
      "src/ui/components/TodoPanel.tsx",
      "src/ui/components/LatencyBreakdown.tsx",
      "src/ui/components/BudgetIndicator.tsx",
      "src/ui/components/ContextMeter.tsx",
      "src/ui/components/PermissionPrompt.tsx",
      "src/ui/features/chat/prompt-box.tsx",
      "src/ui/components/PromptBox.tsx",
      "src/ui/features/chat/composer-menu.tsx",
      "src/ui/components/ComposerMenu.tsx",
      "src/ui/features/chat/composer-parts.tsx",
      "src/ui/components/ComposerParts.tsx",
      "src/ui/features/chat/composer-focus.ts",
      "src/ui/components/ComposerFocus.ts",
      "src/ui/features/chat/mention-picker.tsx",
      "src/ui/components/MentionPicker.tsx",
      "src/ui/features/chat/slash-menu.tsx",
      "src/ui/components/SlashMenu.tsx",
      "src/ui/features/chat/slash-groups.ts",
      "src/ui/components/slashGroups.ts",
      "src/ui/features/chat/skill-picker.tsx",
      "src/ui/components/SkillPicker.tsx",
      "src/ui/features/chat/skills-checklist.tsx",
      "src/ui/components/SkillsChecklist.tsx",
      "src/ui/features/chat/history-search.tsx",
      "src/ui/components/HistorySearch.tsx",
      "src/ui/features/chat/inline-prompt.tsx",
      "src/ui/components/InlinePrompt.tsx",
      "src/ui/features/chat/stable-text.tsx",
      "src/ui/components/StableText.tsx",
      "src/ui/features/chat/mcp-feed.tsx",
      "src/ui/components/McpFeed.tsx",
      "src/ui/features/chat/mcp-point-badge.tsx",
      "src/ui/components/McpPointBadge.tsx",
      "src/ui/features/chat/mcp-toasts.tsx",
      "src/ui/components/McpToasts.tsx",
      "src/ui/features/chat/run-comments.tsx",
      "src/ui/components/RunComments.tsx",
      "src/ui/features/chat/run-context-chip.tsx",
      "src/ui/components/RunContextChip.tsx",
      "src/ui/features/chat/run-details.tsx",
      "src/ui/components/RunDetails.tsx",
      "src/ui/features/chat/run-settings.tsx",
      "src/ui/components/RunSettings.tsx",
      "src/ui/features/chat/level-control.tsx",
      "src/ui/components/LevelControl.tsx",
      "src/ui/features/chat/tool-chips.test.ts",
      "src/ui/features/chat/draft-improve.test.ts",
      "src/ui/features/chat/tool-chips.tsx",
      "src/ui/components/ToolChips.tsx",
      "src/ui/features/chat/repo-context-chip.tsx",
      "src/ui/components/RepoContextChip.tsx",
      "src/ui/features/chat/draft-bar.tsx",
      "src/ui/components/DraftBar.tsx",
      "src/ui/features/chat/draft-improve.tsx",
      "src/ui/components/DraftImprove.tsx",
      "src/ui/features/chat/draft-sources.tsx",
      "src/ui/components/DraftSources.tsx",
      "src/ui/features/chat/use-chat-state.ts",
      "src/ui/useChatState.ts",
      "src/ui/features/chat/use-composer-keys.ts",
      "src/ui/useComposerKeys.ts",
      "src/ui/features/chat/use-mentions.ts",
      "src/ui/useMentions.ts",
      "src/ui/features/chat/use-run-controls.ts",
      "src/ui/useRunControls.ts",
      "src/ui/features/chat/use-run-level.ts",
      "src/ui/useRunLevel.ts",
      "src/ui/features/chat/use-run-notice.ts",
      "src/ui/useRunNotice.ts",
      "src/ui/features/chat/use-run-canvas.ts",
      "src/ui/useRunCanvas.ts",
      "src/ui/features/chat/use-rewind.ts",
      "src/ui/useRewind.ts",
      "src/ui/features/chat/use-mcp-feed.ts",
      "src/ui/useMcpFeed.ts",
      "src/ui/features/chat/use-inline-prompt.ts",
      "src/ui/useInlinePrompt.ts",
      "src/ui/features/chat/use-first-build.ts",
      "src/ui/useFirstBuild.ts",
      "src/ui/features/chat/use-escape-stop.ts",
      "src/ui/useEscapeStop.ts",
      "src/ui/features/chat/use-presence.ts",
      "src/ui/usePresence.ts",
      "src/ui/features/chat/run-state-model.ts",
      "src/ui/runState.ts",
      "src/ui/features/chat/run-feedback-model.ts",
      "src/ui/runFeedback.ts",
      "src/ui/features/chat/run-history-model.ts",
      "src/ui/runHistoryApi.ts",
      "src/ui/features/chat/skills-model.ts",
      "src/ui/skills.ts",
      "src/ui/features/chat/tool-labels-model.ts",
      "src/ui/toolLabels.ts",
      "src/ui/features/chat/chat-search-model.ts",
      "src/ui/chatSearchState.ts",
      "src/ui/features/chat/mcp-model.ts",
      "src/ui/mcpApi.ts",
      "src/ui/features/chat/settings-draft-model.ts",
      "src/ui/settingsDraft.ts",
      "src/ui/features/chat/approval-spot-model.ts",
      "src/ui/approvalSpot.ts",
      "src/ui/features/chat/run-state-model.test.ts",
      "src/ui/features/chat/run-settings.test.ts",
      "src/ui/chat-slots.ts",
    ],
    rules: Object.fromEntries(
      "anti-slop/no-array-filter-map anti-slop/no-chained-type-assertions anti-slop/no-unknown-returns sonarjs/no-unused-vars eslint/default-case unicorn/prefer-add-event-listener typescript/no-non-null-assertion vitest/require-hook vitest/max-expects anti-slop/no-unsafe-dictionary-type react-doctor/no-side-effect-in-state-updater-function eslint/no-useless-return studio/no-ui-storage typescript/no-dynamic-delete anti-slop/no-conditional-empty-object-spread anti-slop/no-known-value-widening anti-slop/no-runtime-typeof anti-slop/no-unknown-parameters anti-slop/require-readable-spacing boundaries/dependencies eslint/complexity eslint/curly eslint/func-style eslint/id-length eslint/max-lines eslint/max-lines-per-function eslint/max-params eslint/max-statements eslint/no-await-in-loop eslint/no-continue eslint/no-magic-numbers eslint/no-nested-ternary eslint/no-plusplus eslint/no-ternary eslint/no-undefined eslint/no-unused-vars eslint/no-use-before-define eslint/no-void eslint/prefer-arrow-callback eslint/prefer-destructuring eslint/prefer-named-capture-group eslint/require-unicode-regexp eslint/sort-keys github/a11y-role-supports-aria-props github/array-foreach github/no-blur github/no-then github/prefer-observers import/consistent-type-specifier-style import/exports-last import/group-exports import/max-dependencies import/no-default-export import/no-relative-parent-imports import/no-unassigned-import jsx-a11y/click-events-have-key-events jsx-a11y/control-has-associated-label jsx-a11y/interactive-supports-focus jsx-a11y/no-autofocus jsx-a11y/no-noninteractive-element-interactions jsx-a11y/no-noninteractive-element-to-interactive-role jsx-a11y/no-static-element-interactions jsx-a11y/prefer-tag-over-role jsx-a11y/role-supports-aria-props promise/always-return promise/catch-or-return promise/prefer-await-to-callbacks promise/prefer-await-to-then promise/prefer-catch react-doctor/async-await-in-loop react-doctor/data-table-requires-accessible-name react-doctor/empty-table-header react-doctor/form-control-requires-name react-doctor/js-combine-iterations react-doctor/js-set-map-lookups react-doctor/no-adjust-state-on-prop-change react-doctor/no-array-index-as-key react-doctor/no-chain-state-updates react-doctor/no-create-object-url-without-revoke react-doctor/no-enter-submit-without-ime-composition-guard react-doctor/no-event-handler react-doctor/no-giant-component react-doctor/no-high-complexity-react-function react-doctor/no-pass-live-state-to-parent react-doctor/no-ref-current-in-render react-doctor/no-reset-all-state-on-prop-change react-doctor/no-unguarded-browser-global-at-module-scope react-doctor/no-unguarded-browser-global-in-render-or-hook-init react-doctor/only-export-components react-doctor/prefer-html-dialog react-doctor/prefer-module-scope-pure-function react-doctor/rendering-conditional-render react-doctor/rerender-state-only-in-handlers react-hooks/exhaustive-deps react-perf/jsx-no-jsx-as-prop react-perf/jsx-no-new-array-as-prop react-perf/jsx-no-new-function-as-prop react-perf/jsx-no-new-object-as-prop react/button-has-type react/exhaustive-effect-dependencies react/forbid-component-props react/function-component-definition react/hook-use-state react/jsx-handler-names react/jsx-max-depth react/jsx-no-literals react/jsx-no-useless-fragment react/jsx-props-no-spreading react/memo-dependencies react/no-array-index-key react/no-multi-comp react/no-unescaped-entities react/only-export-components react/purity react/refs react/set-state-in-effect react/todo sonarjs/elseif-without-else sonarjs/expression-complexity sonarjs/function-name sonarjs/max-lines sonarjs/max-lines-per-function sonarjs/no-duplicate-string sonarjs/no-nested-conditional sonarjs/no-nested-functions sonarjs/no-nested-incdec sonarjs/no-nested-template-literals sonarjs/no-wildcard-import sonarjs/shorthand-property-grouping sonarjs/super-linear-regex studio/feature-index-import studio/import-resolves studio/no-busy-flag studio/no-dom-query studio/no-feature-interval studio/no-finally-state-reset studio/no-hook-component-import studio/no-inline-copy studio/no-then studio/no-wildcard-reexport typescript/explicit-function-return-type typescript/explicit-module-boundary-types unicorn/catch-error-name unicorn/consistent-function-scoping unicorn/explicit-length-check unicorn/no-array-callback-reference unicorn/no-array-for-each unicorn/no-array-reduce unicorn/no-array-reverse unicorn/no-array-sort unicorn/no-nested-ternary unicorn/no-useless-undefined unicorn/prefer-at unicorn/prefer-export-from unicorn/prefer-global-this unicorn/prefer-query-selector unicorn/prefer-spread vitest/prefer-expect-assertions vitest/prefer-strict-equal vitest/prefer-to-be-falsy vitest/prefer-to-be-truthy vitest/require-test-timeout"
        .split(" ")
        .map((rule) => [rule, "warn"])
    ),
  },
  {
    files: [
      "src/ui/features/canvas/canvas-chrome-menu.tsx",
      "src/ui/features/canvas/canvas-chrome.tsx",
      "src/ui/features/canvas/canvas-helpers.ts",
      "src/ui/features/canvas/canvas-layers.tsx",
      "src/ui/features/canvas/canvas-overlays.tsx",
      "src/ui/features/canvas/canvas-shell.ts",
      "src/ui/features/canvas/canvas-stage.tsx",
      "src/ui/features/canvas/canvas-tool-slots.tsx",
      "src/ui/features/canvas/canvas-types.ts",
      "src/ui/features/canvas/canvas-view.tsx",
      "src/ui/features/canvas/canvas.tsx",
      "src/ui/features/canvas/index.ts",
      "src/ui/features/canvas/stage-parts.tsx",
      "src/ui/features/canvas/use-canvas-edits.ts",
      "src/ui/features/canvas/use-canvas-preview.ts",
      "src/ui/features/canvas/use-canvas-stage.ts",
      "src/ui/features/canvas/use-canvas-wiring.tsx",
      "src/ui/features/canvas/use-frame-labels.tsx",
      "src/ui/features/canvas/use-preview-url.ts",
      "src/ui/features/canvas/use-stage-keys.ts",
      "src/ui/components/Canvas.tsx",
      "src/ui/components/CanvasChrome.tsx",
      "src/ui/components/CanvasLayers.tsx",
      "src/ui/components/CanvasOverlays.tsx",
      "src/ui/app/canvas-commands-host.tsx",
      "src/ui/canvas-slots.ts",
    ],
    rules: Object.fromEntries(
      "anti-slop/no-array-filter-map anti-slop/no-chained-type-assertions anti-slop/no-unknown-returns sonarjs/no-unused-vars eslint/default-case unicorn/prefer-add-event-listener typescript/no-non-null-assertion vitest/require-hook vitest/max-expects anti-slop/no-unsafe-dictionary-type react-doctor/no-side-effect-in-state-updater-function eslint/no-useless-return studio/no-ui-storage typescript/no-dynamic-delete anti-slop/no-conditional-empty-object-spread anti-slop/no-known-value-widening anti-slop/no-runtime-typeof anti-slop/no-unknown-parameters anti-slop/require-readable-spacing boundaries/dependencies eslint/complexity eslint/curly eslint/func-style eslint/id-length eslint/max-lines eslint/max-lines-per-function eslint/max-params eslint/max-statements eslint/no-await-in-loop eslint/no-continue eslint/no-magic-numbers eslint/no-nested-ternary eslint/no-plusplus eslint/no-ternary eslint/no-undefined eslint/no-unused-vars eslint/no-use-before-define eslint/no-void eslint/prefer-arrow-callback eslint/prefer-destructuring eslint/prefer-named-capture-group eslint/require-unicode-regexp eslint/sort-keys github/a11y-role-supports-aria-props github/array-foreach github/no-blur github/no-then github/prefer-observers import/consistent-type-specifier-style import/exports-last import/group-exports import/max-dependencies import/no-default-export import/no-relative-parent-imports import/no-unassigned-import jsx-a11y/click-events-have-key-events jsx-a11y/control-has-associated-label jsx-a11y/interactive-supports-focus jsx-a11y/no-autofocus jsx-a11y/no-noninteractive-element-interactions jsx-a11y/no-noninteractive-element-to-interactive-role jsx-a11y/no-static-element-interactions jsx-a11y/prefer-tag-over-role jsx-a11y/role-supports-aria-props promise/always-return promise/catch-or-return promise/prefer-await-to-callbacks promise/prefer-await-to-then promise/prefer-catch react-doctor/async-await-in-loop react-doctor/data-table-requires-accessible-name react-doctor/empty-table-header react-doctor/form-control-requires-name react-doctor/js-combine-iterations react-doctor/js-set-map-lookups react-doctor/no-adjust-state-on-prop-change react-doctor/no-array-index-as-key react-doctor/no-chain-state-updates react-doctor/no-create-object-url-without-revoke react-doctor/no-enter-submit-without-ime-composition-guard react-doctor/no-event-handler react-doctor/no-giant-component react-doctor/no-high-complexity-react-function react-doctor/no-pass-live-state-to-parent react-doctor/no-ref-current-in-render react-doctor/no-reset-all-state-on-prop-change react-doctor/no-unguarded-browser-global-at-module-scope react-doctor/no-unguarded-browser-global-in-render-or-hook-init react-doctor/only-export-components react-doctor/prefer-html-dialog react-doctor/prefer-module-scope-pure-function react-doctor/rendering-conditional-render react-doctor/rerender-state-only-in-handlers react-hooks/exhaustive-deps react-perf/jsx-no-jsx-as-prop react-perf/jsx-no-new-array-as-prop react-perf/jsx-no-new-function-as-prop react-perf/jsx-no-new-object-as-prop react/button-has-type react/exhaustive-effect-dependencies react/forbid-component-props react/function-component-definition react/hook-use-state react/jsx-handler-names react/jsx-max-depth react/jsx-no-literals react/jsx-no-useless-fragment react/jsx-props-no-spreading react/memo-dependencies react/no-array-index-key react/no-multi-comp react/no-unescaped-entities react/only-export-components react/purity react/refs react/set-state-in-effect react/todo sonarjs/elseif-without-else sonarjs/expression-complexity sonarjs/function-name sonarjs/max-lines sonarjs/max-lines-per-function sonarjs/no-duplicate-string sonarjs/no-nested-conditional sonarjs/no-nested-functions sonarjs/no-nested-incdec sonarjs/no-nested-template-literals sonarjs/no-wildcard-import sonarjs/shorthand-property-grouping sonarjs/super-linear-regex studio/feature-index-import studio/import-resolves studio/no-busy-flag studio/no-dom-query studio/no-feature-interval studio/no-finally-state-reset studio/no-hook-component-import studio/no-inline-copy studio/no-then studio/no-wildcard-reexport typescript/explicit-function-return-type typescript/explicit-module-boundary-types unicorn/catch-error-name unicorn/consistent-function-scoping unicorn/explicit-length-check unicorn/no-array-callback-reference unicorn/no-array-for-each unicorn/no-array-reduce unicorn/no-array-reverse unicorn/no-array-sort unicorn/no-nested-ternary unicorn/no-useless-undefined unicorn/prefer-at unicorn/prefer-export-from unicorn/prefer-global-this unicorn/prefer-query-selector unicorn/prefer-spread vitest/prefer-expect-assertions vitest/prefer-strict-equal vitest/prefer-to-be-falsy vitest/prefer-to-be-truthy vitest/require-test-timeout react-doctor/prefer-use-effect-event react/immutability oxc/no-map-spread typescript/no-invalid-void-type typescript/consistent-type-definitions react-doctor/no-barrel-import oxc/no-barrel-file anti-slop/no-shape-in-symbol-names eslint/no-shadow typescript/consistent-type-imports node/no-sync sonarjs/bool-param-default"
        .split(" ")
        .map((rule) => [rule, "warn"])
    ),
  },
];
