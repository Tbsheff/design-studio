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
      "src/server/events/bus.ts",
      "src/server/events/change-feed.ts",
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
      "src/server/store/{authorizer,data-lock,default-folder,events,git-objects,local-principal,mutex,project-access,skill-store,starters,studio-info}.ts",
      "src/{server/handlers/_core/handler,server/handlers/_core/run-action,server/handlers/studio/handlers,server/handlers/studio/health,server/handlers/studio/list-skills,server/handlers/studio/live,shared/actions/studio/health,shared/actions/studio/list-skills}.ts",
      "src/server/{http/mount,http/mount-all,http/wire-error,mcp/registry,agent-tools/registry,agent-tools/sdk-shape}.ts",
      "{cloud/publish-worker/src/protocol,src/server/handlers/publish/{live,get,handlers,inspect,list,list-comments,publish,unpublish,restore,delete-comment,start,stop,delete,set,apply},src/server/publish/{cf-cli,publications,publish-core,publish-store,legacy-link,plan-card,plan-input,publish-planner},src/shared/actions/_core/http-status,src/shared/actions/_core/errors/all,src/shared/actions/publish/{errors/status,get,inspect,list,list-comments,publish,unpublish,restore,delete-comment,start,stop,delete,set,apply},src/server/handlers/share/{live,handlers,list,create,delete,update,set-cursor,set-lan},src/server/share/{share-core,share-store,share-listener,live-refresher,share-attempt,share-cards,share-link-store,share-links},src/shared/actions/share/{list,create,delete,update,set-cursor,set-lan},src/server/handlers/comments/{live,handlers,list,search-mention,create,update,delete,delete-reply,create-reply,export,insert,move,set-resolved,start},src/server/comments/{comment-core,comment-store,comment-thread-store,comment-page,work-tree,index,comment-insert,frame-target,comment-run-starter,run-payload,run-watch},src/shared/actions/comments/{schema,errors/status,list,search-mention,create,update,delete,delete-reply,create-reply,export,insert,move,set-resolved,start},src/server/handlers/ship/{live,handlers,get-plan,inspect,publish,get-settings,set-settings},src/server/ship/{ship-core,ship-plans,ship-settings,ship-store,ship-runner},src/shared/actions/ship/{schema,get-plan,inspect,publish,get-settings,set-settings},src/server/handlers/export/{live,handlers,get-code,export,export-frame,export-folder,export-handoff,get-handoff},src/server/export/{export-core,export-store,copy-target,export-writer,export-file,export-runs,export-frames,export-write,folder-export,frame-selector},src/shared/actions/export/{schema,get-code,export,export-frame,export-folder,export-handoff,get-handoff},src/server/handlers/packs/{live,handlers,list,get-pack,inspect-pack,get-draft,inspect-draft},src/server/design-system/ops/{library-core,library-reads,pack-store},src/shared/actions/packs/{schema,list,get-pack,inspect-pack,get-draft,inspect-draft}}.ts",
      "src/server/agent/legacy/agent-ops.ts",
      "src/server/agent/legacy/direct-edit.ts",
      "scripts/stamp/{names,templates,templates-ui,write}.ts",
      "scripts/stamp/probes/*.ts",
    ],
    rules: { "import/no-relative-parent-imports": "off" },
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
      "src/server/events/exit-flush.ts",
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
    ],
    rules: { "react-doctor/no-barrel-import": "off" },
  },
  {
    files: [
      "src/server/mcp/legacy/attach-app.ts",
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
      "src/server/mcp/legacy/export-files.ts",
      "src/server/mcp/legacy/export-schema.ts",
      "src/server/mcp/legacy/export.ts",
      "src/server/mcp/legacy/frame-target.ts",
      "src/server/mcp/legacy/mcp-life.ts",
      "src/server/mcp/legacy/mcp-read.ts",
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
      "src/server/mcp/legacy/ship.ts",
      "src/server/mcp/legacy/structure-element.ts",
      "src/server/mcp/legacy/studio.ts",
      "src/server/mcp/legacy/versions-result.ts",
      "src/server/mcp/legacy/versions-schema.ts",
      "src/server/mcp/legacy/versions.ts",
      "src/server/mcp/legacy/write-file.ts",
    ],
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
    files: [
      "src/server/{agent/icon-tool,http/icon-routes,icons/deps,mcp/icon-tools}.ts",
      "src/server/{mcp/text-style-tools,agent/text-style-tool,text-styles/deps}.ts",
      "src/server/{mcp/motion-tools,agent/motion-tool,motion/deps}.ts",
      "src/server/{mcp/fill-tools,agent/fill-tool,fill/deps}.ts",
      "src/server/{design-system/model/index,design-system/ops/index,spacing/deps,mcp/spacing-tools,agent/spacing-tool,components/variant-write/deps,mcp/component-variant-tools,agent/component-variant-tool,canvas/links/link-interaction,canvas/links/link-interaction-input,canvas/links/link-target,mcp/link-interaction-tools,agent/link-interaction-tool,page-import/deps,mcp/page-import-tools,agent/page-import-tool,text-search/deps,mcp/text-search-tools,agent/text-search-tool,breakpoints/deps,mcp/breakpoints-tools,agent/breakpoints-tool,state-styles/deps,mcp/state-styles-tools,agent/state-styles-tool,style-scope/engine/deps,stacking/deps,stacking/engine/deps,mcp/stacking-tools,agent/stacking-tool,image-search/deps,mcp/image-search-tools,agent/image-search-tool,accessibility/deps,mcp/accessibility-tools,agent/accessibility-tool}.ts",
      "src/server/{mcp/copy-code-tools,agent/copy-code-tool}.ts",
      "cloud/api/src/{tenant/{probes/{planted-tq,cross-org},repos/projects,blobs,current-org,db,resolver,viewer-db},auth/{gateway,permissions,rate-limit},http/{errors,middleware/{agent-auth,member-auth,member-directory,org-grant,viewer}}}.ts",
      "src/server/export/copy-handler.ts",
      "src/server/export/copy-react.ts",
      "src/server/http/text-style-routes.ts",
      "src/ui/features/icons/deps.ts",
      "src/ui/features/text-styles/deps.ts",
      "src/ui/features/motion/deps.ts",
      "src/server/http/{{fill,spacing,component-variant,link-interaction,page-import,text-search,motion,state-style,stacking,image-search,accessibility}-routes,app-{context,errors,project-files,request,run-parse,*-routes},loopback-guard}.ts",
      "src/{ui/features/{fill,spacing,component-variant,link-interaction,page-import,text-search,state-styles,stacking,image-search,accessibility}/deps,bridge/play-triggers}.ts",
    ],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: [
      "src/{server/comments/frame-target,server/comments/run-payload,shared/run-target,server/http/spacing-routes,ui/features/spacing/spacing-bands,server/share/share-links,shared/actions/comments/schema}.ts",
    ],
    rules: { "eslint/id-length": "off" },
  },
  {
    files: [
      "src/server/http/app-{context,project-files,request,run-parse,*-routes}.ts",
    ],
    rules: Object.fromEntries(
      "anti-slop/no-chained-type-assertions eslint/no-await-in-loop eslint/no-nested-ternary react-doctor/async-await-in-loop sonarjs/no-nested-conditional unicorn/max-nested-calls unicorn/no-nested-ternary anti-slop/no-conditional-empty-object-spread anti-slop/no-runtime-typeof anti-slop/no-unknown-parameters anti-slop/no-unsafe-dictionary-type anti-slop/require-readable-spacing eslint/func-style eslint/id-length eslint/init-declarations eslint/max-lines eslint/max-lines-per-function eslint/max-statements eslint/no-console eslint/no-continue eslint/no-empty-function eslint/no-magic-numbers eslint/no-promise-executor-return eslint/no-ternary eslint/no-undefined eslint/no-use-before-define eslint/require-unicode-regexp eslint/sort-keys github/no-then import/max-dependencies node/no-sync promise/avoid-new promise/prefer-await-to-callbacks promise/prefer-await-to-then react-doctor/server-sequential-independent-await sonarjs/elseif-without-else sonarjs/max-lines sonarjs/max-lines-per-function sonarjs/no-duplicate-string sonarjs/shorthand-property-grouping sonarjs/too-many-break-or-continue-in-loop typescript/explicit-function-return-type typescript/explicit-module-boundary-types unicorn/no-await-expression-member unicorn/no-useless-undefined unicorn/prefer-number-coercion eslint/no-loop-func eslint/no-unmodified-loop-condition sonarjs/no-nested-functions sonarjs/max-union-size sonarjs/expression-complexity sonarjs/super-linear-regex"
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
      "src/server/direct-edit/engine/index.ts",
      "src/server/direct-edit/{classes,css,errors,html,jsx-snippet,jsx,splice,structure-docs,structure-ops,structure,tokens,validate,variant-css,vector-boolean,vector-geometry,vector-snippet,vector-source}.ts",
      "src/server/direct-edit/tailwind/{classes,color,copy,html-site,index,jsx-site,map,plan,units}.ts",
      "src/server/direct-edit/index.ts",
      "src/server/direct-edit/commit/index.ts",
      "src/server/direct-edit/commit/imports.ts",
      "src/server/components/model.ts",
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
    files: ["*.config.ts", "cloud/api/src/index.ts"],
    rules: { "import/no-default-export": "off" },
  },
  {
    files: ["cloud/api/src/{platform/{bindings,rate-limiter},auth/options}.ts"],
    rules: { "sonarjs/no-implicit-dependencies": "off" },
  },
  {
    files: ["src/shared/actions/**", "src/server/**", "cloud/api/**"],
    rules: { "unicorn/throw-new-error": "off" },
  },
  {
    files: [
      "**/*.generated.ts",
      "src/shared/actions/*/index.ts",
      "src/shared/actions/*/routes.ts",
      "src/server/handlers/*/handlers.ts",
      "src/server/main/{live-layer,runtime-check}.ts",
    ],
    rules: {
      "import/max-dependencies": "off",
      "max-lines": "off",
      "sonarjs/no-duplicate-string": "off",
    },
  },
];
