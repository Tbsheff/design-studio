import path from "node:path";

import { lastName, rule } from "./ast.js";

const BIN_PATH = /node_modules\/\.bin(?:\/|$)/u;

const BIN_SEGMENT = ".bin";

const EMPTY_JSON = new Set(["{}", "[]"]);

const SKIP_WORD = /\bskipped\b/iu;

const WORKSPACE_FOLDER = /^(?:packages|apps)\//u;

const OLD_PATHS = [
  ["cloud", "api"],
  ["cloud", "publish-worker"],
  ["src", "shared", "actions"],
  ["apps", "desktop", "lint"],
  ["src", "ui", "kit"],
];

const OLD_PATH_FORMS = OLD_PATHS.flatMap((parts) => [parts.join("/"), parts.join(String.raw`\/`)]);

const PARENT_PACKAGES = ["../..", "packages/"].join("/");

const PACKAGE_JS = /@design-studio\/[\w/-]+\.js(?:["'`]|$)/u;

const SPECIFIER_CONST = /^const SHARED = "@design-studio\//mu;

const NPM_TEXT = /(?<![\w-])npm (?:install|i|run|ci|exec|test)\b|\bnpx\b/u;

const PLAIN_CORE_FILES = new Set(["http-status", "permissions"]);

const IMPORTS_EFFECT = /from "effect(?:\/[^"]*)?"/u;

const SHIM_SOURCE = /^@design-studio\//u;

const BIN_MESSAGE =
  "A node_modules/.bin path outside the workspace root helper is banned (L5), because node_modules lives at the workspace root and a stale path makes a check pass with no scan. Use toWorkspaceBin from apps/desktop/scripts/workspace-root.ts.";

const EMPTY_OUTPUT_MESSAGE =
  "A JSON.parse of tool output with an empty-object fallback is banned (L5), because a tool that did not run then reads as a clean pass. Use a check on the spawn error, exit status and empty stdout that fails the run, as apps/desktop/scripts/lint-gate.ts does.";

const SKIP_MESSAGE =
  "A check script that skips a rule and still exits 0 is banned (T5), because a stale path then turns the check off. Use a failure with a `fix:` line when a target folder or catalog is missing.";

const ROOT_JOIN_MESSAGE =
  "Joining the app ROOT with a packages/ or apps/ path is banned (L5), because ROOT is apps/desktop and the path does not exist there. Use WORKSPACE_ROOT from apps/desktop/scripts/workspace-root.ts.";

const OLD_PATH_MESSAGE =
  "An old layout path, in plain or escaped form, is banned in lint/ and scripts/ (W11), because a rule with an old path never fires. Use the path from the workspace root: packages/common/actions/src, apps/api, apps/publish, lint.";

const JS_SPECIFIER_MESSAGE =
  "A .js suffix on a @design-studio package specifier is banned (N2), because the exports map has no such key. Use the specifier with no suffix, such as @design-studio/actions/project/routes.";

const SHIM_FILE_MESSAGE =
  "A file that only forwards a @design-studio package is banned (N7a, U14), because it adds a second name for one module. Use the package specifier in each caller and delete the file.";

const PLAIN_CORE_MESSAGE =
  "An effect-free module in packages/common/actions/src/_core is banned (W3, U3), because _core holds only the action core. Use packages/common/contracts/src/<name>.ts for plain shared code, or actions/<domain>/schema.ts for a domain payload.";

const NPM_MESSAGE =
  "npm or npx in tooling text is banned, because this workspace uses pnpm. Use `pnpm install`, `pnpm run`, `pnpm exec` or `pnpm dlx`.";

const textOf = (node) => {
  if (node.regex) {
    return node.regex.pattern;
  }

  if (node.value === String(node.value)) {
    return node.value;
  }

  return null;
};

const reportLiteral = (context, node, test, message) => {
  const text = textOf(node);

  if (text !== null && test(text)) {
    context.report({ message, node });
  }
};

const textRule = (test, message) =>
  rule((context) => ({
    Literal: (node) => reportLiteral(context, node, test, message),
    TemplateElement: (node) => {
      if (test(node.value.raw)) {
        context.report({ message, node });
      }
    },
  }));

