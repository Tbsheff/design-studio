import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { rule } from "./ast.js";
import { relativeOf } from "./facts.js";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));

const OWNER_FILE = "src/server/platform/ts-compiler/index.ts";

const COMPILER_SOURCE = /^typescript(?:-api)?(?:\/|$)/u;

const BARE_SOURCE = /^typescript(?:\/|$)/u;

const EXACT_PIN = /^(?:npm:typescript@)?\d+\.\d+\.\d+$/u;

const MANIFESTS = ["package.json", "../api/package.json"];

const PINNED = ["typescript", "typescript-api"];

const DEPENDENCY_FIELDS = ["dependencies", "devDependencies"];

const OWNER_MESSAGE =
  "A value import, import() or require of \"typescript-api\" outside the compiler owner is banned, because each extra loader or version read must be found and changed on the next compiler swap, and a cache key from another copy goes stale. Use loadTypeScript from src/server/platform/ts-compiler/index.ts and read .version from the module it returns, and import only types from \"typescript-api\".";

const BARE_MESSAGE =
  "The bare \"typescript\" specifier (also \"typescript/package.json\") is banned, because \"typescript\" is TS 7, which has no JS compiler API, and its version is not the version of the compiler that runs. Use import type from \"typescript-api\", and loadTypeScript from src/server/platform/ts-compiler/index.ts with .version from the module it returns.";

const PIN_MESSAGE =
  "A range for \"typescript\" or \"typescript-api\" in package.json or apps/api/package.json is banned, because a minor compiler release changes the diagnostics that typecheck-diff baselines and the route-graph cache key depend on. Use an exact version such as \"7.0.2\" or \"npm:typescript@6.0.3\" in package.json.";

const DRIFT_MESSAGE =
  "A compiler API pin in .pnpmfile.mjs that differs from the \"typescript-api\" pin in package.json is banned, because then the lint toolchain loads a different compiler than the app. Use the same \"npm:typescript@x.y.z\" value in .pnpmfile.mjs COMPILER_API and package.json devDependencies.typescript-api.";

const HOOK_PIN = /"(?<pin>npm:typescript@[^"]+)"/u;

const readHookPin = async () => {
  try {
    const text = await readFile(path.join(ROOT, ".pnpmfile.mjs"), "utf-8");

    return HOOK_PIN.exec(text)?.groups.pin ?? null;
  } catch {
    return null;
  }
};

const parseManifest = async (relative) => {
  try {
    return JSON.parse(await readFile(path.join(ROOT, relative), "utf-8"));
  } catch {
    return null;
  }
};

const manifests = new Map(
  await Promise.all(MANIFESTS.map(async (relative) => [relative, await parseManifest(relative)]))
);

const hookPin = await readHookPin();

const apiPinOf = () => {
  const manifest = manifests.get("package.json") ?? {};

  return manifest.devDependencies?.["typescript-api"] ?? manifest.dependencies?.["typescript-api"] ?? null;
};

const loosePinsOf = (relative) => {
  const manifest = manifests.get(relative) ?? {};
  const loose = [];

  for (const field of DEPENDENCY_FIELDS) {
    const deps = manifest[field] ?? {};

    for (const name of PINNED) {
      const version = deps[name] ?? null;

      if (version !== null && !EXACT_PIN.test(String(version))) {
        loose.push(`${relative} ${field}.${name}: ${version}`);
      }
    }
  }

  return loose;
};

const literalSource = (node) => {
  if (node && node.type === "Literal" && node.value === String(node.value)) {
    return node.value;
  }

  return null;
};

const isTypeOnlyImport = (node) => {
  if (node.importKind === "type") {
    return true;
  }

  const specifiers = node.specifiers ?? [];

  return specifiers.length > 0 && specifiers.every((specifier) => specifier.importKind === "type");
};

const isRequireCallee = (callee) => {
  if (callee.type === "Identifier") {
    return callee.name === "require";
  }

  if (callee.type === "MemberExpression") {
    return callee.object.type === "Identifier" && callee.object.name === "require";
  }

  return callee.type === "CallExpression";
};

const checkSource = (context, node, isTypeOnly) => {
  const source = literalSource(node);

  if (source === null || !COMPILER_SOURCE.test(source)) {
    return;
  }

  if (BARE_SOURCE.test(source)) {
    context.report({ message: BARE_MESSAGE, node });

    return;
  }

  if (!isTypeOnly && relativeOf(context.filename) !== OWNER_FILE) {
    context.report({ message: OWNER_MESSAGE, node });
  }
};

const tsCompilerOwner = rule((context) => ({
  CallExpression: (node) => {
    if (isRequireCallee(node.callee)) {
      checkSource(context, node.arguments[0] ?? null, false);
    }
  },
  ExportAllDeclaration: (node) => {
    checkSource(context, node.source, node.exportKind === "type");
  },
  ExportNamedDeclaration: (node) => {
    checkSource(context, node.source, node.exportKind === "type");
  },
  ImportDeclaration: (node) => {
    checkSource(context, node.source, isTypeOnlyImport(node));
  },
  ImportExpression: (node) => {
    checkSource(context, node.source, false);
  },
  TSImportType: (node) => {
    checkSource(context, node.argument?.literal ?? node.argument, true);
  },
}));

const exactCompilerPin = rule((context) => ({
  Program: (program) => {
    const loose = MANIFESTS.flatMap((relative) => loosePinsOf(relative));

    if (loose.length > 0) {
      context.report({ message: `${PIN_MESSAGE} Found: ${loose.join("; ")}.`, node: program });
    }

    if (hookPin !== null && hookPin !== apiPinOf()) {
      context.report({ message: `${DRIFT_MESSAGE} Found: ${hookPin}.`, node: program });
    }
  },
}));

export { exactCompilerPin, tsCompilerOwner };
