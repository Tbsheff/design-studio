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
      capIsNewExceptionPattern: String.raw`^(Schema|Context|Data|Layer|Effect|Stream|PubSub|Option|HttpApiMiddleware)\.`,
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

playwrightAll["playwright/require-soft-assertions"] = "off";

playwrightAll["unicorn/prefer-dom-node-text-content"] = "off";

const SERVER_MAIN = "apps/desktop/src/server/main/**";

const NODE_RUNTIMES = [
  "apps/desktop/src/server/**",
  "apps/desktop/src/**/*.test.ts",
  "apps/desktop/desktop/**",
  "apps/desktop/scripts/**",
  "apps/desktop/e2e/**",
  "cloud/**",
  "lint/**",
  "*.config.ts",
];

export const SCOPED_OFF_REASONS: Record<string, string> = {
  "import/no-relative-parent-imports":
    "Off in apps/desktop/src/ui/app files: the app composes sibling folders (features, platform, domain, kit) and the studio files import from the parent app folder. The budget-0 app folder has no shim to avoid this.",
  "import/no-unassigned-import":
    "Off in apps/desktop/src/ui/app/main.tsx: the Vite entry imports the global css file for its side effect.",
  "import/no-nodejs-modules":
    "Off where the code runs on Node: it can never reach 0 there. The coarse ban covers browser code.",
  "no-console":
    "Off in the logger and in scripts only (plan 5.2). Other server code logs through platform/logger.",
  "node/no-process-env":
    "Off in the config module, apps/desktop/desktop/env.ts and the server entry, which own env access (plan 5.2).",
  "unicorn/no-process-exit":
    "Off in the server entry, which owns the process and its exit codes.",
  "node/no-sync":
    "Off in apps/desktop/desktop/build.ts, the data lock, the resource lookup, the path checks and the event log exit flush, whose callers are sync (plan 5.2).",
  "import/no-default-export":
    "Off in *.config.ts and the apps/api Worker entry: the tools and the Workers runtime load a default export.",
  "sonarjs/no-implicit-dependencies":
    "Off in apps/api platform files that import cloudflare:workers (a runtime module), and in auth/options.ts until apps/api/package.json lists @better-auth/api-key and @better-auth/passkey.",
  "unicorn/throw-new-error":
    "Off in apps/desktop/src/shared/contract, apps/desktop/src/server and apps/api: its autofix breaks every TaggedError class (D29).",
  "import/max-dependencies":
    "Off in generated files and the per-context index, routes and handlers files, which import every op of a context (D29).",
  "max-lines":
    "Off in generated files and the per-context index, routes and handlers files, which list every op of a context (D29).",
};

export const APP_BUDGET_ZERO_GLOBS = [
  "apps/desktop/src/ui/app/**",
  "apps/desktop/src/ui/domain/**",
  "apps/desktop/src/ui/features/**",
  "packages/ui/src/**",
  "apps/desktop/src/ui/platform/**",
];

