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

export const decisionOverrides: OxlintOverride[] = [
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
      "src/server/platform/edit-origin/index.ts",
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
      "src/server/store/{device-bindings,authorizer,data-lock,default-folder,events,git-objects,local-principal,principal,mutex,project-access,skill-store,starters,studio-info}.ts",
      "src/{server/handlers/_core/handler,server/handlers/_core/run-action,server/handlers/studio/handlers,server/handlers/studio/health,server/handlers/studio/list-skills,server/handlers/studio/live,shared/actions/studio/health,shared/actions/studio/list-skills}.ts",
      "src/server/{http/mount,http/mount-all,http/wire-error,mcp/registry,agent-tools/registry,agent-tools/sdk-shape}.ts",
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
      "src/server/mcp/legacy/runs.ts",
      "src/server/mcp/legacy/session.ts",
      "src/server/mcp/legacy/set-token.ts",
      "src/server/mcp/legacy/structure-element.ts",
      "src/server/mcp/legacy/studio.ts",
      "src/server/mcp/legacy/versions.ts",
      "src/server/mcp/legacy/write-file.ts",
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
      "import/no-relative-parent-imports": "off",
    },
  },
  {
    files: ["src/server/mcp/{key-auth,key-introspect}.ts"],
    rules: {
      "anti-slop/require-readable-spacing": "warn",
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
    ],
    rules: Object.fromEntries(
      "eslint/max-classes-per-file eslint/new-cap anti-slop/no-chained-type-assertions eslint/no-await-in-loop eslint/no-nested-ternary react-doctor/async-await-in-loop sonarjs/no-nested-conditional unicorn/max-nested-calls unicorn/no-nested-ternary anti-slop/no-conditional-empty-object-spread anti-slop/no-runtime-typeof anti-slop/no-unknown-parameters anti-slop/no-unsafe-dictionary-type anti-slop/require-readable-spacing eslint/func-style eslint/id-length eslint/init-declarations eslint/max-lines eslint/max-lines-per-function eslint/max-statements eslint/no-console eslint/no-continue eslint/no-empty-function eslint/no-magic-numbers eslint/no-promise-executor-return eslint/no-ternary eslint/no-undefined eslint/no-use-before-define eslint/require-unicode-regexp eslint/sort-keys github/no-then import/max-dependencies node/no-sync promise/avoid-new promise/prefer-await-to-callbacks promise/prefer-await-to-then react-doctor/server-sequential-independent-await sonarjs/elseif-without-else sonarjs/max-lines sonarjs/max-lines-per-function sonarjs/no-duplicate-string sonarjs/shorthand-property-grouping sonarjs/too-many-break-or-continue-in-loop typescript/explicit-function-return-type typescript/explicit-module-boundary-types unicorn/no-await-expression-member unicorn/no-useless-undefined unicorn/prefer-number-coercion eslint/no-loop-func eslint/no-unmodified-loop-condition sonarjs/max-union-size sonarjs/expression-complexity sonarjs/super-linear-regex"
        .split(" ")
        .map((rule) => [rule, "warn"])
    ),
  },
  {
    files: [
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
];
