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
    "Off in *.config.ts: the tools load a default export.",
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
      "src/ui/platform/session.ts",
      "src/server/project-source/source.ts",
      "src/server/run-log/run-list.ts",
      SERVER_MAIN,
      "src/server/direct-edit/change-feed.ts",
      "src/server/direct-edit/planned-feed.ts",
      "src/server/git/user-git.ts",
      "src/server/preview/{ports,render-contract,render-wait}.ts",
      "src/server/store/data-lock.ts",
      "src/server/store/default-folder.ts",
      "src/server/store/events.ts",
      "src/server/store/git-objects.ts",
      "src/server/store/mutex.ts",
      "src/server/store/starters.ts",
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
      "src/server/mcp/legacy/comment-actions.ts",
      "src/server/mcp/legacy/comments-result.ts",
      "src/server/mcp/legacy/comments-schema.ts",
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
      "src/server/mcp/legacy/share.ts",
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
      "src/server/mcp/legacy/comments-result.ts",
      "src/server/mcp/legacy/comments-schema.ts",
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
      "src/server/agent/legacy/agent-ops.ts",
      "src/server/agent/legacy/direct-edit.ts",
    ],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: [
      "src/server/agent/icon-tool.ts",
      "src/server/http/icon-routes.ts",
      "src/server/icons/deps.ts",
      "src/server/mcp/icon-tools.ts",
      "src/server/mcp/text-style-tools.ts",
      "src/server/agent/text-style-tool.ts",
      "src/server/text-styles/deps.ts",
      "src/server/mcp/motion-tools.ts",
      "src/server/agent/motion-tool.ts",
      "src/server/motion/deps.ts",
      "src/server/mcp/fill-tools.ts",
      "src/server/agent/fill-tool.ts",
      "src/server/fill/deps.ts",
      "src/server/mcp/copy-code-tools.ts",
      "src/server/agent/copy-code-tool.ts",
      "src/server/export/copy-handler.ts",
      "src/server/export/copy-react.ts",
      "src/server/http/text-style-routes.ts",
      "src/ui/features/icons/deps.ts",
      "src/ui/features/text-styles/deps.ts",
      "src/server/http/motion-routes.ts",
      "src/ui/features/motion/deps.ts",
      "src/server/http/fill-routes.ts",
      "src/ui/features/fill/deps.ts",
    ],
    rules: { "import/no-relative-parent-imports": "off" },
  },
  {
    files: [
      "src/server/mcp/legacy/frame-target.ts",
      "src/shared/run-target.ts",
    ],
    rules: { "eslint/id-length": "off" },
  },
  {
    files: ["src/server/app/index.ts"],
    rules: { "oxc/no-barrel-file": "off" },
  },
  {
    files: [
      "src/server/design-system/model/index.ts",
      "src/server/design-system/ops/index.ts",
    ],
    rules: { "import/no-relative-parent-imports": "off" },
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
  { files: ["*.config.ts"], rules: { "import/no-default-export": "off" } },
  {
    files: ["src/shared/contract/**", "src/server/**", "cloud/api/**"],
    rules: { "unicorn/throw-new-error": "off" },
  },
  {
    files: [
      "**/*.generated.ts",
      "src/shared/contract/*/index.ts",
      "src/shared/contract/*/routes.ts",
      "src/server/services/*/handlers.ts",
    ],
    rules: { "import/max-dependencies": "off", "max-lines": "off" },
  },
];
