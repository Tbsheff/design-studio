import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { rule } from "./ast.js";
import { relativeOf } from "./facts.js";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));

const DOM_PROJECTS = [
  { project: "tsconfig.server-probe.json", suffix: ".probe.ts" },
  { project: "tsconfig.desktop-renderer.json", suffix: ".renderer.ts" },
];

const TYPECHECK_SCRIPTS = ["typecheck", "typecheck:tsrs"];

const FUNCTION_TYPES = new Set([
  "ArrowFunctionExpression",
  "FunctionDeclaration",
  "FunctionExpression",
]);

const WIRED_MESSAGE =
  "A *.probe.ts or *.renderer.ts file outside a DOM project that the typecheck scripts run is banned, because then no check sees its DOM code. Use the include list of tsconfig.server-probe.json or tsconfig.desktop-renderer.json, and run that project in the typecheck and typecheck:tsrs scripts of package.json.";

const PROBE_MESSAGE =
  "A *.probe.ts file with no in-page function is banned (S7c), because a string or String.raw source needs no DOM types. Use a typed TS function that the page runs, from a file that the lib ES2023 dry run flags; keep string sources in the parent file.";

const RENDERER_MESSAGE =
  "A *.renderer.ts file with no in-page function is banned, because a stub with only a name const checks nothing. Use a *.renderer.ts file only for a typed function that the page runs, and delete the stub.";

const SHIM_MESSAGE =
  "Serializing a function into page code without the __name shim is banned, because esbuild keepNames and tsx add __name calls that do not exist in the page. Use an IIFE that declares `const __name = (target) => target;` before it calls the function, as scanExpression in src/server/export/page-scan.ts does.";

const FUNCTION_NAME = /^[a-z]/u;

const cache = new Map();

const parseJson = (relative) => {
  try {
    const text = readFileSync(path.join(ROOT, relative), "utf-8");

    return JSON.parse(text);
  } catch {
    return null;
  }
};

const readJson = (relative) => {
  if (!cache.has(relative)) {
    cache.set(relative, parseJson(relative));
  }

  return cache.get(relative);
};

const isScriptWired = (project) => {
  const scripts = readJson("package.json")?.scripts ?? {};

  return TYPECHECK_SCRIPTS.every((name) => String(scripts[name] ?? "").includes(project));
};

const isIncluded = (project, relative) => {
  const include = readJson(project)?.include ?? [];

  return include.includes(relative);
};

const domProjectWired = rule((context) => ({
  Program: (program) => {
    const relative = relativeOf(context.filename);
    const owner = DOM_PROJECTS.find(({ suffix }) => relative.endsWith(suffix)) ?? null;

    if (owner === null) {
      return;
    }

    if (!isScriptWired(owner.project) || !isIncluded(owner.project, relative)) {
      context.report({ message: WIRED_MESSAGE, node: program });
    }
  },
}));

const isFunctionInit = (declarator) => FUNCTION_TYPES.has(declarator.init?.type ?? "");

const declaresFunction = (node) => {
  if (node.type === "ExportNamedDeclaration" && node.declaration !== null) {
    return declaresFunction(node.declaration);
  }

  if (node.type === "FunctionDeclaration") {
    return true;
  }

  return node.type === "VariableDeclaration" && node.declarations.some(isFunctionInit);
};

const requireFunction = (message) =>
  rule((context) => ({
    Program: (program) => {
      if (!program.body.some(declaresFunction)) {
        context.report({ message, node: program });
      }
    },
  }));

const probeHasFunction = requireFunction(PROBE_MESSAGE);

const rendererHasFunction = requireFunction(RENDERER_MESSAGE);

const isCalledSlot = (quasis, index) =>
  quasis[index].value.raw.endsWith("(") && quasis[index + 1].value.raw.startsWith(")(");

const isFunctionText = (expression) =>
  expression.type === "CallExpression" &&
  expression.callee.type === "MemberExpression" &&
  expression.callee.property.name === "toString";

const isSerializedSlot = (template, index) => {
  const expression = template.expressions[index];

  if (!isCalledSlot(template.quasis, index)) {
    return false;
  }

  if (isFunctionText(expression)) {
    return true;
  }

  return expression.type === "Identifier" && FUNCTION_NAME.test(expression.name);
};

const hasNameShim = (template) =>
  template.quasis.some((quasi) => quasi.value.raw.includes("const __name"));

const serializedFnNameShim = rule((context) => ({
  TemplateLiteral: (node) => {
    const slots = node.expressions.map((_expression, index) => index);
    const serialized = slots.filter((index) => isSerializedSlot(node, index));

    if (serialized.length > 0 && !hasNameShim(node)) {
      context.report({ message: SHIM_MESSAGE, node });
    }
  },
}));

export { domProjectWired, probeHasFunction, rendererHasFunction, serializedFnNameShim };