export const decisionOverrides: OxlintOverride[] = [
  {
    files: ["apps/desktop/src/server/mcp/legacy-args.ts"],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: ["apps/api/src/http/middleware/auth-calls.ts"],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: [
      "apps/desktop/src/ui/app/app.tsx",
      "apps/desktop/src/ui/app/app-notice.tsx",
      "apps/desktop/src/ui/app/app-screen.tsx",
      "apps/desktop/src/ui/app/main.tsx",
      "apps/desktop/src/ui/app/screen-boundary.tsx",
      "apps/desktop/src/ui/app/screen-preload.ts",
      "apps/desktop/src/ui/app/studio/bind-studio-commands.ts",
      "apps/desktop/src/ui/app/studio/center-bars.ts",
      "apps/desktop/src/ui/app/studio/center-props.ts",
      "apps/desktop/src/ui/app/studio/export-layer.tsx",
      "apps/desktop/src/ui/app/studio/left-props-panels.tsx",
      "apps/desktop/src/ui/app/studio/left-props.ts",
      "apps/desktop/src/ui/app/studio/project-model.ts",
      "apps/desktop/src/ui/app/studio/request-model.ts",
      "apps/desktop/src/ui/app/studio/rules-slot.tsx",
      "apps/desktop/src/ui/app/studio/run-model.ts",
      "apps/desktop/src/ui/app/studio/share-layer.tsx",
      "apps/desktop/src/ui/app/studio/ship-layer.tsx",
      "apps/desktop/src/ui/app/studio/studio-center.tsx",
      "apps/desktop/src/ui/app/studio/studio-core-types.ts",
      "apps/desktop/src/ui/app/studio/studio-left.tsx",
      "apps/desktop/src/ui/app/studio/studio-ready.tsx",
      "apps/desktop/src/ui/app/studio/studio-right.tsx",
      "apps/desktop/src/ui/app/studio/studio-run-types.ts",
      "apps/desktop/src/ui/app/studio/studio-system.tsx",
      "apps/desktop/src/ui/app/studio/studio-ui-types.ts",
      "apps/desktop/src/ui/app/studio/use-home-variations-handoff.ts",
      "apps/desktop/src/ui/app/studio/use-studio-base.ts",
      "apps/desktop/src/ui/app/studio/use-studio-compose.ts",
      "apps/desktop/src/ui/app/studio/use-studio-edit.ts",
      "apps/desktop/src/ui/app/studio/use-studio-effects.ts",
      "apps/desktop/src/ui/app/studio/use-studio-history.ts",
      "apps/desktop/src/ui/app/studio/use-studio-panes.ts",
      "apps/desktop/src/ui/app/studio/use-studio-run.ts",
      "apps/desktop/src/ui/app/studio/use-studio-state.ts",
      "apps/desktop/src/ui/app/use-command-layer.ts",
      "apps/desktop/src/ui/app/use-session.ts",
    ],
    rules: {
      "import/no-relative-parent-imports": "off",
    },
  },
  {
    files: ["apps/desktop/src/ui/app/main.tsx"],
    rules: {
      "import/no-unassigned-import": "off",
    },
  },
  {
    files: [
      "apps/desktop/src/server/cloud/cloud-link-client.ts",
      "apps/desktop/src/server/cloud/cloud-link-rows.ts",
      "apps/desktop/src/server/cloud/cloud-list-client.ts",
      "apps/desktop/src/server/publish/linked-publication-store.ts",
      "apps/desktop/src/server/publish/linked-publication-writer.ts",
      "apps/desktop/src/server/share/linked-share-writer.ts",
      "apps/desktop/src/ui/features/commands/deps.ts",
      "apps/desktop/src/ui/features/comments/deps.ts",
      "apps/desktop/src/ui/features/design-system/deps.ts",
      "apps/desktop/src/ui/features/home/deps.ts",
      "apps/desktop/src/ui/features/inspector/deps.ts",
      "apps/desktop/src/ui/features/settings/keys-model.ts",
      "apps/desktop/src/ui/features/settings/use-keys.ts",
      "apps/desktop/src/ui/measure.test.ts",
    ],
    rules: {
      "import/no-relative-parent-imports": "off",
    },
  },
  {
    files: [
      "apps/api/src/http/share-routes.ts",
      "apps/api/src/http/viewer-routes.ts",
      "apps/api/src/mcp/layer.ts",
      "apps/api/src/mcp/mount.ts",
      "apps/api/src/mcp/rpc.ts",
      "apps/api/src/mcp/tools.ts",
      "apps/api/src/tenant/repos/agent-request.ts",
      "apps/api/src/viewer/gate.ts",
      "apps/api/src/viewer/layer.ts",
      "apps/api/src/viewer/read-password.ts",
      "apps/api/src/viewer/read-site-file.ts",
      "apps/api/src/viewer/unlock.ts",
      "apps/api/src/share/add-comment.ts",
      "apps/api/src/share/layer.ts",
      "apps/api/src/share/read-share.ts",
      "apps/api/src/tenant/repos/share.ts",
      "apps/api/src/tenant/sweep-db.ts",
      "apps/desktop/src/server/handlers/run/get-context.ts",
      "apps/desktop/src/server/handlers/run/get.ts",
      "apps/desktop/src/server/handlers/run/handlers.ts",
      "apps/desktop/src/server/handlers/run/list.ts",
      "apps/desktop/src/server/handlers/run/live.ts",
      "apps/desktop/src/server/handlers/run/rename.ts",
      "apps/desktop/src/server/handlers/run/set-permission.ts",
      "apps/desktop/src/server/handlers/run/set-queue.ts",
      "apps/desktop/src/server/handlers/run/set-steer.ts",
      "apps/desktop/src/server/handlers/run/start.ts",
      "apps/desktop/src/server/handlers/run/stop.ts",
      "apps/desktop/src/server/run-log/run-log-controls.ts",
      "apps/desktop/src/server/run-log/run-log-reads.ts",
      "apps/desktop/src/server/run-log/run-log-runtime.ts",
      "apps/desktop/src/server/run-log/run-log-store.ts",
      "apps/desktop/src/server/http/app-run-start.ts",
      "packages/common/actions/src/run/get-context.ts",
      "packages/common/actions/src/run/get.ts",
      "packages/common/actions/src/run/list.ts",
      "packages/common/actions/src/run/rename.ts",
      "packages/common/actions/src/run/set-permission.ts",
      "packages/common/actions/src/run/set-queue.ts",
      "packages/common/actions/src/run/set-steer.ts",
      "packages/common/actions/src/run/start.ts",
      "packages/common/actions/src/run/stop.ts",
    ],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: ["apps/desktop/src/server/agent/canvas-tool-fields.ts"],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: ["apps/desktop/src/server/agent/critic-reply.ts"],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: [
      "apps/desktop/src/server/agent-tools/tool-input.ts",
      "apps/desktop/src/server/direct-edit/commit/deps.ts",
      "apps/desktop/src/server/preview/page-capture/index.ts",
      "apps/desktop/src/server/share/frames.ts",
    ],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: ["apps/desktop/src/server/platform/json-file/index.ts"],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: [
      "apps/desktop/src/server/store/data-lock.test.ts",
      "apps/desktop/src/server/store/version-fast.ts",
    ],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: [
      "packages/common/actions/src/run/list.ts",
      "apps/desktop/src/server/run-log/run-log-reads.ts",
    ],
    rules: { "id-length": "off" },
  },
  {
    files: ["apps/api/src/mcp/rpc.ts", "apps/api/src/mcp/tools.ts"],
    rules: {
      "anti-slop/no-known-value-widening": "off",
      "anti-slop/no-unknown-parameters": "off",
      "anti-slop/no-unsafe-dictionary-type": "off",
    },
  },
  {
    files: [
      "apps/api/src/tenant/repos/comments.ts",
      "packages/common/actions/src/token/apply.ts",
      "apps/desktop/src/server/handlers/token/{apply,handlers,live}.ts",
      "packages/common/actions/src/token/errors/status.ts",
      "apps/desktop/src/server/token-sweep/deps.ts",
      "apps/desktop/src/ui/features/token-sweep/deps.ts",
      "packages/common/actions/src/gallery/{create,inspect}.ts",
      "apps/desktop/src/server/handlers/gallery/{create,handlers,inspect,live}.ts",
      "packages/common/actions/src/gallery/errors/status.ts",
      "apps/desktop/src/server/gallery/deps.ts",
      "apps/desktop/src/ui/features/gallery/deps.ts",
    ],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: [
      "packages/common/actions/src/critique/{get,run}.ts",
      "packages/common/actions/src/critique/errors/status.ts",
      "apps/desktop/src/server/handlers/critique/{get,handlers,live,run}.ts",
      "apps/desktop/src/server/review/{critique-capture,critique-frame,critique-json,critique-reply,critique-runner,critique-saved,critique-store,critique-target,critique-taste}.ts",
      "apps/desktop/src/server/agent/mock.ts",
      "apps/desktop/src/ui/features/critique/deps.ts",
    ],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: [
      "packages/common/actions/src/scenario/{apply,create,list,run}.ts",
      "packages/common/actions/src/scenario/errors/status.ts",
      "apps/desktop/src/server/handlers/scenario/{apply,create,handlers,list,live,run}.ts",
      "apps/desktop/src/server/review/scenario/{scenario-apply,scenario-create,scenario-observe,scenario-page,scenario-record,scenario-run,scenario-runner,scenario-saved,scenario-store,scenario-target}.ts",
      "apps/desktop/src/server/app/frame-state-calls.ts",
      "apps/desktop/src/ui/features/scenario/deps.ts",
    ],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: [
      "packages/common/actions/src/prop/{create,delete,list,rename,schema}.ts",
      "packages/common/actions/src/prop/errors/status.ts",
      "apps/desktop/src/server/handlers/prop/{create,delete,handlers,list,live,rename}.ts",
      "apps/desktop/src/server/components/prop/deps.ts",
      "apps/desktop/src/ui/features/prop/deps.ts",
    ],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: [
      "packages/common/actions/src/grid/{get,schema,set,set-grid-item}.ts",
      "packages/common/actions/src/grid/errors/status.ts",
      "apps/desktop/src/server/handlers/grid/{get,handlers,live,set,set-grid-item}.ts",
      "apps/desktop/src/server/grid/{deps,grid-failure,grid-run,grid-store,grid-writer}.ts",
      "apps/desktop/src/server/grid/engine/deps.ts",
      "apps/desktop/src/ui/features/grid/deps.ts",
      "apps/desktop/src/ui/features/pattern/deps.ts",
      "apps/desktop/src/ui/features/inspector/grid-section.tsx",
    ],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: [
      "packages/common/actions/src/pattern/{create,delete,get,insert,list,schema}.ts",
      "packages/common/actions/src/pattern/errors/status.ts",
      "apps/desktop/src/server/handlers/pattern/{create,delete,get,handlers,insert,list,live}.ts",
      "apps/desktop/src/server/pattern/deps.ts",
      "apps/desktop/src/server/pattern/engine/deps.ts",
    ],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: [
      "apps/desktop/src/server/pattern/engine/{convert,scan}.ts",
      "apps/desktop/src/server/pattern/{pattern-capture,pattern-imports,snippet-parse}.ts",
    ],
    rules: { "sonarjs/no-implicit-dependencies": "off" },
  },
  {
    files: [
      "apps/desktop/src/server/components/prop/engine/{ast,change,component,create,edits,refs,sites,type-host,types}.ts",
      "apps/desktop/src/server/components/prop/prop-sites.ts",
    ],
    rules: { "sonarjs/no-implicit-dependencies": "off" },
  },
  {
    files: [
      "packages/common/actions/src/animation/{create,delete,export,get,list,schema,update}.ts",
      "packages/common/actions/src/animation/errors/status.ts",
      "apps/desktop/src/server/handlers/animation/{create,delete,export,get,handlers,list,live,update}.ts",
      "apps/desktop/src/server/state-styles/animation/deps.ts",
      "apps/desktop/src/ui/features/animation/deps.ts",
    ],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: ["packages/common/actions/src/spacing/schema.ts"],
    rules: {
      "eslint/id-length": "off",
      "import/no-relative-parent-imports": "off",
    },
  },
  {
    files: ["apps/desktop/src/server/spacing/spacing-scale.ts"],
    rules: {
      "eslint/id-length": "off",
    },
  },
  {
    files: [
      "apps/desktop/src/server/accessibility/accessibility-failure.ts",
      "apps/desktop/src/server/accessibility/accessibility-run.ts",
      "apps/desktop/src/server/accessibility/accessibility-store.ts",
      "apps/desktop/src/server/accessibility/accessibility-writer.ts",
      "apps/desktop/src/server/accessibility/live-frame.ts",
      "apps/desktop/src/server/components/variant-write/component-variant-failure.ts",
      "apps/desktop/src/server/components/variant-write/component-variant-run.ts",
      "apps/desktop/src/server/components/variant-write/component-variant-store.ts",
      "apps/desktop/src/server/components/variant-write/component-variant-writer.ts",
      "apps/desktop/src/server/direct-edit/direction-task.ts",
      "apps/desktop/src/server/fill/fill-failure.ts",
      "apps/desktop/src/server/fill/fill-run.ts",
      "apps/desktop/src/server/fill/fill-store.ts",
      "apps/desktop/src/server/fill/fill-writer.ts",
      "apps/desktop/src/server/handlers/accessibility/handlers.ts",
      "apps/desktop/src/server/handlers/accessibility/inspect.ts",
      "apps/desktop/src/server/handlers/accessibility/live.ts",
      "apps/desktop/src/server/handlers/accessibility/set.ts",
      "apps/desktop/src/server/handlers/canvas/inspect-link-interaction.ts",
      "apps/desktop/src/server/handlers/canvas/set-link-interaction.ts",
      "apps/desktop/src/server/handlers/component-variant/create.ts",
      "apps/desktop/src/server/handlers/component-variant/get.ts",
      "apps/desktop/src/server/handlers/component-variant/handlers.ts",
      "apps/desktop/src/server/handlers/component-variant/live.ts",
      "apps/desktop/src/server/handlers/component-variant/update.ts",
      "apps/desktop/src/server/handlers/fill/get.ts",
      "apps/desktop/src/server/handlers/fill/handlers.ts",
      "apps/desktop/src/server/handlers/fill/live.ts",
      "apps/desktop/src/server/handlers/fill/set.ts",
      "apps/desktop/src/server/handlers/icon/handlers.ts",
      "apps/desktop/src/server/handlers/icon/insert.ts",
      "apps/desktop/src/server/handlers/icon/inspect.ts",
      "apps/desktop/src/server/handlers/icon/live.ts",
      "apps/desktop/src/server/handlers/image-search/get.ts",
      "apps/desktop/src/server/handlers/image-search/handlers.ts",
      "apps/desktop/src/server/handlers/image-search/insert.ts",
      "apps/desktop/src/server/handlers/image-search/inspect.ts",
      "apps/desktop/src/server/handlers/image-search/live.ts",
      "apps/desktop/src/server/handlers/motion/handlers.ts",
      "apps/desktop/src/server/handlers/motion/inspect.ts",
      "apps/desktop/src/server/handlers/motion/live.ts",
      "apps/desktop/src/server/handlers/motion/set.ts",
      "apps/desktop/src/server/handlers/page/handlers.ts",
      "apps/desktop/src/server/handlers/page/import.ts",
      "apps/desktop/src/server/handlers/page/live.ts",
      "apps/desktop/src/server/handlers/spacing/get.ts",
      "apps/desktop/src/server/handlers/spacing/handlers.ts",
      "apps/desktop/src/server/handlers/spacing/live.ts",
      "apps/desktop/src/server/handlers/spacing/set.ts",
      "apps/desktop/src/server/handlers/stacking/get.ts",
      "apps/desktop/src/server/handlers/stacking/handlers.ts",
      "apps/desktop/src/server/handlers/stacking/live.ts",
      "apps/desktop/src/server/handlers/stacking/set.ts",
      "apps/desktop/src/server/handlers/state-style/handlers.ts",
      "apps/desktop/src/server/handlers/state-style/inspect.ts",
      "apps/desktop/src/server/handlers/state-style/live.ts",
      "apps/desktop/src/server/handlers/state-style/set-forced.ts",
      "apps/desktop/src/server/handlers/state-style/set.ts",
      "apps/desktop/src/server/handlers/text-style/apply.ts",
      "apps/desktop/src/server/handlers/text-style/create.ts",
      "apps/desktop/src/server/handlers/text-style/handlers.ts",
      "apps/desktop/src/server/handlers/text-style/inspect.ts",
      "apps/desktop/src/server/handlers/text-style/live.ts",
      "apps/desktop/src/server/handlers/text-style/update.ts",
      "apps/desktop/src/server/handlers/text/handlers.ts",
      "apps/desktop/src/server/handlers/text/inspect.ts",
      "apps/desktop/src/server/handlers/text/live.ts",
      "apps/desktop/src/server/handlers/text/update.ts",
      "apps/desktop/src/server/icons/icon-failure.ts",
      "apps/desktop/src/server/icons/icon-run.ts",
      "apps/desktop/src/server/icons/icon-store.ts",
      "apps/desktop/src/server/icons/icon-writer.ts",
      "apps/desktop/src/server/image-search/image-search-failure.ts",
      "apps/desktop/src/server/image-search/image-search-run.ts",
      "apps/desktop/src/server/image-search/image-search-store.ts",
      "apps/desktop/src/server/image-search/image-search-writer.ts",
      "apps/desktop/src/server/motion/motion-failure.ts",
      "apps/desktop/src/server/motion/motion-run.ts",
      "apps/desktop/src/server/motion/motion-store.ts",
      "apps/desktop/src/server/motion/motion-writer.ts",
      "apps/desktop/src/server/page-import/page-failure.ts",
      "apps/desktop/src/server/page-import/page-run.ts",
      "apps/desktop/src/server/page-import/page-writer.ts",
      "apps/desktop/src/server/spacing/spacing-failure.ts",
      "apps/desktop/src/server/spacing/spacing-run.ts",
      "apps/desktop/src/server/spacing/spacing-store.ts",
      "apps/desktop/src/server/spacing/spacing-writer.ts",
      "apps/desktop/src/server/stacking/stacking-failure.ts",
      "apps/desktop/src/server/stacking/stacking-run.ts",
      "apps/desktop/src/server/stacking/stacking-store.ts",
      "apps/desktop/src/server/stacking/stacking-writer.ts",
      "apps/desktop/src/server/state-styles/state-style-failure.ts",
      "apps/desktop/src/server/state-styles/state-style-run.ts",
      "apps/desktop/src/server/state-styles/state-style-store.ts",
      "apps/desktop/src/server/state-styles/state-style-writer.ts",
      "apps/desktop/src/server/text-search/text-search-failure.ts",
      "apps/desktop/src/server/text-search/text-search-run.ts",
      "apps/desktop/src/server/text-search/text-search-store.ts",
      "apps/desktop/src/server/text-search/text-search-writer.ts",
      "apps/desktop/src/server/text-styles/text-style-failure.ts",
      "apps/desktop/src/server/text-styles/text-style-probe.ts",
      "apps/desktop/src/server/text-styles/text-style-run.ts",
      "apps/desktop/src/server/text-styles/text-style-store.ts",
      "apps/desktop/src/server/text-styles/text-style-writer.ts",
      "packages/common/actions/src/accessibility/errors/status.ts",
      "packages/common/actions/src/accessibility/inspect.ts",
      "packages/common/actions/src/accessibility/schema.ts",
      "packages/common/actions/src/accessibility/set.ts",
      "packages/common/actions/src/canvas/inspect-link-interaction.ts",
      "packages/common/actions/src/canvas/set-link-interaction.ts",
      "packages/common/actions/src/component-variant/create.ts",
      "packages/common/actions/src/component-variant/errors/status.ts",
      "packages/common/actions/src/component-variant/get.ts",
      "packages/common/actions/src/component-variant/schema.ts",
      "packages/common/actions/src/component-variant/update.ts",
      "packages/common/actions/src/fill/errors/status.ts",
      "packages/common/actions/src/fill/get.ts",
      "packages/common/actions/src/fill/schema.ts",
      "packages/common/actions/src/fill/set.ts",
      "packages/common/actions/src/icon/errors/status.ts",
      "packages/common/actions/src/icon/insert.ts",
      "packages/common/actions/src/icon/inspect.ts",
      "packages/common/actions/src/icon/schema.ts",
      "packages/common/actions/src/image-search/errors/status.ts",
      "packages/common/actions/src/image-search/get.ts",
      "packages/common/actions/src/image-search/insert.ts",
      "packages/common/actions/src/image-search/inspect.ts",
      "packages/common/actions/src/image-search/schema.ts",
      "packages/common/actions/src/motion/errors/status.ts",
      "packages/common/actions/src/motion/inspect.ts",
      "packages/common/actions/src/motion/schema.ts",
      "packages/common/actions/src/motion/set.ts",
      "packages/common/actions/src/page/errors/status.ts",
      "packages/common/actions/src/page/import.ts",
      "packages/common/actions/src/page/schema.ts",
      "packages/common/actions/src/spacing/errors/status.ts",
      "packages/common/actions/src/spacing/get.ts",
      "packages/common/actions/src/spacing/set.ts",
      "packages/common/actions/src/stacking/errors/status.ts",
      "packages/common/actions/src/stacking/get.ts",
      "packages/common/actions/src/stacking/schema.ts",
      "packages/common/actions/src/stacking/set.ts",
      "packages/common/actions/src/state-style/errors/status.ts",
      "packages/common/actions/src/state-style/inspect.ts",
      "packages/common/actions/src/state-style/schema.ts",
      "packages/common/actions/src/state-style/set-forced.ts",
      "packages/common/actions/src/state-style/set.ts",
      "packages/common/actions/src/text-style/apply.ts",
      "packages/common/actions/src/text-style/create.ts",
      "packages/common/actions/src/text-style/errors/status.ts",
      "packages/common/actions/src/text-style/inspect.ts",
      "packages/common/actions/src/text-style/schema.ts",
      "packages/common/actions/src/text-style/update.ts",
      "packages/common/actions/src/text/errors/status.ts",
      "packages/common/actions/src/text/inspect.ts",
      "packages/common/actions/src/text/schema.ts",
      "packages/common/actions/src/text/update.ts",
    ],
    rules: {
      "import/no-relative-parent-imports": "off",
    },
  },
  {
    files: ["apps/desktop/src/server/gallery/engine/page.ts"],
    rules: { "github/unescaped-html-literal": "off" },
  },
  {
    files: ["apps/desktop/src/server/image-generate/openai.ts"],
    rules: { "id-length": "off" },
  },
  {
    files: ["apps/desktop/src/server/image-generate/mock-image.ts"],
    rules: {
      "id-length": "off",
      "no-magic-numbers": "off",
      "sonarjs/shorthand-property-grouping": "off",
    },
  },
  {
    files: ["apps/desktop/src/server/image-generate/provider-env.ts"],
    rules: { "node/no-process-env": "off" },
  },
  {
    files: [".pnpmfile.mjs"],
    rules: { "github/filenames-match-regex": "off" },
  },
  {
    files: [
      "packages/common/actions/src/image/{create,inspect}.ts",
      "packages/common/actions/src/image/errors/status.ts",
      "apps/desktop/src/server/handlers/image/{create,handlers,inspect,live}.ts",
      "apps/desktop/src/server/image-generate/deps.ts",
      "apps/desktop/src/ui/features/image-generate/deps.ts",
    ],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: [
      "apps/desktop/src/server/viewport/engine/cells.ts",
      "apps/desktop/src/ui/features/viewport/matrix-model.ts",
    ],
    rules: { "no-magic-numbers": "off" },
  },
  {
    files: [
      "apps/desktop/src/server/gallery/create-gallery.ts",
      "apps/desktop/src/server/viewport/create-matrix.ts",
    ],
    rules: { "id-length": "off" },
  },
  {
    files: [
      "apps/desktop/src/server/handlers/viewport/{create,handlers,live,run}.ts",
      "apps/desktop/src/server/viewport/{deps,probe}.ts",
      "packages/common/actions/src/viewport/{create,run}.ts",
      "packages/common/actions/src/viewport/errors/status.ts",
      "apps/desktop/src/ui/features/viewport/deps.ts",
    ],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: [
      "apps/desktop/src/server/content/{content-runtime,content-writer,write-content}.ts",
      "apps/desktop/src/server/handlers/content/{apply,handlers,live}.ts",
      "packages/common/actions/src/content/apply.ts",
      "packages/common/actions/src/content/errors/status.ts",
      "apps/desktop/src/ui/features/content/deps.ts",
    ],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: ["apps/desktop/src/server/content/engine/random.ts"],
    rules: { "no-bitwise": "off" },
  },
  { files: NODE_RUNTIMES, rules: { "import/no-nodejs-modules": "off" } },
  {
    files: [
      "apps/desktop/src/server/platform/logger/**",
      "apps/desktop/scripts/**",
    ],
    rules: { "no-console": "off" },
  },
  {
    files: [
      "apps/desktop/src/server/platform/config/**",
      "apps/desktop/desktop/env.ts",
    ],
    rules: { "node/no-process-env": "off" },
  },
  {
    files: [SERVER_MAIN],
    rules: { "node/no-process-env": "off", "unicorn/no-process-exit": "off" },
  },
  {
    files: [
      "apps/desktop/src/server/events/{bus,event-queue,event-core,event-log,event-writer,render-tracker,save-lanes,save-queue}.ts",
      "apps/desktop/src/server/handlers/events/live.ts",
      "apps/desktop/src/server/events/{change-feed,source-change}.ts",
      "apps/desktop/src/server/events/planned-feed.ts",
      "apps/desktop/src/server/events/render-wait.ts",
      "apps/desktop/src/server/platform/git/batch-reader.ts",
      "apps/desktop/src/server/platform/git/objects.ts",
      "apps/desktop/src/server/platform/git/run-git.ts",
      "apps/desktop/src/server/platform/git/user-git.ts",
      "apps/desktop/src/server/platform/process/worker-client.ts",
      "apps/desktop/src/server/platform/resources/index.ts",
      "apps/desktop/src/server/platform/tool-policy/**",
      "apps/desktop/src/ui/platform/{http,pack-api,session}.ts",
      "apps/desktop/src/server/project-source/source.ts",
      "apps/desktop/src/server/run-log/run-list.ts",
      SERVER_MAIN,
      "apps/desktop/src/server/preview/{ports,render-contract}.ts",
      "apps/desktop/src/server/cloud/{cloud-migration-runner,outbox-store,sync-runner}.ts",
      "apps/desktop/src/server/store/{device-bindings,authorizer,data-lock,default-folder,events,git-objects,local-principal,principal,mutex,project-access,project-org,skill-store,starters,studio-info}.ts",
      "apps/desktop/src/{server/handlers/_core/handler,server/handlers/_core/run-action,server/handlers/studio/handlers,server/handlers/studio/health,server/handlers/studio/list-skills,server/handlers/studio/live}.ts",
      "packages/common/actions/src/studio/{health,list-skills}.ts",
      "apps/desktop/src/server/{http/mount,http/mount-all,handlers/_core/wire-error,mcp/registry,agent-tools/registry,agent-tools/sdk-shape}.ts",
      "{apps/desktop/src/server/handlers/version/{live,handlers,list,get,inspect-diff,list-history,list-hunks,apply-history,apply-hunk,create-session,delete-session,rename,restore,restore-history},apps/desktop/src/server/store/version-{read,read-core,store,write,write-core,writer},packages/common/actions/src/version/{schema,list,get,inspect-diff,list-history,list-hunks,apply-history,apply-hunk,create-session,delete-session,rename,restore,restore-history},apps/desktop/src/server/handlers/publish/{live,get,handlers,inspect,list,list-comments,publish,unpublish,restore,delete-comment,start,stop,delete,set,apply},apps/desktop/src/server/publish/{cf-cli,publish-service,publish-core,publish-store,legacy-link,plan-card,plan-input,plan-legacy,publish-planner,publish-remote-reads,publish-remote-writes},packages/common/actions/src/_core/http-status,packages/common/actions/src/_core/errors/all,packages/common/actions/src/publish/{errors/status,get,inspect,list,list-comments,publish,unpublish,restore,delete-comment,start,stop,delete,set,apply},apps/desktop/src/server/handlers/share/{live,handlers,list,create,delete,update,set-cursor,set-lan},apps/desktop/src/server/share/{share-core,share-store,share-listener,live-refresher,share-attempt,share-cards,share-link-store,share-links},packages/common/actions/src/share/{list,create,delete,update,set-cursor,set-lan},apps/desktop/src/server/handlers/comment/{live,handlers,list,search-mention,create,update,delete,delete-reply,create-reply,export,insert,move,set-resolved,start},apps/desktop/src/server/comments/{comment-core,comment-reads,comment-run-ops,comment-store,comment-thread-ops,comment-thread-store,comment-page,work-tree,index,comment-insert,frame-target,comment-run-starter,run-payload,run-watch},packages/common/actions/src/comment/{schema,errors/status,list,search-mention,create,update,delete,delete-reply,create-reply,export,insert,move,set-resolved,start},apps/desktop/src/server/handlers/ship/{live,handlers,get-plan,inspect,publish,get-settings,set-settings},apps/desktop/src/server/ship/{ship-core,ship-plans,ship-settings,ship-store,ship-runner},packages/common/actions/src/ship/{schema,get-plan,inspect,publish,get-settings,set-settings},apps/desktop/src/server/handlers/export/{live,handlers,get-code,export,export-frame,export-folder,export-handoff,get-handoff},apps/desktop/src/server/export/{export-core,export-store,copy-target,export-writer,export-file,export-runs,export-frames,export-write,folder-export,frame-selector},packages/common/actions/src/export/{schema,get-code,export,export-frame,export-folder,export-handoff,get-handoff},apps/desktop/src/server/handlers/pack/{live,handlers,list,get-pack,inspect-pack,get-draft,inspect-draft,apply-pack,create-draft,create-pack,delete-pack,duplicate-pack,export-pack,import-pack,list-summary,list-problem,publish-draft,set-pack,start-editor,update-pack},apps/desktop/src/server/design-system/ops/{library-core,library-reads,pack-store,library-backing,library-cards,library-draft-input,library-drafts,library-writes,pack-writer},packages/common/actions/src/pack/{schema,list,get-pack,inspect-pack,get-draft,inspect-draft,errors/status,errors/pack-exists,apply-pack,create-draft,create-pack,delete-pack,duplicate-pack,export-pack,import-pack,list-summary,list-problem,publish-draft,set-pack,start-editor,update-pack},apps/desktop/src/server/handlers/workspace/{live,handlers,get-doctor,get-port-plan,get-usage,list-projects,search-projects,list-found-apps,list-versions,list-files,get-file,list-variants,list-routes,get-frame-html,get-tokens,get-design-md,get-screenshot,get-run-context},apps/desktop/src/server/variations/element-variants,apps/desktop/src/server/preview/{mcp-read-core,mcp-read-store,doctor-read,usage-read,project-list-read,project-search-read,found-apps-read,version-list-read,file-read,variant-read,route-read,frame-source,frame-html-read,frame-shot-pick,frame-shot-read,token-read,warm-upstream,run-context-read},apps/desktop/src/server/mcp/tool-result,apps/desktop/src/server/platform/attempt/index,packages/common/actions/src/workspace/{schema,get-doctor,get-port-plan,get-usage,list-projects,search-projects,list-found-apps,list-versions,list-files,get-file,list-variants,list-routes,get-frame-html,get-tokens,get-design-md,get-screenshot,get-run-context}}.ts",
      "apps/desktop/src/server/agent/legacy/direct-edit.ts",
      "apps/desktop/scripts/stamp/{action-index,call-agent,names,templates,templates-ui,write}.ts",
      "apps/desktop/e2e/support/{logged-spawn.test,server}.ts",
      "apps/desktop/scripts/stamp/probes/*.ts",
    ],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: [
      "apps/desktop/src/server/direct-edit/{direct-edit-core,direct-edit-insert-ops,direct-edit-ops}.ts",
      "apps/desktop/src/server/handlers/direct-edit/{get-review,get-rules,import-figma,inspect-props-instance,list-props-components,run-review,run-rules-test,set-props,set-rules,set-variant-classes,apply-review-fix,apply-swap,apply,create-component,create-token,delete-text,get-component-preview,get-design-system,get-preview,get-tree,get-tweaks,handlers,insert-component,insert-jsx,inspect-tokens,list-component-folders,list-components,list-insertable,list-swap-candidates,live,run,set-image,set-vector,update-tokens,update-tweaks}.ts",
      "apps/desktop/src/server/http/app-direct-edit-routes.ts",
      "packages/common/actions/src/direct-edit/{get-review,get-rules,import-figma,inspect-props-instance,list-props-components,run-review,run-rules-test,set-props,set-rules,set-variant-classes,apply-review-fix,apply-swap,apply,create-component,create-token,delete-text,get-component-preview,get-design-system,get-preview,get-tree,get-tweaks,insert-component,insert-jsx,inspect-tokens,list-component-folders,list-components,list-insertable,list-swap-candidates,run,set-image,set-vector,update-tokens,update-tweaks}.ts",
      "packages/common/actions/src/direct-edit/errors/{direct-edit-conflict,direct-edit-failed,direct-edit-not-found,status}.ts",
    ],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: [
      "apps/desktop/src/server/direct-edit/{direct-edit-props-ops,direct-edit-review-ops}.ts",
    ],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: ["apps/desktop/src/server/agent/types.ts"],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: ["apps/desktop/src/server/direct-edit/direct-edit-core.ts"],
    rules: { "sonarjs/max-union-size": "off" },
  },
  {
    files: [
      "apps/desktop/src/server/direct-edit/{direct-edit-ops,direct-edit-ref}.ts",
    ],
    rules: { "anti-slop/no-unsafe-dictionary-type": "off" },
  },
  {
    files: [
      "apps/desktop/src/server/{cloud/{cloud-session,cloud-session-store,cloud-client,cloud-session-writer},handlers/cloud/{get,set,delete,live,handlers}}.ts",
      "packages/common/actions/src/cloud/{get,set,delete}.ts",
      "apps/desktop/src/server/canvas/links/link-{ops,runtime,store,writer}.ts",
      "apps/desktop/src/server/canvas/canvas-{ops,runtime,store,writer}.ts",
      "apps/desktop/src/server/handlers/canvas/{apply-implicit-link,create-flow,create-link,delete-link,get-doc,handlers,list-flow-links,list-flow-params,list-frame-states,list-implicit-links,list-links,live,set-doc,set-frame-state,set-presence,set-start-link,update-frame-session,update-link}.ts",
      "packages/common/actions/src/canvas/{apply-implicit-link,create-flow,create-link,delete-link,get-doc,index,list-flow-links,list-flow-params,list-frame-states,list-implicit-links,list-links,routes,schema,set-doc,set-frame-state,set-presence,set-start-link,update-frame-session,update-link}.ts",
    ],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: [
      "apps/desktop/src/server/canvas/canvas-ops.ts",
      "apps/desktop/src/server/canvas/links/link-{ops,tools}.ts",
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
      "packages/common/actions/src/canvas/{schema,create-flow,set-frame-state,update-frame-session}.ts",
    ],
    rules: {
      "eslint/no-magic-numbers": "off",
      "unicorn/max-nested-calls": "off",
    },
  },
  {
    files: [
      "apps/desktop/src/server/app/dev-server-{attempt,ops,runner,runtime,store}.ts",
      "apps/desktop/src/server/handlers/dev-server/{create,get,handlers,list-routes,live,run,set,start,stop}.ts",
      "packages/common/actions/src/dev-server/{create,get,index,list-routes,routes,run,schema,set,start,stop}.ts",
    ],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: ["packages/common/actions/src/dev-server/{create,set}.ts"],
    rules: { "unicorn/max-nested-calls": "off" },
  },
  {
    files: ["apps/desktop/src/server/app/dev-server-{ops,runner}.ts"],
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
      "apps/desktop/src/server/handlers/connection/{get-status,handlers,list-activity,list-approvals,live,set-approval,set-status}.ts",
      "packages/common/actions/src/connection/{get-status,index,list-activity,list-approvals,routes,schema,set-approval,set-status}.ts",
      "apps/desktop/src/server/mcp-life/{approval-window-queue,index,mcp-activity-log,mcp-approval-store,mcp-life-runtime,mcp-listener-runner,mcp-settings-store,mcp-settings-writer}.ts",
      "apps/desktop/src/server/platform/runtime-slot/index.ts",
    ],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: [
      "packages/common/actions/src/connection/{set-approval,get-status,list-activity,list-approvals,set-status}.ts",
    ],
    rules: { "unicorn/max-nested-calls": "off" },
  },
  {
    files: ["apps/desktop/src/server/platform/git/encoding.ts"],
    rules: { "sonarjs/hashing": "off" },
  },
  {
    files: ["apps/desktop/src/server/platform/git/user-git.ts"],
    rules: { "node/no-process-env": "off" },
  },
  {
    files: ["apps/desktop/src/server/platform/git/run-git.ts"],
    rules: { "sonarjs/no-os-command-from-path": "off" },
  },
  {
    files: [
      "apps/desktop/scripts/hooks/run-pre-commit.mjs",
      "lint/plugins/studio/glob-rules.js",
      "lint/plugins/studio/workspace-fact-rules.js",
    ],
    rules: { "node/no-sync": "off", "sonarjs/no-os-command-from-path": "off" },
  },
  {
    files: [
      "apps/desktop/scripts/call-action.ts",
      "apps/desktop/scripts/dev-check.ts",
      "apps/desktop/scripts/ac-core/real.ts",
      "apps/desktop/scripts/ac-safety/real.ts",
      "apps/desktop/scripts/check-bundle.ts",
      "apps/desktop/scripts/new-action.ts",
      "apps/desktop/scripts/stamp/call-agent.ts",
      "apps/desktop/scripts/stamp/write.ts",
      "apps/desktop/scripts/gen-routes.ts",
      "apps/desktop/scripts/update-check.ts",
    ],
    rules: {
      "react-doctor/async-parallel": "off",
      "react-doctor/server-sequential-independent-await": "off",
    },
  },
  {
    files: ["apps/api/auth.cli.ts", "apps/publish/scripts/{build,local}.mjs"],
    rules: { "import/no-nodejs-modules": "off" },
  },
  {
    files: ["lint/plugins/studio/freeze-rules.js"],
    rules: { "sonarjs/no-os-command-from-path": "off" },
  },
  {
    files: [
      "apps/desktop/src/ui/features/design-system/component-insert-api.ts",
    ],
    rules: { "anti-slop/no-unknown-parameters": "off" },
  },
  {
    files: [
      "apps/desktop/desktop/build.ts",
      "apps/desktop/src/server/platform/data-lock/**",
      "apps/desktop/src/server/platform/paths/**",
      "apps/desktop/src/server/platform/resources/**",
    ],
    rules: { "node/no-sync": "off" },
  },
  {
    files: [
      "apps/desktop/src/server/main/public.ts",
      "apps/desktop/src/server/mcp/edit-tools.ts",
      "apps/desktop/src/server/mcp/server.ts",
      "apps/desktop/src/server/preview/route-stamp.ts",
      "apps/desktop/src/server/project-source/source.ts",
      "apps/desktop/src/server/run-log/run-list.ts",
      "apps/desktop/src/server/{http/edit-history-routes,mcp/history-tools}.ts",
      "apps/desktop/src/server/{http/mcp-routes,http/stream-routes,main/live-layer}.ts",
      "apps/desktop/src/server/cloud/cloud-migration-runner.ts",
    ],
    rules: { "react-doctor/no-barrel-import": "off" },
  },
  {
    files: [
      "apps/desktop/src/server/mcp/legacy/attach-app.ts",
      "apps/desktop/src/server/mcp/legacy/caller-scope.ts",
      "apps/desktop/src/server/mcp/legacy/guard.ts",
      "apps/desktop/src/server/mcp/legacy/canvas-frames.ts",
      "apps/desktop/src/server/mcp/legacy/canvas-schema.ts",
      "apps/desktop/src/server/mcp/legacy/canvas.ts",
      "apps/desktop/src/server/mcp/legacy/cloud.ts",
      "apps/desktop/src/server/mcp/legacy/comments.ts",
      "apps/desktop/src/server/mcp/legacy/create-project.ts",
      "apps/desktop/src/server/mcp/legacy/devserver.ts",
      "apps/desktop/src/server/mcp/legacy/direct-edit-inline.ts",
      "apps/desktop/src/server/mcp/legacy/direct-edit-result.ts",
      "apps/desktop/src/server/mcp/legacy/direct-edit-schema.ts",
      "apps/desktop/src/server/mcp/legacy/direct-edit.ts",
      "apps/desktop/src/server/mcp/legacy/edit-element.ts",
      "apps/desktop/src/server/mcp/legacy/events.ts",
      "apps/desktop/src/server/mcp/legacy/mcp-life.ts",
      "apps/desktop/src/server/mcp/legacy/mcp-read.ts",
      "apps/desktop/src/server/mcp/legacy/open-folder.ts",
      "apps/desktop/src/server/mcp/legacy/org-scope.ts",
      "apps/desktop/src/server/mcp/legacy/pack-of.ts",
      "apps/desktop/src/server/mcp/legacy/packs-schema.ts",
      "apps/desktop/src/server/mcp/legacy/packs.ts",
      "apps/desktop/src/server/mcp/legacy/projects-result.ts",
      "apps/desktop/src/server/mcp/legacy/projects-schema.ts",
      "apps/desktop/src/server/mcp/legacy/projects.ts",
      "apps/desktop/src/server/mcp/legacy/publish.ts",
      "apps/desktop/src/server/mcp/legacy/session.ts",
      "apps/desktop/src/server/mcp/legacy/set-token.ts",
      "apps/desktop/src/server/mcp/legacy/structure-element.ts",
      "apps/desktop/src/server/mcp/legacy/studio.ts",
      "apps/desktop/src/server/mcp/legacy/versions.ts",
      "apps/desktop/src/server/mcp/legacy/write-file.ts",
      "apps/desktop/src/server/mcp/run-edit.ts",
    ],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: [
      "apps/desktop/src/server/mcp/legacy/direct-edit.ts",
      "packages/common/actions/src/_core/errors/all.ts",
      "packages/common/actions/src/_core/http-status.ts",
    ],
    rules: { "import/max-dependencies": "off" },
  },
  {
    files: [
      "apps/desktop/src/server/mcp/legacy/canvas-result.ts",
      "apps/desktop/src/server/mcp/legacy/canvas-schema.ts",
      "apps/desktop/src/server/mcp/legacy/direct-edit-result.ts",
      "apps/desktop/src/server/mcp/legacy/direct-edit-schema.ts",
      "apps/desktop/src/server/mcp/legacy/packs-result.ts",
      "apps/desktop/src/server/mcp/legacy/packs-schema.ts",
      "apps/desktop/src/server/mcp/legacy/projects-result.ts",
      "apps/desktop/src/server/mcp/legacy/projects-schema.ts",
    ],
    rules: { "eslint/sort-keys": "off" },
  },
  {
    files: ["apps/desktop/src/server/mcp/{key-auth,key-introspect}.ts"],
    rules: {
      "anti-slop/require-readable-spacing": "warn",
      "import/no-relative-parent-imports": "off",
      "sonarjs/no-nested-functions": "warn",
    },
  },
  {
    files: [
      "apps/desktop/src/server/{agent/icon-tool,http/icon-routes,icons/deps,mcp/icon-tools}.ts",
      "apps/desktop/src/server/{mcp/text-style-tools,agent/text-style-tool,text-styles/deps}.ts",
      "apps/desktop/src/server/motion/deps.ts",
      "apps/desktop/src/server/fill/deps.ts",
      "apps/desktop/src/server/{design-system/model/index,design-system/ops/index,spacing/deps,components/variant-write/deps,canvas/links/link-interaction,canvas/links/link-interaction-input,canvas/links/link-target,page-import/deps,text-search/deps,breakpoints/deps,mcp/breakpoints-tools,agent/breakpoints-tool,state-styles/deps,mcp/state-styles-tools,agent/state-styles-tool,style-scope/engine/deps,stacking/deps,stacking/engine/deps,mcp/stacking-tools,agent/stacking-tool,image-search/deps,accessibility/deps}.ts",
      "apps/desktop/src/server/{mcp/copy-code-tools,agent/copy-code-tool}.ts",
      "apps/api/src/http/{api,groups/*,groups/keys/*,sync/*}.ts",
      "apps/api/src/{tenant/{probes/{planted-tq,cross-org},repos/{projects,changes,versions,key-perm},blobs,current-org,db,resolver,viewer-db},auth/{gateway,permissions,rate-limit},http/{errors,middleware/{agent-auth,member-auth,member-directory,org-grant,viewer}}}.ts",
      "apps/desktop/src/server/export/copy-handler.ts",
      "apps/desktop/src/server/export/copy-react.ts",
      "apps/desktop/src/ui/features/icons/deps.ts",
      "apps/desktop/src/ui/features/text-styles/deps.ts",
      "apps/desktop/src/ui/features/motion/deps.ts",
      "apps/desktop/src/server/http/{{text-search,state-style,stacking,accessibility}-routes,app-{context,errors,project-files,request,run-parse,*-routes},loopback-guard}.ts",
      "apps/desktop/src/{ui/features/{account,settings,fill,spacing,component-variant,link-interaction,page-import,text-search,state-styles,stacking,image-search,accessibility,agent-approval}/deps,bridge/play-triggers}.ts",
    ],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: [
      "apps/desktop/src/{server/comments/frame-target,server/comments/run-payload,shared/run-target,ui/features/spacing/spacing-bands,server/share/share-links}.ts",
      "packages/common/actions/src/comment/schema.ts",
    ],
    rules: { "eslint/id-length": "off" },
  },
  {
    files: [
      "apps/desktop/src/server/http/app-{context,project-files,request,run-parse,*-routes}.ts",
      "apps/api/src/http/{api,groups/*,groups/keys/*,sync/*}.ts",
      "{apps/desktop/src/ui/api,lint/decisions,packages/common/actions/src/version/{index,routes},apps/desktop/src/server/handlers/version/handlers}.ts",
      "apps/desktop/src/server/mcp/run-edit.ts",
    ],
    rules: Object.fromEntries(
      "eslint/max-classes-per-file eslint/new-cap anti-slop/no-chained-type-assertions eslint/no-await-in-loop eslint/no-nested-ternary react-doctor/async-await-in-loop sonarjs/no-nested-conditional unicorn/max-nested-calls unicorn/no-nested-ternary anti-slop/no-conditional-empty-object-spread anti-slop/no-runtime-typeof anti-slop/no-unknown-parameters anti-slop/no-unsafe-dictionary-type anti-slop/require-readable-spacing eslint/func-style eslint/id-length eslint/init-declarations eslint/max-lines eslint/max-lines-per-function eslint/max-statements eslint/no-console eslint/no-continue eslint/no-empty-function eslint/no-magic-numbers eslint/no-promise-executor-return eslint/no-ternary eslint/no-undefined eslint/no-use-before-define eslint/require-unicode-regexp eslint/sort-keys github/no-then import/max-dependencies node/no-sync promise/avoid-new promise/prefer-await-to-callbacks promise/prefer-await-to-then react-doctor/server-sequential-independent-await sonarjs/elseif-without-else sonarjs/max-lines sonarjs/max-lines-per-function sonarjs/no-duplicate-string sonarjs/shorthand-property-grouping sonarjs/too-many-break-or-continue-in-loop typescript/explicit-function-return-type typescript/explicit-module-boundary-types unicorn/no-await-expression-member unicorn/no-useless-undefined unicorn/prefer-number-coercion eslint/no-loop-func eslint/no-unmodified-loop-condition sonarjs/max-union-size sonarjs/expression-complexity sonarjs/super-linear-regex"
        .split(" ")
        .map((rule) => [rule, "warn"])
    ),
  },
  {
    files: [
      "apps/desktop/src/server/mcp/run-edit.ts",
      "apps/desktop/src/ui/platform/{stream,event-hub,live-store}.ts",
    ],
    rules: Object.fromEntries(
      "anti-slop/no-chained-type-assertions anti-slop/no-known-value-widening anti-slop/no-runtime-typeof anti-slop/no-unknown-parameters anti-slop/no-unknown-returns anti-slop/require-readable-spacing eslint/curly eslint/default-case eslint/func-style eslint/id-length eslint/init-declarations eslint/max-classes-per-file eslint/max-lines-per-function eslint/no-console eslint/no-continue eslint/no-magic-numbers eslint/no-promise-executor-return eslint/no-ternary eslint/no-undefined eslint/prefer-destructuring eslint/sort-keys github/no-then import/consistent-type-specifier-style import/exports-last import/group-exports import/no-relative-parent-imports promise/avoid-new promise/prefer-await-to-callbacks promise/prefer-await-to-then sonarjs/elseif-without-else sonarjs/no-undefined-assignment typescript/explicit-function-return-type typescript/explicit-member-accessibility typescript/method-signature-style typescript/parameter-properties unicorn/no-array-sort unicorn/no-useless-spread unicorn/no-useless-undefined unicorn/prefer-add-event-listener unicorn/prefer-global-this unicorn/require-post-message-target-origin sonarjs/max-lines-per-function"
        .split(" ")
        .map((rule) => [rule, "warn"])
    ),
  },
  {
    files: ["apps/desktop/src/ui/platform/{desktop,storage,app-events}.ts"],
    rules: Object.fromEntries(
      "anti-slop/no-conditional-empty-object-spread unicorn/prefer-set-has eslint/sort-keys eslint/no-useless-return react/refs unicorn/no-array-reverse react-doctor/no-ref-current-in-render anti-slop/no-chained-type-assertions anti-slop/no-runtime-typeof anti-slop/no-unknown-parameters anti-slop/require-readable-spacing eslint/func-style eslint/id-length eslint/no-magic-numbers eslint/no-ternary eslint/no-undefined github/array-foreach import/exports-last import/group-exports import/no-relative-parent-imports sonarjs/max-union-size sonarjs/no-duplicate-string typescript/explicit-function-return-type typescript/explicit-module-boundary-types unicorn/no-array-for-each unicorn/no-useless-undefined unicorn/prefer-global-this"
        .split(" ")
        .map((rule) => [rule, "warn"])
    ),
  },
  {
    files: ["apps/desktop/src/ui/platform/{router,telemetry}.ts"],
    rules: Object.fromEntries(
      "anti-slop/no-chained-type-assertions anti-slop/no-runtime-typeof eslint/func-style eslint/init-declarations eslint/no-continue eslint/no-ternary eslint/no-undefined eslint/prefer-named-capture-group eslint/require-unicode-regexp eslint/sort-keys import/exports-last import/group-exports import/no-relative-parent-imports sonarjs/no-undefined-assignment sonarjs/shorthand-property-grouping typescript/explicit-function-return-type unicorn/no-useless-undefined unicorn/prefer-global-this"
        .split(" ")
        .map((rule) => [rule, "warn"])
    ),
  },
  {
    files: ["packages/ui/src/**", "apps/desktop/src/ui/domain/**"],
    rules: Object.fromEntries(
      "anti-slop/no-known-value-widening anti-slop/no-runtime-typeof eslint/func-style eslint/id-length eslint/max-lines-per-function eslint/no-magic-numbers eslint/no-nested-ternary eslint/no-plusplus eslint/no-ternary eslint/no-undefined eslint/prefer-arrow-callback eslint/prefer-destructuring eslint/sort-keys github/filenames-match-regex github/prefer-observers import/exports-last import/group-exports import/no-relative-parent-imports jsx-a11y/click-events-have-key-events jsx-a11y/interactive-supports-focus jsx-a11y/prefer-tag-over-role react-doctor/advanced-event-handler-refs react-doctor/only-export-components react-perf/jsx-no-new-function-as-prop react/jsx-max-depth react/only-export-components react/refs sonarjs/no-nested-conditional typescript/explicit-function-return-type typescript/explicit-module-boundary-types unicorn/consistent-existence-index-check unicorn/filename-case unicorn/no-nested-ternary unicorn/prefer-global-this react/function-component-definition"
        .split(" ")
        .map((rule) => [rule, "warn"])
    ),
  },
  {
    files: ["apps/desktop/src/server/app/index.ts"],
    rules: { "oxc/no-barrel-file": "off" },
  },
  {
    files: [
      "apps/desktop/src/ui/features/share-publish-ship-export/export-dialog.tsx",
      "apps/desktop/src/ui/features/share-publish-ship-export/share-dialog.tsx",
      "apps/desktop/src/ui/features/share-publish-ship-export/ship-dialog.tsx",
      "apps/desktop/src/ui/features/share-publish-ship-export/ship-templates.tsx",
      "apps/desktop/src/ui/features/share-publish-ship-export/copy-code-menu.tsx",
      "apps/desktop/src/ui/features/share-publish-ship-export/figma-import-dialog.tsx",
      "apps/desktop/src/ui/features/share-publish-ship-export/export-api.ts",
      "apps/desktop/src/ui/features/share-publish-ship-export/share-api.ts",
      "apps/desktop/src/ui/features/share-publish-ship-export/share-live.ts",
      "apps/desktop/src/ui/features/share-publish-ship-export/ship-api.ts",
      "apps/desktop/src/ui/features/share-publish-ship-export/use-export-target.ts",
    ],
    rules: Object.fromEntries(
      "eslint/class-methods-use-this eslint/init-declarations github/no-inner-html github/unescaped-html-literal promise/no-callback-in-promise react-doctor/design-no-vague-button-label react-doctor/no-loading-flag-reset-outside-finally react-doctor/no-prop-callback-in-render react/use-memo sonarjs/no-undefined-assignment typescript/explicit-member-accessibility typescript/parameter-properties unicorn/max-nested-calls unicorn/no-await-expression-member unicorn/prefer-set-has jsx-a11y/no-noninteractive-tabindex"
        .split(" ")
        .map((rule) => [rule, "warn"])
    ),
  },
  {
    files: [
      "apps/desktop/src/server/direct-edit/tailwind/{classes,color,copy,html-site,index,jsx-site,map,plan,units}.ts",
      "apps/desktop/src/server/{direct-edit/components-ops/index,store/version-hunk}.ts",
      "apps/desktop/src/server/{mcp/{element,layer-ref,layer-ids,line-map,source-loc},page-probe/index,canvas/{index,links/index,app-flow/index}}.ts",
    ],
    rules: {
      "import/no-relative-parent-imports": "off",
      "oxc/no-barrel-file": "off",
      "sonarjs/no-wildcard-import": "off",
    },
  },
  {
    files: [
      "apps/desktop/src/server/direct-edit/commit/index.ts",
      "apps/desktop/src/server/direct-edit/engine/index.ts",
      "apps/desktop/src/server/direct-edit/index.ts",
    ],
    rules: {
      "oxc/no-barrel-file": "off",
      "sonarjs/no-wildcard-import": "off",
    },
  },
  {
    files: ["*.config.ts", "apps/api/src/index.ts"],
    rules: { "import/no-default-export": "off" },
  },
  {
    files: [
      "apps/api/src/{platform/{bindings,rate-limiter,share-live,unlock-lockout},auth/options}.ts",
    ],
    rules: { "sonarjs/no-implicit-dependencies": "off" },
  },
  {
    files: [
      "**/*.generated.ts",
      "packages/common/actions/src/*/index.ts",
      "packages/common/actions/src/*/routes.ts",
      "apps/desktop/src/server/handlers/*/handlers.ts",
      "apps/desktop/src/server/main/{live-layer,runtime-check}.ts",
      "apps/desktop/src/server/preview/mcp-read-store.ts",
    ],
    rules: {
      "import/max-dependencies": "off",
      "max-lines": "off",
      "sonarjs/no-duplicate-string": "off",
    },
  },
  {
    files: ["apps/desktop/desktop/boot.ts"],
    rules: {
      "eslint/no-console": "off",
      "eslint/no-use-before-define": "off",
      "eslint/no-void": "off",
      "node/no-process-env": "off",
      "sonarjs/shorthand-property-grouping": "off",
    },
  },
  {
    files: [
      "apps/desktop/desktop/first-run-page.renderer.ts",
      "apps/desktop/desktop/first-run-page.ts",
    ],
    rules: {
      "eslint/no-void": "off",
      "unicorn/prefer-top-level-await": "off",
    },
  },
  {
    files: ["apps/desktop/desktop/auth.ts"],
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
    files: ["packages/ui/src/chip-button.tsx"],
    rules: { "react/function-component-definition": "off" },
  },
  {
    files: [
      "apps/desktop/src/server/store/projects.ts",
      "apps/desktop/src/server/store/project-{core,create,files,helpers,types}.ts",
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
      "apps/desktop/src/server/store/{project-store,project-writer,project-runtime,project-library-runtime,project-library-store,project-library-writer,workspace-runtime,workspace-store,workspace-writer}.ts",
      "apps/desktop/src/server/handlers/project/{create,create-attachment,delete-command-rule,get,get-design-md,get-file,get-hidden,handlers,import,list,list-command-rules,live,move-hidden,search,set-design-md,update}.ts",
      "apps/desktop/src/server/project-ops/{project-ops-create,project-ops-detail,project-ops-hidden,project-ops-runtime,project-ops-store,project-ops-writer}.ts",
      "packages/common/actions/src/project/{create,create-attachment,delete-command-rule,get,get-design-md,get-file,get-hidden,import,list,list-command-rules,move-hidden,schema,search,set-design-md,update}.ts",
    ],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: [
      "apps/desktop/src/ui/features/versions-layers-tokens/compare-code.tsx",
      "apps/desktop/src/ui/features/versions-layers-tokens/compare-frame.tsx",
      "apps/desktop/src/ui/features/versions-layers-tokens/compare-view.tsx",
      "apps/desktop/src/ui/features/versions-layers-tokens/create-token-dialog.tsx",
      "apps/desktop/src/ui/features/versions-layers-tokens/layers-panel.tsx",
      "apps/desktop/src/ui/features/versions-layers-tokens/token-control.tsx",
      "apps/desktop/src/ui/features/versions-layers-tokens/token-draft.ts",
      "apps/desktop/src/ui/features/versions-layers-tokens/token-inputs.tsx",
      "apps/desktop/src/ui/features/versions-layers-tokens/token-lint.test.ts",
      "apps/desktop/src/ui/features/versions-layers-tokens/token-lint.ts",
      "apps/desktop/src/ui/features/versions-layers-tokens/token-picker.tsx",
      "apps/desktop/src/ui/features/versions-layers-tokens/tokens-panel.tsx",
      "apps/desktop/src/ui/features/versions-layers-tokens/use-layer-edits.ts",
      "apps/desktop/src/ui/features/versions-layers-tokens/use-layer-locks.ts",
      "apps/desktop/src/ui/features/versions-layers-tokens/use-studio-tokens.ts",
      "apps/desktop/src/ui/features/versions-layers-tokens/use-hunk-review.ts",
      "apps/desktop/src/ui/features/versions-layers-tokens/use-token-draft.ts",
      "apps/desktop/src/ui/features/versions-layers-tokens/version-labels.ts",
      "apps/desktop/src/ui/features/versions-layers-tokens/version-row.tsx",
      "apps/desktop/src/ui/features/versions-layers-tokens/versions-api.ts",
    ],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: [
      "apps/desktop/src/server/mcp/action-call.ts",
      "apps/desktop/src/server/mcp/studio-ports.ts",
    ],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: [
      "apps/desktop/src/bridge/anchor-tracker.ts",
      "apps/desktop/src/bridge/live-preview.ts",
      "apps/desktop/src/bridge/zoom-forward.ts",
    ],
    rules: {
      "import/no-relative-parent-imports": "off",
    },
  },
  {
    files: [
      "apps/desktop/src/bridge/anchor-tracker.ts",
      "apps/desktop/src/bridge/dom-input.ts",
      "apps/desktop/src/bridge/element-info.ts",
      "apps/desktop/src/bridge/live-preview.ts",
      "apps/desktop/src/bridge/rect-tracker.ts",
      "apps/desktop/src/bridge/session.ts",
      "apps/desktop/src/bridge/zoom-forward.ts",
    ],
    rules: {
      "unicorn/prefer-global-this": "off",
    },
  },
  {
    files: [
      "apps/desktop/src/bridge/dom-input.ts",
      "apps/desktop/src/bridge/session.ts",
    ],
    rules: {
      "react-doctor/no-unguarded-browser-global-at-module-scope": "off",
    },
  },
  {
    files: [
      "apps/desktop/src/bridge/element-info.ts",
      "apps/desktop/src/bridge/live-preview.ts",
      "apps/desktop/src/bridge/rect-tracker.ts",
    ],
    rules: {
      "eslint/id-length": "off",
    },
  },
  {
    files: ["apps/desktop/src/bridge/element-info.ts"],
    rules: {
      "eslint/prefer-named-capture-group": "off",
    },
  },
  {
    files: [
      "apps/desktop/src/bridge/anchor-tracker.ts",
      "apps/desktop/src/bridge/element-info.ts",
    ],
    rules: {
      "github/no-innerText": "off",
      "unicorn/prefer-dom-node-text-content": "off",
    },
  },
  {
    files: [
      "apps/desktop/src/bridge/element-info.ts",
      "apps/desktop/src/bridge/rect-tracker.ts",
      "apps/desktop/src/bridge/zoom-forward.ts",
    ],
    rules: {
      "sonarjs/shorthand-property-grouping": "off",
    },
  },
  {
    files: [
      "apps/desktop/src/bridge/element-info.ts",
      "apps/desktop/src/bridge/rect-tracker.ts",
    ],
    rules: {
      "anti-slop/no-known-value-widening": "off",
    },
  },
  {
    files: [
      "apps/desktop/src/bridge/anchor-tracker.ts",
      "apps/desktop/src/bridge/dom-input.ts",
      "apps/desktop/src/bridge/live-preview.ts",
    ],
    rules: {
      "unicorn/prefer-query-selector": "off",
    },
  },
  {
    files: [
      "apps/desktop/src/bridge/dom-input.ts",
      "apps/desktop/src/bridge/live-preview.ts",
    ],
    rules: {
      "unicorn/prefer-dom-node-append": "off",
    },
  },
  {
    files: [
      "apps/desktop/src/bridge/anchor-tracker.ts",
      "apps/desktop/src/bridge/dom-input.ts",
      "apps/desktop/src/bridge/live-preview.ts",
      "apps/desktop/src/bridge/rect-tracker.ts",
      "apps/desktop/src/bridge/theme-control.ts",
    ],
    rules: {
      "anti-slop/no-unknown-parameters": "off",
    },
  },
  {
    files: [
      "apps/desktop/src/bridge/anchor-tracker.ts",
      "apps/desktop/src/bridge/dom-input.ts",
    ],
    rules: {
      "sonarjs/expression-complexity": "off",
    },
  },
  {
    files: ["apps/desktop/src/bridge/zoom-forward.ts"],
    rules: {
      "github/require-passive-events": "off",
    },
  },
  {
    files: ["apps/desktop/src/bridge/live-preview.ts"],
    rules: {
      "anti-slop/no-unsafe-dictionary-type": "off",
      "eslint/no-continue": "off",
    },
  },
  {
    files: [
      "apps/desktop/src/bridge/anchor-tracker.ts",
      "apps/desktop/src/bridge/rect-tracker.ts",
    ],
    rules: {
      "eslint/no-use-before-define": "off",
      "unicorn/no-array-callback-reference": "off",
    },
  },
  {
    files: ["apps/desktop/src/bridge/rect-tracker.ts"],
    rules: {
      "react-doctor/js-combine-iterations": "off",
    },
  },
  {
    files: ["apps/desktop/src/bridge/bridge.ts"],
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
    files: [
      "apps/desktop/src/bridge/hover-select.ts",
      "apps/desktop/src/bridge/message-handlers.ts",
    ],
    rules: {
      "anti-slop/no-unknown-parameters": "off",
    },
  },
  {
    files: [
      "apps/desktop/src/bridge/bridge.ts",
      "apps/desktop/src/bridge/hover-select.ts",
      "apps/desktop/src/bridge/keyboard.ts",
      "apps/desktop/src/bridge/message-handlers.ts",
      "apps/desktop/src/bridge/outgoing.ts",
      "apps/desktop/src/bridge/pointer-drag.ts",
    ],
    rules: {
      "unicorn/prefer-global-this": "off",
    },
  },
  {
    files: [
      "apps/desktop/src/bridge/bridge-types.ts",
      "apps/desktop/src/bridge/hover-select.ts",
    ],
    rules: {
      "eslint/id-length": "off",
    },
  },
  {
    files: ["apps/desktop/src/bridge/outgoing.ts"],
    rules: {
      "eslint/no-console": "off",
      "github/prefer-observers": "off",
      "oxc/no-map-spread": "off",
    },
  },
  {
    files: [
      "apps/desktop/src/bridge/hover-select.ts",
      "apps/desktop/src/bridge/keyboard.ts",
      "apps/desktop/src/bridge/message-handlers.ts",
    ],
    rules: {
      "sonarjs/elseif-without-else": "off",
    },
  },
  {
    files: [
      "apps/desktop/src/bridge/keyboard.ts",
      "apps/desktop/src/bridge/pointer-drag.ts",
    ],
    rules: {
      "eslint/no-void": "off",
    },
  },
  {
    files: [
      "apps/desktop/src/bridge/hover-select.ts",
      "apps/desktop/src/bridge/outgoing.ts",
    ],
    rules: {
      "github/no-useless-passive": "off",
    },
  },
  {
    files: ["apps/desktop/src/bridge/keyboard.ts"],
    rules: {
      "import/no-relative-parent-imports": "off",
    },
  },
  {
    files: [
      "apps/desktop/src/bridge/message-handlers.ts",
      "apps/desktop/src/bridge/outgoing.ts",
    ],
    rules: {
      "promise/always-return": "off",
      "unicorn/no-array-callback-reference": "off",
    },
  },
  {
    files: [
      "apps/desktop/src/bridge/bridge.ts",
      "apps/desktop/src/bridge/message-handlers.ts",
      "apps/desktop/src/bridge/outgoing.ts",
      "apps/desktop/src/bridge/pointer-drag.ts",
    ],
    rules: {
      "sonarjs/shorthand-property-grouping": "off",
    },
  },
  {
    files: ["apps/desktop/desktop/build.ts"],
    rules: {
      "import/no-relative-parent-imports": "off",
    },
  },
  {
    files: [
      "apps/desktop/src/ui/features/inspector/accessibility-section.tsx",
      "apps/desktop/src/ui/features/inspector/alt-field.tsx",
      "apps/desktop/src/ui/features/inspector/box-model.tsx",
      "apps/desktop/src/ui/features/inspector/component-section.tsx",
      "apps/desktop/src/ui/features/inspector/components-tab.tsx",
      "apps/desktop/src/ui/features/inspector/effects-model.ts",
      "apps/desktop/src/ui/features/inspector/empty-state.tsx",
      "apps/desktop/src/ui/features/inspector/focal-pad.tsx",
      "apps/desktop/src/ui/features/inspector/image-model.ts",
      "apps/desktop/src/ui/features/inspector/image-section.tsx",
      "apps/desktop/src/ui/features/inspector/inspector-breadcrumb.tsx",
      "apps/desktop/src/ui/features/inspector/inspector-classes.tsx",
      "apps/desktop/src/ui/features/inspector/inspector-code.tsx",
      "apps/desktop/src/ui/features/inspector/inspector-corners.test.ts",
      "apps/desktop/src/ui/features/inspector/inspector-corners.tsx",
      "apps/desktop/src/ui/features/inspector/inspector-effects.tsx",
      "apps/desktop/src/ui/features/inspector/inspector-fields.tsx",
      "apps/desktop/src/ui/features/inspector/inspector-image.tsx",
      "apps/desktop/src/ui/features/inspector/inspector-model.ts",
      "apps/desktop/src/ui/features/inspector/inspector-multi.tsx",
      "apps/desktop/src/ui/features/inspector/inspector-other-styles.tsx",
      "apps/desktop/src/ui/features/inspector/inspector.tsx",
      "apps/desktop/src/ui/features/inspector/leave-dialog.tsx",
      "apps/desktop/src/ui/features/inspector/leave-prompt.tsx",
      "apps/desktop/src/ui/features/inspector/number-field-model.ts",
      "apps/desktop/src/ui/features/inspector/number-field.tsx",
      "apps/desktop/src/ui/features/inspector/number-input.tsx",
      "apps/desktop/src/ui/features/inspector/pro-tab.tsx",
      "apps/desktop/src/ui/features/inspector/same-props.ts",
      "apps/desktop/src/ui/features/inspector/session-header.tsx",
      "apps/desktop/src/ui/features/inspector/shadow-row.tsx",
      "apps/desktop/src/ui/features/inspector/simple-tab.tsx",
      "apps/desktop/src/ui/features/inspector/stacking-section.tsx",
      "apps/desktop/src/ui/features/inspector/tab-bar.tsx",
      "apps/desktop/src/ui/features/inspector/tweaks-note.tsx",
      "apps/desktop/src/ui/features/inspector/use-image-set.ts",
      "apps/desktop/src/ui/features/inspector/use-paste-image.ts",
      "apps/desktop/src/ui/features/inspector/use-scrub.ts",
      "apps/desktop/src/ui/features/inspector/use-session-handle.ts",
      "apps/desktop/src/ui/features/inspector/use-stable-callbacks.ts",
      "apps/desktop/src/ui/features/inspector/use-use-site.ts",
      "apps/desktop/src/ui/features/inspector/vector-section.tsx",
      "apps/desktop/src/ui/features/inspector/layout-keys.ts",
      "apps/desktop/src/ui/features/inspector/auto-layout-section.tsx",
      "apps/desktop/src/ui/features/inspector/size-row.tsx",
      "apps/desktop/src/ui/features/inspector/size-limits.tsx",
      "apps/desktop/src/ui/features/inspector/position-rows.tsx",
      "apps/desktop/src/ui/features/inspector/inspector-layout.tsx",
      "apps/desktop/src/ui/features/inspector/match-scan.ts",
      "apps/desktop/src/ui/features/inspector/match-candidates.tsx",
      "apps/desktop/src/ui/features/inspector/match-token-picker.tsx",
      "apps/desktop/src/ui/features/inspector/match-rows.tsx",
      "apps/desktop/src/ui/features/inspector/inspector-match.tsx",
      "apps/desktop/src/ui/features/inspector/arrange-model.ts",
      "apps/desktop/src/ui/features/inspector/use-arrange.ts",
      "apps/desktop/src/ui/features/inspector/inspector-arrange.tsx",
      "apps/desktop/src/ui/features/inspector/inspector-rows.tsx",
      "apps/desktop/src/ui/features/inspector/inspector-shared.tsx",
      "apps/desktop/src/ui/features/inspector/inspector-source.tsx",
      "apps/desktop/src/ui/features/inspector/inspector-props.tsx",
      "apps/desktop/src/ui/features/inspector/inspector-simple.tsx",
      "apps/desktop/src/ui/features/inspector/inspector-tokens.tsx",
      "apps/desktop/src/ui/features/inspector/inspector-tools.tsx",
      "apps/desktop/src/ui/features/inspector/inspector-tweaks.tsx",
      "apps/desktop/src/ui/features/inspector/inspector-variant-bar.tsx",
      "apps/desktop/src/ui/features/inspector/inspector-vector.tsx",
      "apps/desktop/src/ui/features/inspector/tweaks-panel.tsx",
      "apps/desktop/src/ui/features/inspector/swap-instance-menu.tsx",
      "apps/desktop/src/ui/features/inspector/element-variants-dialog.tsx",
      "apps/desktop/src/ui/features/inspector/swatches.tsx",
      "apps/desktop/src/ui/inspector-slots.ts",
      "apps/desktop/src/ui/features/inspector/use-direct-edit.ts",
      "apps/desktop/src/ui/features/inspector/use-direct-edits.ts",
      "apps/desktop/src/ui/features/inspector/use-tweaks.ts",
      "apps/desktop/src/ui/features/inspector/use-token-snap.ts",
      "apps/desktop/src/ui/features/inspector/use-element-nudge.ts",
      "apps/desktop/src/ui/features/inspector/use-edit-session.ts",
      "apps/desktop/src/ui/features/inspector/use-edit-history.ts",
      "apps/desktop/src/ui/features/inspector/use-planned-edits.ts",
      "apps/desktop/src/ui/features/inspector/use-swap-gate.ts",
      "apps/desktop/src/ui/features/inspector/use-authored-css.ts",
      "apps/desktop/src/ui/features/inspector/use-image-drop.ts",
      "apps/desktop/src/ui/features/inspector/edit-variant.ts",
      "apps/desktop/src/ui/features/inspector/optimistic-edit.ts",
      "apps/desktop/src/ui/features/inspector/proxy-edit.ts",
      "apps/desktop/src/ui/features/inspector/structure-edits.ts",
      "apps/desktop/src/ui/features/inspector/stable-props.ts",
      "apps/desktop/src/ui/features/inspector/shadows.ts",
      "apps/desktop/src/ui/features/inspector/sizing.ts",
      "apps/desktop/src/ui/features/inspector/mixed-values.ts",
      "apps/desktop/src/ui/features/inspector/css-values.ts",
      "apps/desktop/src/ui/features/inspector/math-input.ts",
      "apps/desktop/src/ui/features/inspector/constraints.ts",
      "apps/desktop/src/ui/features/inspector/props-api.ts",
      "apps/desktop/src/ui/features/inspector/delta-batch.ts",
      "apps/desktop/src/ui/features/inspector/authored-css.ts",
      "apps/desktop/src/ui/features/inspector/paste-jsx.ts",
      "apps/desktop/src/ui/features/inspector/image-api.ts",
      "apps/desktop/src/ui/features/inspector/api-error.ts",
    ],
    rules: Object.fromEntries(
      "anti-slop/no-known-value-widening eslint/logical-assignment-operators eslint/max-statements eslint/no-alert eslint/no-await-in-loop eslint/no-plusplus github/unescaped-html-literal promise/avoid-new promise/catch-or-return promise/no-callback-in-promise react-doctor/async-await-in-loop react-doctor/no-adjust-state-on-prop-change react-doctor/no-barrel-import react-doctor/no-pass-live-state-to-parent react-doctor/no-stale-timer-ref react/hook-use-state react/immutability react/memo-dependencies react/preserve-manual-memoization react/todo sonarjs/max-lines-per-function sonarjs/max-union-size sonarjs/no-nested-functions sonarjs/no-nested-incdec sonarjs/no-nested-template-literals sonarjs/no-unused-vars studio/no-finally-state-reset typescript/explicit-member-accessibility typescript/method-signature-style typescript/no-dynamic-delete typescript/no-non-null-assertion unicorn/no-array-callback-reference unicorn/no-array-method-this-argument unicorn/no-array-reduce unicorn/no-await-expression-member unicorn/no-useless-undefined unicorn/prefer-at unicorn/prefer-code-point unicorn/prefer-export-from unicorn/prefer-logical-operator-over-ternary unicorn/prefer-number-coercion unicorn/prefer-number-properties vitest/max-expects vitest/no-conditional-in-test vitest/prefer-strict-equal vitest/prefer-to-be-falsy vitest/prefer-to-be-truthy vitest/require-hook vitest/require-test-timeout vitest/valid-expect sonarjs/no-wildcard-import oxc/no-barrel-file anti-slop/no-array-filter-map anti-slop/no-chained-type-assertions anti-slop/no-conditional-empty-object-spread anti-slop/no-object-parameters anti-slop/no-runtime-typeof anti-slop/no-shape-in-symbol-names anti-slop/no-unknown-parameters anti-slop/no-unknown-returns anti-slop/no-unsafe-dictionary-type anti-slop/require-readable-spacing boundaries/dependencies eslint/arrow-body-style eslint/curly eslint/func-style eslint/id-length eslint/max-lines-per-function eslint/max-params eslint/no-continue eslint/no-magic-numbers eslint/no-nested-ternary eslint/no-restricted-globals eslint/no-shadow eslint/no-ternary eslint/no-undefined eslint/no-unused-vars eslint/no-use-before-define eslint/no-useless-return eslint/no-void eslint/prefer-destructuring eslint/prefer-named-capture-group eslint/require-unicode-regexp eslint/sort-keys github/array-foreach github/filenames-match-regex github/no-blur github/no-inner-html github/no-then import/consistent-type-specifier-style import/exports-last import/group-exports import/no-default-export import/no-relative-parent-imports import/no-unassigned-import oxc/no-map-spread promise/always-return promise/prefer-await-to-callbacks promise/prefer-await-to-then react-doctor/js-combine-iterations react-doctor/no-array-index-as-key react-doctor/no-enter-submit-without-ime-composition-guard react-doctor/no-floating-then-in-jsx-handler react-doctor/no-high-complexity-react-function react-doctor/no-ref-current-in-render react-doctor/no-self-updating-effect react-doctor/only-export-components react-doctor/pointer-capture-needs-cancel-handler react-doctor/prefer-module-scope-pure-function react-doctor/rerender-lazy-ref-init react-hooks/exhaustive-deps react-perf/jsx-no-jsx-as-prop react-perf/jsx-no-new-array-as-prop react-perf/jsx-no-new-function-as-prop react-perf/jsx-no-new-object-as-prop react/exhaustive-effect-dependencies react/forbid-component-props react/function-component-definition react/jsx-handler-names react/jsx-max-depth react/jsx-no-constructed-context-values react/jsx-no-literals react/jsx-no-undef react/jsx-props-no-spreading react/no-array-index-key react/no-multi-comp react/only-export-components react/purity react/refs react/set-state-in-effect sonarjs/elseif-without-else sonarjs/expression-complexity sonarjs/function-name sonarjs/no-duplicate-string sonarjs/no-nested-conditional sonarjs/shorthand-property-grouping sonarjs/super-linear-regex sonarjs/too-many-break-or-continue-in-loop studio/boolean-name studio/feature-file-layout studio/module-function-verb studio/no-busy-flag studio/no-dom-query studio/no-hook-component-import studio/no-inline-copy studio/no-then studio/no-undefined-type studio/predicate-name studio/readonly-field typescript/explicit-function-return-type typescript/explicit-module-boundary-types typescript/no-import-type-side-effects unicorn/catch-error-name unicorn/consistent-function-scoping unicorn/filename-case unicorn/max-nested-calls unicorn/no-array-for-each unicorn/no-nested-ternary unicorn/prefer-global-this unicorn/prefer-spread vitest/prefer-expect-assertions vitest/require-test-timeout github/a11y-role-supports-aria-props jsx-a11y/interactive-supports-focus jsx-a11y/no-noninteractive-element-interactions jsx-a11y/no-noninteractive-tabindex jsx-a11y/prefer-tag-over-role jsx-a11y/role-has-required-aria-props"
        .split(" ")
        .map((rule) => [rule, "warn"])
    ),
  },
  {
    files: [
      "apps/desktop/src/ui/features/inspector/layout-keys.ts",
      "apps/desktop/src/ui/features/inspector/auto-layout-section.tsx",
      "apps/desktop/src/ui/features/inspector/size-row.tsx",
      "apps/desktop/src/ui/features/inspector/size-limits.tsx",
      "apps/desktop/src/ui/features/inspector/position-rows.tsx",
      "apps/desktop/src/ui/features/inspector/inspector-layout.tsx",
      "apps/desktop/src/ui/features/inspector/match-scan.ts",
      "apps/desktop/src/ui/features/inspector/match-candidates.tsx",
      "apps/desktop/src/ui/features/inspector/match-token-picker.tsx",
      "apps/desktop/src/ui/features/inspector/match-rows.tsx",
      "apps/desktop/src/ui/features/inspector/inspector-match.tsx",
      "apps/desktop/src/ui/features/inspector/arrange-model.ts",
      "apps/desktop/src/ui/features/inspector/use-arrange.ts",
      "apps/desktop/src/ui/features/inspector/inspector-arrange.tsx",
      "apps/desktop/src/ui/features/inspector/inspector-rows.tsx",
      "apps/desktop/src/ui/features/inspector/inspector-shared.tsx",
      "apps/desktop/src/ui/features/inspector/inspector-source.tsx",
      "apps/desktop/src/ui/features/inspector/inspector-props.tsx",
      "apps/desktop/src/ui/features/inspector/inspector-simple.tsx",
      "apps/desktop/src/ui/features/inspector/inspector-tokens.tsx",
      "apps/desktop/src/ui/features/inspector/inspector-tools.tsx",
      "apps/desktop/src/ui/features/inspector/inspector-tweaks.tsx",
      "apps/desktop/src/ui/features/inspector/inspector-variant-bar.tsx",
      "apps/desktop/src/ui/features/inspector/inspector-vector.tsx",
      "apps/desktop/src/ui/features/inspector/tweaks-panel.tsx",
      "apps/desktop/src/ui/features/inspector/swap-instance-menu.tsx",
      "apps/desktop/src/ui/features/inspector/element-variants-dialog.tsx",
      "apps/desktop/src/ui/features/inspector/swatches.tsx",
    ],
    rules: Object.fromEntries(
      "anti-slop/no-known-value-widening jsx-a11y/role-supports-aria-props oxc/no-accumulating-spread promise/avoid-new promise/no-callback-in-promise react-doctor/no-adjust-state-on-prop-change react-doctor/no-pass-data-to-parent react-doctor/no-pass-live-state-to-parent react-doctor/no-reset-all-state-on-prop-change react-doctor/no-spread-accumulator-in-reduce react/memo-dependencies react/todo react/use-memo sonarjs/no-nested-template-literals studio/no-finally-state-reset typescript/consistent-type-definitions unicorn/no-array-callback-reference unicorn/no-array-reduce unicorn/no-array-sort unicorn/prefer-number-coercion unicorn/prefer-number-properties"
        .split(" ")
        .map((rule) => [rule, "warn"])
    ),
  },
  {
    files: [
      "apps/desktop/src/ui/features/inspector/inspector-props.tsx",
      "apps/desktop/src/ui/features/inspector/inspector-simple.tsx",
      "apps/desktop/src/ui/features/inspector/inspector-tokens.tsx",
      "apps/desktop/src/ui/features/inspector/inspector-tools.tsx",
      "apps/desktop/src/ui/features/inspector/inspector-tweaks.tsx",
      "apps/desktop/src/ui/features/inspector/inspector-variant-bar.tsx",
      "apps/desktop/src/ui/features/inspector/inspector-vector.tsx",
      "apps/desktop/src/ui/features/inspector/tweaks-panel.tsx",
      "apps/desktop/src/ui/features/inspector/swap-instance-menu.tsx",
      "apps/desktop/src/ui/features/inspector/element-variants-dialog.tsx",
      "apps/desktop/src/ui/features/inspector/swatches.tsx",
    ],
    rules: Object.fromEntries(
      "eslint/max-lines eslint/no-plusplus import/max-dependencies jsx-a11y/control-has-associated-label promise/catch-or-return react-doctor/prefer-html-dialog react-doctor/rerender-lazy-state-init react/button-has-type sonarjs/max-lines sonarjs/max-union-size sonarjs/no-built-in-override sonarjs/no-identical-functions sonarjs/no-nested-incdec unicorn/no-useless-collection-argument unicorn/no-useless-undefined"
        .split(" ")
        .map((rule) => [rule, "warn"])
    ),
  },
  {
    files: [
      "apps/desktop/src/ui/features/home/app-slot.tsx",
      "apps/desktop/src/ui/features/home/chip-menu-slot.tsx",
      "apps/desktop/src/ui/features/home/composer-bar.tsx",
      "apps/desktop/src/ui/features/home/doctor-model.ts",
      "apps/desktop/src/ui/features/home/drop-hint.tsx",
      "apps/desktop/src/ui/features/home/hero-notes.tsx",
      "apps/desktop/src/ui/features/home/home-composer-parts.tsx",
      "apps/desktop/src/ui/features/home/home-empty.tsx",
      "apps/desktop/src/ui/features/home/home-extras.tsx",
      "apps/desktop/src/ui/features/home/home-header.tsx",
      "apps/desktop/src/ui/features/home/home-library.tsx",
      "apps/desktop/src/ui/features/home/home-model.ts",
      "apps/desktop/src/ui/features/home/home-overlays.tsx",
      "apps/desktop/src/ui/features/home/home-sections.tsx",
      "apps/desktop/src/ui/features/home/home-slash.tsx",
      "apps/desktop/src/ui/features/home/home-starters.tsx",
      "apps/desktop/src/ui/features/home/home-templates.tsx",
      "apps/desktop/src/ui/features/home/home.tsx",
      "apps/desktop/src/ui/features/home/lazy-parts.ts",
      "apps/desktop/src/ui/features/home/library-area.tsx",
      "apps/desktop/src/ui/features/home/library-panel.tsx",
      "apps/desktop/src/ui/features/home/pill-select.tsx",
      "apps/desktop/src/ui/features/home/prompt-area.tsx",
      "apps/desktop/src/ui/features/home/send-button.tsx",
      "apps/desktop/src/ui/features/home/starter-row.tsx",
      "apps/desktop/src/ui/features/home/templates-section.tsx",
      "apps/desktop/src/ui/features/home/use-chip-flow.ts",
      "apps/desktop/src/ui/features/home/use-doctor-gate.ts",
      "apps/desktop/src/ui/features/home/use-example.ts",
      "apps/desktop/src/ui/features/home/use-home-screen.tsx",
      "apps/desktop/src/ui/features/home/use-module.ts",
      "apps/desktop/src/ui/features/home/use-open-app-requests.ts",
      "apps/desktop/src/ui/features/home/use-open-flows.ts",
      "apps/desktop/src/ui/features/home/use-root-drop.ts",
      "apps/desktop/src/ui/features/home/project-grid.tsx",
      "apps/desktop/src/ui/features/home/project-rail.tsx",
      "apps/desktop/src/ui/features/home/project-thumb.tsx",
      "apps/desktop/src/ui/features/home/project-card-menus.tsx",
      "apps/desktop/src/ui/features/home/home-app-chip.tsx",
      "apps/desktop/src/ui/features/home/home-app-menu.tsx",
      "apps/desktop/src/ui/features/home/home-popovers.tsx",
      "apps/desktop/src/ui/features/home/home-trash.tsx",
      "apps/desktop/src/ui/features/home/home-doctor.tsx",
      "apps/desktop/src/ui/features/home/new-project-advanced.tsx",
      "apps/desktop/src/ui/features/home/folder-controls.tsx",
      "apps/desktop/src/ui/features/home/home-prefs-model.ts",
      "apps/desktop/src/ui/features/home/projects-store-model.ts",
      "apps/desktop/src/ui/features/home/project-hits-model.ts",
      "apps/desktop/src/ui/features/home/use-workspaces.ts",
      "apps/desktop/src/ui/features/home/use-folder-chooser.ts",
      "apps/desktop/src/ui/features/home/use-profile-initial.ts",
      "apps/desktop/src/ui/features/home/use-studio-data.ts",
    ],
    rules: Object.fromEntries(
      "anti-slop/no-array-filter-map anti-slop/no-conditional-empty-object-spread anti-slop/no-known-value-widening anti-slop/no-unknown-parameters anti-slop/no-unsafe-dictionary-type anti-slop/require-readable-spacing eslint/func-style eslint/id-length eslint/max-lines eslint/max-lines-per-function eslint/max-params eslint/max-statements eslint/no-magic-numbers eslint/no-nested-ternary eslint/no-ternary eslint/no-undefined eslint/no-unused-vars eslint/no-void eslint/prefer-destructuring eslint/prefer-named-capture-group eslint/require-unicode-regexp eslint/sort-imports eslint/sort-keys github/array-foreach github/filenames-match-regex github/no-then import/consistent-type-specifier-style import/exports-last import/group-exports import/max-dependencies import/no-default-export import/no-relative-parent-imports import/prefer-default-export promise/always-return promise/no-callback-in-promise promise/prefer-await-to-callbacks promise/prefer-await-to-then react-doctor/js-combine-iterations react-doctor/no-adjust-state-on-prop-change react-doctor/no-create-object-url-without-revoke react-doctor/no-img-without-dimensions react-doctor/no-loading-flag-reset-outside-finally react-doctor/no-ref-current-in-render react-doctor/only-export-components react-doctor/prefer-module-scope-pure-function react-doctor/rerender-memo-with-default-value react-doctor/rerender-state-only-in-handlers react-perf/jsx-no-jsx-as-prop react-perf/jsx-no-new-array-as-prop react-perf/jsx-no-new-function-as-prop react-perf/jsx-no-new-object-as-prop react/exhaustive-effect-dependencies react/forbid-component-props react/function-component-definition react/immutability react/jsx-handler-names react/jsx-max-depth react/jsx-no-literals react/jsx-props-no-spreading react/no-multi-comp react/no-object-type-as-default-prop react/only-export-components react/refs react/set-state-in-effect react/todo sonarjs/expression-complexity sonarjs/max-lines sonarjs/max-lines-per-function sonarjs/max-union-size sonarjs/no-dead-store sonarjs/no-duplicate-string sonarjs/no-nested-conditional sonarjs/no-unused-vars sonarjs/shorthand-property-grouping studio/boolean-name studio/feature-file-layout studio/module-function-verb studio/no-busy-flag studio/no-dom-query studio/no-feature-interval studio/no-finally-state-reset studio/no-hook-component-import studio/no-inline-copy studio/no-json-cast studio/no-then studio/no-undefined-type studio/readonly-field typescript/consistent-type-definitions typescript/consistent-type-imports typescript/explicit-function-return-type typescript/explicit-module-boundary-types unicorn/catch-error-name unicorn/consistent-function-scoping unicorn/filename-case unicorn/no-array-callback-reference unicorn/no-array-for-each unicorn/no-array-sort unicorn/no-await-expression-member unicorn/no-nested-ternary unicorn/no-useless-undefined unicorn/prefer-global-this unicorn/prefer-spread"
        .split(" ")
        .map((rule) => [rule, "warn"])
    ),
  },
  {
    files: [
      "apps/desktop/src/ui/features/home/home-extras.tsx",
      "apps/desktop/src/ui/features/home/home-sections.tsx",
      "apps/desktop/src/ui/features/home/home-templates.tsx",
      "apps/desktop/src/ui/features/home/prompt-area.tsx",
    ],
    rules: {
      "jsx-a11y/no-autofocus": "off",
      "jsx-a11y/prefer-tag-over-role": "off",
      "promise/prefer-await-to-callbacks": "off",
    },
  },
  {
    files: [
      "apps/desktop/src/ui/features/home/project-grid.tsx",
      "apps/desktop/src/ui/features/home/project-rail.tsx",
      "apps/desktop/src/ui/features/home/project-thumb.tsx",
      "apps/desktop/src/ui/features/home/project-card-menus.tsx",
      "apps/desktop/src/ui/features/home/home-app-chip.tsx",
      "apps/desktop/src/ui/features/home/home-app-menu.tsx",
      "apps/desktop/src/ui/features/home/home-popovers.tsx",
      "apps/desktop/src/ui/features/home/home-trash.tsx",
      "apps/desktop/src/ui/features/home/home-doctor.tsx",
      "apps/desktop/src/ui/features/home/new-project-advanced.tsx",
      "apps/desktop/src/ui/features/home/folder-controls.tsx",
      "apps/desktop/src/ui/features/home/home-prefs-model.ts",
      "apps/desktop/src/ui/features/home/projects-store-model.ts",
      "apps/desktop/src/ui/features/home/project-hits-model.ts",
      "apps/desktop/src/ui/features/home/use-workspaces.ts",
      "apps/desktop/src/ui/features/home/use-folder-chooser.ts",
      "apps/desktop/src/ui/features/home/use-profile-initial.ts",
      "apps/desktop/src/ui/features/home/use-studio-data.ts",
    ],
    rules: Object.fromEntries(
      "anti-slop/no-runtime-typeof anti-slop/require-readable-spacing eslint/curly eslint/no-await-in-loop eslint/no-continue eslint/no-duplicate-imports eslint/no-promise-executor-return eslint/no-use-before-define eslint/no-useless-return import/no-duplicates import/no-unassigned-import promise/avoid-new promise/catch-or-return promise/prefer-catch react/no-array-index-key react-doctor/design-no-vague-button-label react-doctor/form-control-requires-name react-doctor/js-set-map-lookups react-doctor/no-enter-submit-without-ime-composition-guard react-doctor/no-high-complexity-react-function react-doctor/no-prop-callback-in-render react-doctor/no-derived-useState react-hooks/rules-of-hooks sonarjs/elseif-without-else sonarjs/no-nested-template-literals sonarjs/no-wildcard-import unicorn/prefer-array-find jsx-a11y/no-autofocus jsx-a11y/prefer-tag-over-role jsx-a11y/no-noninteractive-element-interactions jsx-a11y/interactive-supports-focus jsx-a11y/no-static-element-interactions jsx-a11y/control-has-associated-label github/a11y-no-title-attribute promise/prefer-await-to-callbacks unicorn/prefer-set-has sonarjs/no-nested-functions react/purity react/memo-dependencies eslint/no-shadow unicorn/no-array-reduce unicorn/prefer-ternary eslint/init-declarations sonarjs/no-undefined-assignment react/hook-use-state eslint/default-case react-doctor/rerender-lazy-ref-init react-doctor/async-await-in-loop react-doctor/no-chain-state-updates"
        .split(" ")
        .map((rule) => [rule, "warn"])
    ),
  },
  {
    files: [
      "apps/desktop/src/ui/features/chat/budget-indicator.tsx",
      "apps/desktop/src/ui/features/chat/chat-feedback.tsx",
      "apps/desktop/src/ui/features/chat/chat-panel-parts.tsx",
      "apps/desktop/src/ui/features/chat/chat-panel-window.tsx",
      "apps/desktop/src/ui/features/chat/chat-panel.tsx",
      "apps/desktop/src/ui/features/chat/chat-parts.tsx",
      "apps/desktop/src/ui/features/chat/chat-rewind.tsx",
      "apps/desktop/src/ui/features/chat/chat-run-entry.tsx",
      "apps/desktop/src/ui/features/chat/chat-run-parts.tsx",
      "apps/desktop/src/ui/features/chat/chat-search.tsx",
      "apps/desktop/src/ui/features/chat/chat-splitter.tsx",
      "apps/desktop/src/ui/features/chat/chat-turn-model.ts",
      "apps/desktop/src/ui/features/chat/clarify-form.tsx",
      "apps/desktop/src/ui/features/chat/context-meter.tsx",
      "apps/desktop/src/ui/features/chat/index.ts",
      "apps/desktop/src/ui/features/chat/latency-breakdown.tsx",
      "apps/desktop/src/ui/features/chat/permission-prompt.tsx",
      "apps/desktop/src/ui/features/chat/queued-messages.tsx",
      "apps/desktop/src/ui/features/chat/todo-panel.tsx",
      "apps/desktop/src/ui/features/chat/unfinished-banner.tsx",
      "apps/desktop/src/ui/features/chat/use-chat-panel.ts",
      "apps/desktop/src/ui/features/chat/prompt-box.tsx",
      "apps/desktop/src/ui/features/chat/composer-menu.tsx",
      "apps/desktop/src/ui/features/chat/composer-parts.tsx",
      "apps/desktop/src/ui/features/chat/composer-focus.ts",
      "apps/desktop/src/ui/features/chat/mention-picker.tsx",
      "apps/desktop/src/ui/features/chat/slash-menu.tsx",
      "apps/desktop/src/ui/features/chat/slash-groups.ts",
      "apps/desktop/src/ui/features/chat/skill-picker.tsx",
      "apps/desktop/src/ui/features/chat/skills-checklist.tsx",
      "apps/desktop/src/ui/features/chat/history-search.tsx",
      "apps/desktop/src/ui/features/chat/inline-prompt.tsx",
      "apps/desktop/src/ui/features/chat/stable-text.tsx",
      "apps/desktop/src/ui/features/chat/mcp-feed.tsx",
      "apps/desktop/src/ui/features/chat/mcp-point-badge.tsx",
      "apps/desktop/src/ui/features/chat/mcp-toasts.tsx",
      "apps/desktop/src/ui/features/chat/run-comments.tsx",
      "apps/desktop/src/ui/features/chat/run-context-chip.tsx",
      "apps/desktop/src/ui/features/chat/run-details.tsx",
      "apps/desktop/src/ui/features/chat/run-settings.tsx",
      "apps/desktop/src/ui/features/chat/level-control.tsx",
      "apps/desktop/src/ui/features/chat/tool-chips.test.ts",
      "apps/desktop/src/ui/features/chat/draft-improve.test.ts",
      "apps/desktop/src/ui/features/chat/tool-chips.tsx",
      "apps/desktop/src/ui/features/chat/repo-context-chip.tsx",
      "apps/desktop/src/ui/features/chat/draft-bar.tsx",
      "apps/desktop/src/ui/features/chat/draft-improve.tsx",
      "apps/desktop/src/ui/features/chat/draft-sources.tsx",
      "apps/desktop/src/ui/features/chat/use-chat-state.ts",
      "apps/desktop/src/ui/features/chat/use-composer-keys.ts",
      "apps/desktop/src/ui/features/chat/use-mentions.ts",
      "apps/desktop/src/ui/features/chat/use-run-controls.ts",
      "apps/desktop/src/ui/features/chat/use-run-level.ts",
      "apps/desktop/src/ui/features/chat/use-run-notice.ts",
      "apps/desktop/src/ui/features/chat/use-run-canvas.ts",
      "apps/desktop/src/ui/features/chat/use-rewind.ts",
      "apps/desktop/src/ui/features/chat/use-mcp-feed.ts",
      "apps/desktop/src/ui/features/chat/use-inline-prompt.ts",
      "apps/desktop/src/ui/features/chat/use-first-build.ts",
      "apps/desktop/src/ui/features/chat/use-escape-stop.ts",
      "apps/desktop/src/ui/features/chat/use-presence.ts",
      "apps/desktop/src/ui/features/chat/run-state-model.ts",
      "apps/desktop/src/ui/features/chat/run-feedback-model.ts",
      "apps/desktop/src/ui/features/chat/run-history-model.ts",
      "apps/desktop/src/ui/features/chat/skills-model.ts",
      "apps/desktop/src/ui/features/chat/tool-labels-model.ts",
      "apps/desktop/src/ui/features/chat/chat-search-model.ts",
      "apps/desktop/src/ui/features/chat/mcp-model.ts",
      "apps/desktop/src/ui/features/chat/settings-draft-model.ts",
      "apps/desktop/src/ui/features/chat/approval-spot-model.ts",
      "apps/desktop/src/ui/features/chat/run-state-model.test.ts",
      "apps/desktop/src/ui/features/chat/run-settings.test.ts",
      "apps/desktop/src/ui/chat-slots.ts",
      "apps/desktop/src/ui/features/share-publish-ship-export/copy.ts",
      "apps/desktop/src/ui/features/share-publish-ship-export/publish-pane.tsx",
      "apps/desktop/src/ui/features/share-publish-ship-export/publish-setup.tsx",
      "apps/desktop/src/ui/features/share-publish-ship-export/publish-backend-setup.tsx",
      "apps/desktop/src/ui/features/share-publish-ship-export/publication-row.tsx",
      "apps/desktop/src/ui/features/share-publish-ship-export/publish-api.ts",
      "apps/desktop/src/ui/features/share-publish-ship-export/index.ts",
      "apps/desktop/src/ui/features/review/review-panel.tsx",
      "apps/desktop/src/ui/features/review/review-entry.tsx",
      "apps/desktop/src/ui/features/review/render-check-panel.tsx",
      "apps/desktop/src/ui/features/review/rules-editor.tsx",
      "apps/desktop/src/ui/features/review/errors-panel.tsx",
      "apps/desktop/src/ui/features/review/use-review.ts",
      "apps/desktop/src/ui/features/review/index.ts",
    ],
    rules: Object.fromEntries(
      "anti-slop/no-array-filter-map anti-slop/no-chained-type-assertions anti-slop/no-unknown-returns sonarjs/no-unused-vars eslint/default-case unicorn/prefer-add-event-listener typescript/no-non-null-assertion vitest/require-hook vitest/max-expects anti-slop/no-unsafe-dictionary-type react-doctor/no-side-effect-in-state-updater-function eslint/no-useless-return typescript/no-dynamic-delete anti-slop/no-conditional-empty-object-spread anti-slop/no-known-value-widening anti-slop/no-runtime-typeof anti-slop/no-unknown-parameters anti-slop/require-readable-spacing boundaries/dependencies eslint/complexity eslint/curly eslint/func-style eslint/id-length eslint/max-lines eslint/max-lines-per-function eslint/max-params eslint/max-statements eslint/no-await-in-loop eslint/no-continue eslint/no-magic-numbers eslint/no-nested-ternary eslint/no-plusplus eslint/no-ternary eslint/no-undefined eslint/no-unused-vars eslint/no-use-before-define eslint/no-void eslint/prefer-arrow-callback eslint/prefer-destructuring eslint/prefer-named-capture-group eslint/require-unicode-regexp eslint/sort-keys github/a11y-role-supports-aria-props github/array-foreach github/no-blur github/no-then github/prefer-observers import/consistent-type-specifier-style import/exports-last import/group-exports import/max-dependencies import/no-default-export import/no-relative-parent-imports import/no-unassigned-import jsx-a11y/click-events-have-key-events jsx-a11y/control-has-associated-label jsx-a11y/interactive-supports-focus jsx-a11y/no-autofocus jsx-a11y/no-noninteractive-element-interactions jsx-a11y/no-noninteractive-element-to-interactive-role jsx-a11y/no-static-element-interactions jsx-a11y/prefer-tag-over-role jsx-a11y/role-supports-aria-props promise/always-return promise/catch-or-return promise/prefer-await-to-callbacks promise/prefer-await-to-then promise/prefer-catch react-doctor/async-await-in-loop react-doctor/data-table-requires-accessible-name react-doctor/empty-table-header react-doctor/form-control-requires-name react-doctor/js-combine-iterations react-doctor/js-set-map-lookups react-doctor/no-adjust-state-on-prop-change react-doctor/no-array-index-as-key react-doctor/no-chain-state-updates react-doctor/no-create-object-url-without-revoke react-doctor/no-enter-submit-without-ime-composition-guard react-doctor/no-event-handler react-doctor/no-giant-component react-doctor/no-high-complexity-react-function react-doctor/no-pass-live-state-to-parent react-doctor/no-ref-current-in-render react-doctor/no-reset-all-state-on-prop-change react-doctor/no-unguarded-browser-global-at-module-scope react-doctor/no-unguarded-browser-global-in-render-or-hook-init react-doctor/only-export-components react-doctor/prefer-html-dialog react-doctor/prefer-module-scope-pure-function react-doctor/rendering-conditional-render react-doctor/rerender-state-only-in-handlers react-hooks/exhaustive-deps react-perf/jsx-no-jsx-as-prop react-perf/jsx-no-new-array-as-prop react-perf/jsx-no-new-function-as-prop react-perf/jsx-no-new-object-as-prop react/button-has-type react/exhaustive-effect-dependencies react/forbid-component-props react/function-component-definition react/hook-use-state react/jsx-handler-names react/jsx-max-depth react/jsx-no-literals react/jsx-no-useless-fragment react/jsx-props-no-spreading react/memo-dependencies react/no-array-index-key react/no-multi-comp react/no-unescaped-entities react/only-export-components react/purity react/refs react/set-state-in-effect react/todo sonarjs/elseif-without-else sonarjs/expression-complexity sonarjs/function-name sonarjs/max-lines sonarjs/max-lines-per-function sonarjs/no-duplicate-string sonarjs/no-nested-conditional sonarjs/no-nested-functions sonarjs/no-nested-incdec sonarjs/no-nested-template-literals sonarjs/no-wildcard-import sonarjs/shorthand-property-grouping sonarjs/super-linear-regex studio/no-busy-flag studio/no-dom-query studio/no-feature-interval studio/no-finally-state-reset studio/no-hook-component-import studio/no-inline-copy studio/no-then typescript/explicit-function-return-type typescript/explicit-module-boundary-types unicorn/catch-error-name unicorn/consistent-function-scoping unicorn/explicit-length-check unicorn/no-array-callback-reference unicorn/no-array-for-each unicorn/no-array-reduce unicorn/no-array-reverse unicorn/no-array-sort unicorn/no-nested-ternary unicorn/no-useless-undefined unicorn/prefer-at unicorn/prefer-export-from unicorn/prefer-global-this unicorn/prefer-query-selector unicorn/prefer-spread vitest/prefer-expect-assertions vitest/prefer-strict-equal vitest/prefer-to-be-falsy vitest/prefer-to-be-truthy vitest/require-test-timeout github/unescaped-html-literal promise/no-callback-in-promise react-doctor/no-derived-state react-doctor/no-derived-state-effect react-doctor/no-derived-useState react-doctor/no-locale-format-in-render unicorn/no-await-expression-member unicorn/no-useless-collection-argument"
        .split(" ")
        .map((rule) => [rule, "warn"])
    ),
  },
  {
    files: [
      "apps/desktop/src/ui/app/shell/**",
      "packages/ui/src/{brand-mark,theme-button,theme-menu,disclosure,lazy-select}.tsx",
    ],
    rules: Object.fromEntries(
      "anti-slop/no-chained-type-assertions anti-slop/no-unknown-parameters anti-slop/require-readable-spacing eslint/func-style eslint/id-length eslint/max-lines-per-function eslint/no-continue eslint/no-magic-numbers eslint/no-nested-ternary eslint/no-ternary eslint/no-undefined eslint/no-void eslint/prefer-destructuring eslint/prefer-named-capture-group eslint/require-unicode-regexp eslint/sort-keys github/a11y-role-supports-aria-props github/a11y-svg-has-accessible-name github/no-then import/consistent-type-specifier-style import/exports-last import/group-exports import/no-default-export import/no-relative-parent-imports import/no-unassigned-import oxc/no-barrel-file promise/always-return promise/catch-or-return promise/prefer-await-to-callbacks promise/prefer-await-to-then react-doctor/form-control-requires-name react-doctor/no-enter-submit-without-ime-composition-guard react-doctor/no-ref-current-in-render react-doctor/only-export-components react-doctor/prefer-html-dialog react-doctor/prefer-use-effect-event react-perf/jsx-no-jsx-as-prop react-perf/jsx-no-new-array-as-prop react-perf/jsx-no-new-function-as-prop react/button-has-type react/exhaustive-effect-dependencies react/function-component-definition react/jsx-handler-names react/jsx-max-depth react/jsx-no-literals react/jsx-props-no-spreading react/no-array-index-key react/no-multi-comp react/only-export-components react/refs react/todo sonarjs/elseif-without-else sonarjs/expression-complexity sonarjs/function-name sonarjs/no-nested-conditional sonarjs/no-wildcard-import sonarjs/shorthand-property-grouping sonarjs/super-linear-regex studio/no-then typescript/consistent-type-definitions typescript/explicit-function-return-type typescript/explicit-module-boundary-types unicorn/catch-error-name unicorn/no-array-reduce unicorn/no-nested-ternary unicorn/no-useless-undefined unicorn/prefer-global-this unicorn/prefer-spread jsx-a11y/interactive-supports-focus jsx-a11y/no-autofocus jsx-a11y/prefer-tag-over-role jsx-a11y/no-interactive-element-to-noninteractive-role jsx-a11y/no-noninteractive-element-interactions jsx-a11y/role-has-required-aria-props react-doctor/no-derived-useState"
        .split(" ")
        .map((rule) => [rule, "warn"])
    ),
  },
  {
    files: [
      "apps/desktop/src/ui/features/canvas/canvas-chrome-menu.tsx",
      "apps/desktop/src/ui/features/canvas/canvas-chrome.tsx",
      "apps/desktop/src/ui/features/canvas/canvas-helpers.ts",
      "apps/desktop/src/ui/features/canvas/canvas-layers.tsx",
      "apps/desktop/src/ui/features/canvas/canvas-overlays.tsx",
      "apps/desktop/src/ui/features/canvas/canvas-shell.ts",
      "apps/desktop/src/ui/features/canvas/canvas-stage.tsx",
      "apps/desktop/src/ui/features/canvas/canvas-tool-slots.tsx",
      "apps/desktop/src/ui/features/canvas/canvas-types.ts",
      "apps/desktop/src/ui/features/canvas/canvas-view.tsx",
      "apps/desktop/src/ui/features/canvas/canvas.tsx",
      "apps/desktop/src/ui/features/canvas/index.ts",
      "apps/desktop/src/ui/features/canvas/stage-parts.tsx",
      "apps/desktop/src/ui/features/canvas/use-canvas-edits.ts",
      "apps/desktop/src/ui/features/canvas/use-canvas-preview.ts",
      "apps/desktop/src/ui/features/canvas/use-canvas-stage.ts",
      "apps/desktop/src/ui/features/canvas/use-canvas-wiring.tsx",
      "apps/desktop/src/ui/features/canvas/use-frame-labels.tsx",
      "apps/desktop/src/ui/features/canvas/use-preview-url.ts",
      "apps/desktop/src/ui/features/canvas/use-stage-keys.ts",
      "apps/desktop/src/ui/app/canvas-commands-host.tsx",
      "apps/desktop/src/ui/canvas-toolbar-slots.ts",
      "apps/desktop/src/ui/canvas-preview-slots.ts",
      "apps/desktop/src/ui/canvas-link-slots.ts",
      "apps/desktop/src/ui/features/share-publish-ship-export/export-dialog.tsx",
      "apps/desktop/src/ui/features/share-publish-ship-export/share-dialog.tsx",
      "apps/desktop/src/ui/features/share-publish-ship-export/ship-dialog.tsx",
      "apps/desktop/src/ui/features/share-publish-ship-export/ship-templates.tsx",
      "apps/desktop/src/ui/features/share-publish-ship-export/copy-code-menu.tsx",
      "apps/desktop/src/ui/features/share-publish-ship-export/figma-import-dialog.tsx",
      "apps/desktop/src/ui/features/share-publish-ship-export/export-api.ts",
      "apps/desktop/src/ui/features/share-publish-ship-export/share-api.ts",
      "apps/desktop/src/ui/features/share-publish-ship-export/share-live.ts",
      "apps/desktop/src/ui/features/share-publish-ship-export/ship-api.ts",
      "apps/desktop/src/ui/features/share-publish-ship-export/use-export-target.ts",
      "apps/desktop/src/ui/canvas-hook-slots.ts",
      "apps/desktop/src/ui/features/canvas/canvas-frames.tsx",
      "apps/desktop/src/ui/features/canvas/passive-frame.tsx",
      "apps/desktop/src/ui/features/canvas/add-frame-menu.tsx",
      "apps/desktop/src/ui/features/canvas/ruler-draw.ts",
      "apps/desktop/src/ui/features/canvas/canvas-rulers.tsx",
      "apps/desktop/src/ui/features/canvas/toolbar-viewport.tsx",
      "apps/desktop/src/ui/features/canvas/canvas-toolbar.tsx",
      "apps/desktop/src/ui/features/canvas/top-bar-menu.tsx",
      "apps/desktop/src/ui/features/canvas/top-bar-drop-menu.tsx",
      "apps/desktop/src/ui/features/canvas/top-bar-zoom.tsx",
      "apps/desktop/src/ui/features/canvas/canvas-top-bar.tsx",
      "apps/desktop/src/ui/features/canvas/artboard-overlay.tsx",
      "apps/desktop/src/ui/features/canvas/app-canvas-routes.tsx",
      "apps/desktop/src/ui/features/canvas/app-canvas.tsx",
      "apps/desktop/src/ui/features/canvas/frame-more-menu.tsx",
      "apps/desktop/src/ui/features/canvas/frame-resize-handles.tsx",
      "apps/desktop/src/ui/features/canvas/variation-controls.tsx",
      "apps/desktop/src/ui/features/canvas/frame-controls.tsx",
      "apps/desktop/src/ui/features/canvas/frame-skeleton.tsx",
      "apps/desktop/src/ui/features/canvas/frame-state-parts.tsx",
      "apps/desktop/src/ui/features/canvas/frame-state-menu.tsx",
      "apps/desktop/src/ui/features/canvas/draw-layer.tsx",
      "apps/desktop/src/ui/features/canvas/vector-layer.tsx",
      "apps/desktop/src/ui/features/canvas/free-move-layer.tsx",
      "apps/desktop/src/ui/features/canvas/prototype-layer.tsx",
      "apps/desktop/src/ui/features/canvas/play-mode.tsx",
      "apps/desktop/src/ui/features/canvas/variations-layer.tsx",
      "apps/desktop/src/ui/features/canvas/variation-brief-card.tsx",
      "apps/desktop/src/ui/features/canvas/variations-control.tsx",
      "apps/desktop/src/ui/features/canvas/flow-from-here.tsx",
      "apps/desktop/src/ui/features/canvas/flow-tab.tsx",
      "apps/desktop/src/ui/features/canvas/preview-menu.tsx",
      "apps/desktop/src/ui/features/canvas/use-preview-menu.tsx",
      "apps/desktop/src/ui/features/canvas/use-canvas-frames.ts",
      "apps/desktop/src/ui/features/canvas/use-pan-zoom.ts",
      "apps/desktop/src/ui/features/canvas/use-canvas-point.ts",
      "apps/desktop/src/ui/features/canvas/use-canvas-presence.ts",
      "apps/desktop/src/ui/features/canvas/use-draw-tool.ts",
      "apps/desktop/src/ui/features/canvas/use-free-move.ts",
      "apps/desktop/src/ui/features/canvas/use-frame-resize.ts",
      "apps/desktop/src/ui/features/canvas/use-resize-handles.ts",
      "apps/desktop/src/ui/features/canvas/use-prototype.tsx",
      "apps/desktop/src/ui/features/canvas/use-direction-frames.ts",
      "apps/desktop/src/ui/features/canvas/use-preview-frames.ts",
      "apps/desktop/src/ui/features/canvas/use-variations.ts",
      "apps/desktop/src/ui/features/canvas/use-try-variants.ts",
      "apps/desktop/src/ui/features/canvas/use-link-rects.ts",
      "apps/desktop/src/ui/features/canvas/use-click-through.ts",
      "apps/desktop/src/ui/features/canvas/canvas-frames-model.ts",
      "apps/desktop/src/ui/features/canvas/canvas-variations-model.ts",
      "apps/desktop/src/ui/features/canvas/frame-states-model.ts",
      "apps/desktop/src/ui/features/canvas/drawing-model.ts",
      "apps/desktop/src/ui/features/canvas/vector-tool-model.ts",
      "apps/desktop/src/ui/features/canvas/lofi-frames-model.ts",
      "apps/desktop/src/ui/features/canvas/snap-model.ts",
      "apps/desktop/src/ui/features/canvas/links-api.ts",
      "apps/desktop/src/ui/features/canvas/variations-api.ts",
      "apps/desktop/src/ui/features/canvas/element-mark-model.ts",
      "apps/desktop/src/ui/features/design-system/token-frames.ts",
      "apps/desktop/src/ui/platform/bridge.ts",
      "apps/desktop/src/ui/platform/tip-guard.ts",
      "packages/ui/src/use-popover.ts",
      "packages/ui/src/use-anchored-popover.ts",
      "apps/desktop/src/ui/features/canvas/use-undo-shortcut.ts",
      "apps/desktop/src/ui/features/canvas/use-inline-text-edit.ts",
      "apps/desktop/src/ui/domain/format.ts",
      "apps/desktop/src/ui/platform/use-panel-tab.ts",
      "apps/desktop/src/ui/app/project-nav.ts",
      "apps/desktop/src/ui/domain/markdown-blocks.ts",
      "apps/desktop/src/ui/platform/events.ts",
      "apps/desktop/src/ui/platform/app-status.ts",
      "packages/ui/src/sheet-head.tsx",
      "apps/desktop/src/ui/app/components-panel-host.tsx",
    ],
    rules: Object.fromEntries(
      "anti-slop/no-array-filter-map anti-slop/no-chained-type-assertions anti-slop/no-unknown-returns sonarjs/no-unused-vars eslint/default-case unicorn/prefer-add-event-listener typescript/no-non-null-assertion vitest/require-hook vitest/max-expects anti-slop/no-unsafe-dictionary-type react-doctor/no-side-effect-in-state-updater-function eslint/no-useless-return typescript/no-dynamic-delete anti-slop/no-conditional-empty-object-spread anti-slop/no-known-value-widening anti-slop/no-runtime-typeof anti-slop/no-unknown-parameters anti-slop/require-readable-spacing boundaries/dependencies eslint/complexity eslint/curly eslint/func-style eslint/id-length eslint/max-lines eslint/max-lines-per-function eslint/max-params eslint/max-statements eslint/no-await-in-loop eslint/no-continue eslint/no-magic-numbers eslint/no-nested-ternary eslint/no-plusplus eslint/no-ternary eslint/no-undefined eslint/no-unused-vars eslint/no-use-before-define eslint/no-void eslint/prefer-arrow-callback eslint/prefer-destructuring eslint/prefer-named-capture-group eslint/require-unicode-regexp eslint/sort-keys github/a11y-role-supports-aria-props github/array-foreach github/no-blur github/no-then github/prefer-observers import/consistent-type-specifier-style import/exports-last import/group-exports import/max-dependencies import/no-default-export import/no-relative-parent-imports import/no-unassigned-import jsx-a11y/click-events-have-key-events jsx-a11y/control-has-associated-label jsx-a11y/interactive-supports-focus jsx-a11y/no-autofocus jsx-a11y/no-noninteractive-element-interactions jsx-a11y/no-noninteractive-element-to-interactive-role jsx-a11y/no-static-element-interactions jsx-a11y/prefer-tag-over-role jsx-a11y/role-supports-aria-props promise/always-return promise/catch-or-return promise/prefer-await-to-callbacks promise/prefer-await-to-then promise/prefer-catch react-doctor/async-await-in-loop react-doctor/data-table-requires-accessible-name react-doctor/empty-table-header react-doctor/form-control-requires-name react-doctor/js-combine-iterations react-doctor/js-set-map-lookups react-doctor/no-adjust-state-on-prop-change react-doctor/no-array-index-as-key react-doctor/no-chain-state-updates react-doctor/no-create-object-url-without-revoke react-doctor/no-enter-submit-without-ime-composition-guard react-doctor/no-event-handler react-doctor/no-giant-component react-doctor/no-high-complexity-react-function react-doctor/no-pass-live-state-to-parent react-doctor/no-ref-current-in-render react-doctor/no-reset-all-state-on-prop-change react-doctor/no-unguarded-browser-global-at-module-scope react-doctor/no-unguarded-browser-global-in-render-or-hook-init react-doctor/only-export-components react-doctor/prefer-html-dialog react-doctor/prefer-module-scope-pure-function react-doctor/rendering-conditional-render react-doctor/rerender-state-only-in-handlers react-hooks/exhaustive-deps react-perf/jsx-no-jsx-as-prop react-perf/jsx-no-new-array-as-prop react-perf/jsx-no-new-function-as-prop react-perf/jsx-no-new-object-as-prop react/button-has-type react/exhaustive-effect-dependencies react/forbid-component-props react/function-component-definition react/hook-use-state react/jsx-handler-names react/jsx-max-depth react/jsx-no-literals react/jsx-no-useless-fragment react/jsx-props-no-spreading react/memo-dependencies react/no-array-index-key react/no-multi-comp react/no-unescaped-entities react/only-export-components react/purity react/refs react/set-state-in-effect react/todo sonarjs/elseif-without-else sonarjs/expression-complexity sonarjs/function-name sonarjs/max-lines sonarjs/max-lines-per-function sonarjs/no-duplicate-string sonarjs/no-nested-conditional sonarjs/no-nested-functions sonarjs/no-nested-incdec sonarjs/no-nested-template-literals sonarjs/no-wildcard-import sonarjs/shorthand-property-grouping sonarjs/super-linear-regex studio/no-busy-flag studio/no-dom-query studio/no-feature-interval studio/no-finally-state-reset studio/no-hook-component-import studio/no-inline-copy studio/no-then typescript/explicit-function-return-type typescript/explicit-module-boundary-types unicorn/catch-error-name unicorn/consistent-function-scoping unicorn/explicit-length-check unicorn/no-array-callback-reference unicorn/no-array-for-each unicorn/no-array-reduce unicorn/no-array-reverse unicorn/no-array-sort unicorn/no-nested-ternary unicorn/no-useless-undefined unicorn/prefer-at unicorn/prefer-export-from unicorn/prefer-global-this unicorn/prefer-query-selector unicorn/prefer-spread vitest/prefer-expect-assertions vitest/prefer-strict-equal vitest/prefer-to-be-falsy vitest/prefer-to-be-truthy vitest/require-test-timeout react-doctor/prefer-use-effect-event react/immutability oxc/no-map-spread typescript/no-invalid-void-type typescript/consistent-type-definitions react-doctor/no-barrel-import oxc/no-barrel-file anti-slop/no-shape-in-symbol-names eslint/no-shadow typescript/consistent-type-imports node/no-sync sonarjs/bool-param-default sonarjs/no-unused-function-argument unicorn/prefer-number-coercion react-doctor/no-derived-useState sonarjs/max-union-size react-doctor/effect-needs-cleanup react-doctor/advanced-event-handler-refs promise/avoid-new eslint/no-multi-assign github/a11y-svg-has-accessible-name jsx-a11y/no-interactive-element-to-noninteractive-role unicorn/consistent-existence-index-check unicorn/prefer-array-find eslint/require-await eslint/no-console eslint/no-promise-executor-return github/require-passive-events react-doctor/no-impure-call-at-module-scope react-doctor/rerender-lazy-ref-init sonarjs/no-collapsible-if sonarjs/too-many-break-or-continue-in-loop studio/no-json-cast typescript/method-signature-style typescript/no-import-type-side-effects unicorn/no-lonely-if unicorn/prefer-code-point unicorn/prefer-string-raw unicorn/switch-case-braces vitest/no-conditional-in-test github/filenames-match-regex studio/no-cache-ttl unicorn/filename-case unicorn/prefer-dom-node-append unicorn/prefer-dom-node-dataset unicorn/prefer-number-properties"
        .split(" ")
        .map((rule) => [rule, "warn"])
    ),
  },
  {
    files: ["apps/desktop/src/ui/features/commands/deps.ts"],
    rules: { "import/group-exports": "warn" },
  },
  {
    files: ["apps/desktop/vite.ui.config.ts"],
    rules: { "import/no-relative-parent-imports": "off" },
  },
];
