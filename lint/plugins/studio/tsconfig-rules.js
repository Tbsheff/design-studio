import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { rule } from "./ast.js";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));

const BASE = "tsconfig.base.json";

const SOLUTION = "tsconfig.json";

const TSRS_RUNNER = "scripts/typecheck-tsrs.ts";

const TSCONFIG_NAME = /^(?:\.\/)?tsconfig(?:\.[\w-]+)?\.json$/u;

const DOM_LIB = /^dom/iu;

const GLOB_CHARS = /[*?{[]/u;

const SOLUTION_PATHS = new Set([".", "./", SOLUTION, `./${SOLUTION}`]);

const FLAG_VALUES = new Set(["false", "true"]);

const NODE_DOM_PROJECTS = new Set(["tsconfig.server.json", "tsconfig.ui-test.json"]);

const LIST_MESSAGE =
  "A hand-copied list of tsconfig project names is banned (W11), because a new reference in tsconfig.json then skips this list. Use toTsconfigProjects from scripts/tsconfig-projects.ts, which reads the references of tsconfig.json.";

const WIRED_MESSAGE =
  "A typecheck script that does not cover every reference of tsconfig.json is banned (W11). Use `tsc -b tsconfig.json` (or `--build .`) for typecheck and `tsx scripts/typecheck-tsrs.ts` for typecheck:tsrs in package.json, and list only existing files in the references of tsconfig.json.";

const LEAF_MESSAGE =
  "A leaf tsconfig key or include entry that repeats what tsconfig.base.json or another include glob already gives is banned, because then the base is not the one owner. Use only the keys that differ from tsconfig.base.json, and remove the include entry that another glob covers.";

const DOM_MESSAGE =
  "DOM types in a Node project, or Node types in the bridge project, are banned, because then tsc cannot catch a DOM global in server code or a Node API in the browser bundle. Use DOM only in the ui, ui-test, bridge, server-probe and desktop-renderer projects, keep it out of tsconfig.base.json, and give the src/bridge project `types: []`.";

const cache = new Map();

const parseJson = (relative) => {
  try {
    return JSON.parse(readFileSync(path.join(ROOT, relative), "utf-8"));
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

const toReferences = () =>
  (readJson(SOLUTION)?.references ?? []).map(({ path: referenced }) =>
    path.normalize(String(referenced))
  );

const toTokens = (script) => String(script ?? "").split(/\s+/u).filter(Boolean);

const isBuildFlag = (token) => token === "-b" || token === "--build";

const toPositionals = (tokens) =>
  tokens.filter((token) => !token.startsWith("-") && !FLAG_VALUES.has(token));

const isSolutionBuilt = (script) => {
  const tokens = toTokens(script);
  const start = tokens.indexOf("tsc");

  if (start === -1) {
    return false;
  }

  const rest = tokens.slice(start + 1);

  if (!rest.some((token) => isBuildFlag(token))) {
    return false;
  }

  return toPositionals(rest).every((token) => SOLUTION_PATHS.has(token));
};

const isTsrsLooped = (script) => toTokens(script).includes(TSRS_RUNNER);

const isReferenced = (project) => toReferences().includes(path.normalize(project));

const toScripts = () => readJson("package.json")?.scripts ?? {};

const isTypecheckWired = () => {
  const scripts = toScripts();

  if (!isSolutionBuilt(scripts.typecheck) || !isTsrsLooped(scripts["typecheck:tsrs"])) {
    return false;
  }

  return toReferences().every((project) => existsSync(path.join(ROOT, project)));
};

const isSameValue = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const toRepeatedKeys = (project) => {
  const options = readJson(project)?.compilerOptions ?? {};
  const baseOptions = readJson(BASE)?.compilerOptions ?? {};

  return Object.keys(options).filter(
    (key) => Object.hasOwn(baseOptions, key) && isSameValue(options[key], baseOptions[key])
  );
};

const isCoveredBy = (entry, other) => {
  if (entry === other) {
    return false;
  }

  if (!GLOB_CHARS.test(other)) {
    return entry.startsWith(`${other}/`);
  }

  return path.matchesGlob(entry, other);
};

const toCoveredIncludes = (project) => {
  const include = readJson(project)?.include ?? [];

  return include.filter((entry) => include.some((other) => isCoveredBy(entry, other)));
};

const toOption = (project, key) => {
  const own = readJson(project)?.compilerOptions ?? {};

  if (Object.hasOwn(own, key)) {
    return own[key];
  }

  return readJson(BASE)?.compilerOptions?.[key] ?? [];
};

const hasDom = (lib) => lib.some((entry) => DOM_LIB.test(String(entry)));

const hasNodeTypes = (project) => toOption(project, "types").includes("node");

const isBridgeProject = (project) =>
  (readJson(project)?.include ?? []).some((entry) => String(entry).startsWith("src/bridge"));

const isDomMisplaced = (project) => {
  if (!hasNodeTypes(project)) {
    return false;
  }

  if (isBridgeProject(project)) {
    return true;
  }

  return hasDom(toOption(project, "lib")) && !NODE_DOM_PROJECTS.has(project);
};

const toDomFindings = () => {
  const findings = toReferences().filter((project) => isDomMisplaced(project));

  if (hasDom(readJson(BASE)?.compilerOptions?.lib ?? [])) {
    findings.push(BASE);
  }

  return findings;
};

const toLeafFindingsOf = (project) => {
  const keys = toRepeatedKeys(project).map((key) => `${project} compilerOptions.${key}`);
  const includes = toCoveredIncludes(project).map((entry) => `${project} include ${entry}`);

  return [...keys, ...includes];
};

const toLeafFindings = () => toReferences().flatMap((project) => toLeafFindingsOf(project));

const reportEach = (context, node, message, findings) => {
  for (const finding of findings) {
    context.report({ message: `${message} Found: ${finding}.`, node });
  }
};

const typecheckWired = rule((context) => ({
  Program: (program) => {
    if (!isTypecheckWired()) {
      context.report({ message: WIRED_MESSAGE, node: program });
    }
  },
}));

const tsconfigLeafMinimal = rule((context) => ({
  Program: (program) => reportEach(context, program, LEAF_MESSAGE, toLeafFindings()),
}));

const tsconfigDomLib = rule((context) => ({
  Program: (program) => reportEach(context, program, DOM_MESSAGE, toDomFindings()),
}));

const isProjectName = (element) =>
  element?.type === "Literal" && TSCONFIG_NAME.test(String(element.value));

const noTsconfigList = rule((context) => ({
  ArrayExpression: (node) => {
    if (node.elements.filter((element) => isProjectName(element)).length > 1) {
      context.report({ message: LIST_MESSAGE, node });
    }
  },
}));

export {
  isReferenced,
  isSolutionBuilt,
  isTsrsLooped,
  noTsconfigList,
  readJson,
  tsconfigDomLib,
  tsconfigLeafMinimal,
  typecheckWired,
};