const noStaleBinPath = textRule(
  (text) => BIN_PATH.test(text) || text === BIN_SEGMENT,
  BIN_MESSAGE
);

const noNpmText = textRule((text) => NPM_TEXT.test(text), NPM_MESSAGE);

const noSilentSkip = textRule((text) => SKIP_WORD.test(text), SKIP_MESSAGE);

const isOldPath = (text) =>
  OLD_PATH_FORMS.some((form) => text.includes(form)) || text.includes(PARENT_PACKAGES);

const noOldPathForm = textRule((text) => isOldPath(text), OLD_PATH_MESSAGE);

const isToolOutput = (node) => node.type === "MemberExpression" && lastName(node) === "stdout";

const isEmptyFallback = (node) =>
  node.type === "LogicalExpression" &&
  isToolOutput(node.left) &&
  node.right.type === "Literal" &&
  EMPTY_JSON.has(String(node.right.value));

const isJsonParse = (node) =>
  node.callee.type === "MemberExpression" &&
  node.callee.object.type === "Identifier" &&
  node.callee.object.name === "JSON" &&
  lastName(node.callee) === "parse";

const noEmptyOutputFallback = rule((context) => ({
  CallExpression: (node) => {
    const [first = null] = node.arguments;

    if (isJsonParse(node) && first !== null && isEmptyFallback(first)) {
      context.report({ message: EMPTY_OUTPUT_MESSAGE, node });
    }
  },
}));

const isRootJoin = (node) => {
  const [first = null, second = null] = node.arguments;

  if (first?.type !== "Identifier" || first.name.toUpperCase() !== "ROOT") {
    return false;
  }

  return second?.type === "Literal" && WORKSPACE_FOLDER.test(String(second.value));
};

const isPathCall = (node) => ["join", "resolve"].includes(lastName(node.callee));

const toFileText = (context) => context.sourceCode.text;

const noAppRootJoin = rule((context) => ({
  CallExpression: (node) => {
    if (isPathCall(node) && isRootJoin(node) && !toFileText(context).includes("WORKSPACE_ROOT")) {
      context.report({ message: ROOT_JOIN_MESSAGE, node });
    }
  },
}));

const isSharedTemplate = (node, context) => {
  const [first = null] = node.expressions;

  return first?.type === "Identifier" && first.name === "SHARED" && SPECIFIER_CONST.test(toFileText(context));
};

const noPackageJsSuffix = rule((context) => ({
  Literal: (node) => reportLiteral(context, node, (text) => PACKAGE_JS.test(text), JS_SPECIFIER_MESSAGE),
  TemplateLiteral: (node) => {
    const isSuffixed = node.quasis.some((quasi) => /\.js["']?$/u.test(quasi.value.raw));

    if (isSuffixed && isSharedTemplate(node, context)) {
      context.report({ message: JS_SPECIFIER_MESSAGE, node });
    }
  },
}));

const isForwardStatement = (statement) =>
  statement.type === "ExportNamedDeclaration" &&
  statement.source !== null &&
  SHIM_SOURCE.test(String(statement.source.value));

const isForwardAll = (statement) =>
  statement.type === "ExportAllDeclaration" && SHIM_SOURCE.test(String(statement.source.value));

const isForward = (statement) => isForwardStatement(statement) || isForwardAll(statement);

const noPackageForwardShim = rule((context) => ({
  Program: (program) => {
    if (program.body.length > 0 && program.body.every((statement) => isForward(statement))) {
      context.report({ message: SHIM_FILE_MESSAGE, node: program });
    }
  },
}));

const noPlainCoreModule = rule((context) => ({
  Program: (program) => {
    const stem = path.basename(context.filename, ".ts");

    if (!PLAIN_CORE_FILES.has(stem) && !IMPORTS_EFFECT.test(toFileText(context))) {
      context.report({ message: PLAIN_CORE_MESSAGE, node: program });
    }
  },
}));

export {
  noAppRootJoin,
  noEmptyOutputFallback,
  noNpmText,
  noOldPathForm,
  noPackageForwardShim,
  noPackageJsSuffix,
  noPlainCoreModule,
  noSilentSkip,
  noStaleBinPath,
};
