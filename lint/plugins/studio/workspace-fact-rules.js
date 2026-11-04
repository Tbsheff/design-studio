import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { rule } from "./ast.js";
import { relativeOf, sourceOf } from "./facts.js";
import { isChanged } from "./freeze-rules.js";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));

const SOLUTION = "tsconfig.json";

const GATE_FILE = "apps/desktop/scripts/lint-gate.ts";

const LINT_CONFIG = "oxlint.config.ts";

const BOUNDARIES_FILE = "lint/boundaries.ts";

const RESOLVER_FILE = "lint/ts-resolver.cjs";

const DOC_FILES = ["docs/patterns.md", "CONTRIBUTING.md"];

const MD_LINK = /\]\((?<target>[^)#\s]+)(?:#[^)]*)?\)/gu;

const EXTERNAL_LINK = /^[a-z][a-z+-]*:/u;

const PACKAGE_SPECIFIER = /^@design-studio\/(?<name>[a-z-]+)(?<tail>\/.+)?$/u;

const IGNORED_FOLDER = /"(?:apps\/(?:api|publish)|packages)(?:\/\*\*)?"/u;

const TSX_BIN = path.join(ROOT, "node_modules/.bin/tsx");

const GENERATED_HEADER = "// @generated";

const CHECK_BUFFER = 16_777_216;

const EXPORT_WILDCARD_MESSAGE =
  "A wildcard or .js key in a package exports map is banned (N7, W13), because it makes every file public. Use named entries: pnpm run gen:routes writes them for actions and contracts.";

const EXPORT_MISSING_MESSAGE =
  "A @design-studio specifier that is not in the package exports map is banned (W13). Use a named entry from the package.json exports: pnpm run gen:routes adds a new file.";

const APP_CONFIG_MESSAGE =
  "A package tsconfig that extends a file in apps/ is banned (N7), because a package must not depend on an app. Use tsconfig.base.json at the workspace root.";

const TYPECHECK_MESSAGE =
  "A package typecheck script, or a package with no reference in the root tsconfig.json, is banned (W11b). Use a reference in the root tsconfig.json so `pnpm run typecheck` covers the package.";

const ELEMENT_MESSAGE =
  "A workspace package with no boundaries element or no ts-resolver mapping is banned (W13), because layer rules then cannot see its imports. Use an element in lint/boundaries.ts and the package folder in lint/ts-resolver.cjs.";

const COVERAGE_MESSAGE =
  "An app or package folder that the lint run ignores, or a package with no budget-0 entry, is banned (L5, W15). Use the workspace-root oxlint.config.ts with no ignore for it, and list each package src folder in BUDGET_ZERO in apps/desktop/scripts/lint-gate.ts.";

const ROOT_CONFIG_MESSAGE =
  "packageManager, allowScripts or a pnpm-lock.yaml in an app folder is banned, because pnpm reads them only at the workspace root. Use the root package.json and the root pnpm-lock.yaml.";

const DOC_LINK_MESSAGE =
  "A relative markdown link that resolves to no file is banned (docs/patterns), because an agent that copies a golden file finds nothing. Use a link to the file under apps/desktop/src or packages/common/actions/src.";

const GENERATED_MESSAGE =
  "A generated file that differs from the generator output is banned (W11). Use `pnpm exec tsx scripts/gen-routes.ts` from apps/desktop, never a text replace.";

const GENERATED_RUN_MESSAGE =
  "A gen-routes --check run that did not finish is banned (W11), because a crash must not read as fresh. Use `pnpm exec tsx scripts/gen-routes.ts --check` from apps/desktop and fix the error.";

const LEGACY_BUDGET_FOLDERS = new Set(["packages/common/contracts"]);

const STALE_LINE = "is stale or edited by hand";

const RUN_TEXT_LIMIT = 200;

const cache = { generated: null, packages: null };

const readJson = (relative) => {
  try {
    return JSON.parse(readFileSync(path.join(ROOT, relative), "utf-8"));
  } catch {
    return null;
  }
};

const toFolders = (parent) =>
  readdirSync(path.join(ROOT, parent), { withFileTypes: true }).flatMap((entry) => {
    if (!entry.isDirectory()) {
      return [];
    }

    return [`${parent}/${entry.name}`];
  });

const toPackageFolders = () => {
  if (cache.packages !== null) {
    return cache.packages;
  }

  cache.packages = ["packages/ui", ...toFolders("packages/common")];

  return cache.packages;
};

const toExportKeys = (folder) => Object.keys(readJson(`${folder}/package.json`)?.exports ?? {});

const reportEach = (context, node, message, findings) => {
  for (const finding of findings) {
    context.report({ message: `${message} Found: ${finding}.`, node });
  }
};

const programRule = (toFindings, message) =>
  rule((context) => ({
    Program: (program) => reportEach(context, program, message, toFindings()),
  }));

const isWildcardKey = (key) => key.includes("*") || key.endsWith(".js");

const toWildcardFindings = () =>
  toPackageFolders().flatMap((folder) =>
    toExportKeys(folder).flatMap((key) => {
      if (!isWildcardKey(key)) {
        return [];
      }

      return [`${folder} ${key}`];
    })
  );

const packageExportNamed = programRule(toWildcardFindings, EXPORT_WILDCARD_MESSAGE);

const toAppConfigFindings = () =>
  toPackageFolders().filter((folder) => {
    const extended = String(readJson(`${folder}/tsconfig.json`)?.extends ?? "");

    return path.normalize(path.join(folder, extended)).startsWith("apps/");
  });

const packageNoAppConfig = programRule(toAppConfigFindings, APP_CONFIG_MESSAGE);

const toReferenced = () =>
  new Set((readJson(SOLUTION)?.references ?? []).map((reference) => path.normalize(reference.path)));

const toTypecheckFindings = () => {
  const referenced = toReferenced();

  return toPackageFolders().filter((folder) => {
    const scripts = readJson(`${folder}/package.json`)?.scripts ?? {};

    return "typecheck" in scripts || !referenced.has(`${folder}/tsconfig.json`);
  });
};

const packageTypecheckReference = programRule(toTypecheckFindings, TYPECHECK_MESSAGE);

const toElementFindings = () => {
  const boundaries = sourceOf(BOUNDARIES_FILE) ?? "";
  const resolver = sourceOf(RESOLVER_FILE) ?? "";

  return toPackageFolders().filter(
    (folder) => !boundaries.includes(`"${folder}"`) || !resolver.includes(`"${folder}"`)
  );
};

const boundaryPackageElement = programRule(toElementFindings, ELEMENT_MESSAGE);

const toCoverageFindings = () => {
  const findings = [];

  if (IGNORED_FOLDER.test(sourceOf(LINT_CONFIG) ?? "")) {
    findings.push(`${LINT_CONFIG} ignores an app or package`);
  }

  const gate = sourceOf(GATE_FILE) ?? "";

  for (const folder of toPackageFolders()) {
    if (!LEGACY_BUDGET_FOLDERS.has(folder) && !gate.includes(`"${folder}/src/"`)) {
      findings.push(`${GATE_FILE} has no ${folder}/src/`);
    }
  }

  return findings;
};

const lintCoversWorkspace = programRule(toCoverageFindings, COVERAGE_MESSAGE);

const toRootConfigFindings = () =>
  toFolders("apps").flatMap((folder) => {
    const manifest = readJson(`${folder}/package.json`) ?? {};
    const keys = ["packageManager", "allowScripts"].filter((key) => key in manifest);
    const locks = ["pnpm-lock.yaml"].filter((file) => existsSync(path.join(ROOT, folder, file)));

    return [...keys, ...locks].map((name) => `${folder} ${name}`);
  });

const rootPackageConfig = programRule(toRootConfigFindings, ROOT_CONFIG_MESSAGE);

const toDeadLinks = (doc) => {
  const text = readFileSync(path.join(ROOT, doc), "utf-8");
  const folder = path.dirname(path.join(ROOT, doc));

  return [...text.matchAll(MD_LINK)].flatMap(({ groups: { target } }) => {
    if (EXTERNAL_LINK.test(target) || existsSync(path.join(folder, target))) {
      return [];
    }

    return [`${doc} ${target}`];
  });
};

const docsLinkResolves = programRule(() => DOC_FILES.flatMap((doc) => toDeadLinks(doc)), DOC_LINK_MESSAGE);

const toExportSet = (name) => {
  const folder = toPackageFolders().find((candidate) => path.basename(candidate) === name) ?? null;

  if (folder === null) {
    return null;
  }

  return new Set(toExportKeys(folder));
};

const exportSets = new Map();

const exportSetOf = (name) => {
  if (!exportSets.has(name)) {
    exportSets.set(name, toExportSet(name));
  }

  return exportSets.get(name);
};

const isExported = (source) => {
  const found = PACKAGE_SPECIFIER.exec(source);

  if (found === null) {
    return true;
  }

  const keys = exportSetOf(found.groups.name);

  return keys === null || keys.has(`.${found.groups.tail ?? ""}`);
};

const checkSource = (context, source) => {
  if (source?.type === "Literal" && !isExported(String(source.value))) {
    context.report({ message: `${EXPORT_MISSING_MESSAGE} Found: ${source.value}.`, node: source });
  }
};

const packageExportSpecifier = rule((context) => ({
  ExportAllDeclaration: (node) => checkSource(context, node.source),
  ExportNamedDeclaration: (node) => checkSource(context, node.source),
  ImportDeclaration: (node) => checkSource(context, node.source),
  ImportExpression: (node) => checkSource(context, node.source),
}));

const toStaleText = () => {
  if (cache.generated === null) {
    try {
      execFileSync(TSX_BIN, ["apps/desktop/scripts/gen-routes.ts", "--check"], {
        cwd: ROOT,
        encoding: "utf-8",
        maxBuffer: CHECK_BUFFER,
        stdio: ["ignore", "pipe", "pipe"],
      });
      cache.generated = "";
    } catch (error) {
      cache.generated = String(error.stderr ?? error.message);
    }
  }

  return cache.generated;
};

const generatedFresh = rule((context) => ({
  Program: (program) => {
    const relative = relativeOf(context.filename);

    if (!(sourceOf(relative) ?? "").startsWith(GENERATED_HEADER) || !isChanged(relative)) {
      return;
    }

    const output = toStaleText();

    if (output.includes(`${relative} is stale`)) {
      context.report({ message: GENERATED_MESSAGE, node: program });

      return;
    }

    if (output !== "" && !output.includes(STALE_LINE)) {
      context.report({ message: `${GENERATED_RUN_MESSAGE} Found: ${output.slice(0, RUN_TEXT_LIMIT)}.`, node: program });
    }
  },
}));

export {
  boundaryPackageElement,
  docsLinkResolves,
  generatedFresh,
  lintCoversWorkspace,
  packageExportNamed,
  packageExportSpecifier,
  packageNoAppConfig,
  packageTypecheckReference,
  rootPackageConfig,
};
