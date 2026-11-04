import { statSync } from "node:fs";
import path from "node:path";

import { rule } from "./ast.js";
import { relativeOf } from "./facts.js";

const SOURCE_EXTENSIONS = [".ts", ".tsx", ".d.ts", ".js", ".jsx", ".mjs", ".cjs"];

const INDEX_FILES = ["index.ts", "index.tsx", "index.js"];

const TS_FILE = /\.(?:ts|tsx|mts|cts)$/u;

const JS_TAIL = /\.(?:js|mjs|cjs|jsx)$/u;

const ASSET_TAIL = /\.(?:css|json|svg|png|jpe?g|gif|webp|woff2?|html|md|txt|wasm)$/u;

const PLATFORM = "apps/api/src/platform/";

const PLATFORM_ALLOWED = /^(?:cloud\/api\/src\/platform\/|cloud\/api\/src\/shared-actions\.(?:js|ts)$|src\/shared\/)/u;

const HOOK_FILE = /^use-[a-z0-9-]+\.ts$/u;

const RESOLVE_MESSAGE =
  "A relative import that does not resolve to a file is banned, because tsc fails on it (a moved file keeps its old path). Use the path of the moved module from the importing file, with a .js suffix.";

const SUFFIX_MESSAGE =
  "A relative import without the .js suffix is banned (W13). Use the same path with .js at the end, for example ./copy.js.";

const HOOK_MESSAGE =
  "An import of a component file (.tsx or components/) in a hook is banned (U8). Use a model or platform module (for example <thing>-model.ts in the feature, or src/ui/platform) that both the hook and the component import.";

const PLATFORM_MESSAGE =
  "An import from a feature folder in apps/api/src/platform is banned, because the platform layer sits under every feature. Use a generic type (for example DurableObjectNamespace) in apps/api/src/platform/cloud-env.d.ts, or move the module under apps/api/src/platform.";

const seen = new Map();

const isFile = (full) => {
  if (!seen.has(full)) {
    seen.set(full, statSync(full, { throwIfNoEntry: false })?.isFile() === true);
  }

  return seen.get(full);
};

const withExtensions = (base) => SOURCE_EXTENSIONS.map((extension) => `${base}${extension}`);

const withIndex = (base) => INDEX_FILES.map((name) => path.join(base, name));

const candidatesOf = (full) => {
  if (JS_TAIL.test(full)) {
    const stem = full.replace(JS_TAIL, "");

    return [full, ...withExtensions(stem)];
  }

  if (ASSET_TAIL.test(full)) {
    return [full];
  }

  return [full, ...withExtensions(full), ...withIndex(full)];
};

const isRelative = (value) => value.startsWith("./") || value.startsWith("../");

const specOf = (node) => {
  const value = node.source?.value;

  if (value !== String(value) || !isRelative(value)) {
    return null;
  }

  return value.split("?")[0];
};

const resolveSpec = (filename, spec) => {
  const full = path.resolve(path.dirname(filename), spec);

  return candidatesOf(full).find((candidate) => isFile(candidate)) ?? null;
};

const visitImports = (check) => ({
  ExportAllDeclaration: (node) => check(node),
  ExportNamedDeclaration: (node) => check(node),
  ImportDeclaration: (node) => check(node),
  ImportExpression: (node) => check(node),
});

const importResolves = rule((context) =>
  visitImports((node) => {
    const spec = specOf(node);

    if (spec !== null && resolveSpec(context.filename, spec) === null) {
      context.report({ message: RESOLVE_MESSAGE, node: node.source });
    }
  })
);

const relativeImportJs = rule((context) =>
  visitImports((node) => {
    const spec = specOf(node);

    if (spec === null || JS_TAIL.test(spec) || ASSET_TAIL.test(spec)) {
      return;
    }

    const target = resolveSpec(context.filename, spec);

    if (target !== null && TS_FILE.test(target)) {
      context.report({ message: SUFFIX_MESSAGE, node: node.source });
    }
  })
);

const isComponentFile = (target) => target.endsWith(".tsx") || target.includes(`${path.sep}components${path.sep}`);

const noHookComponentImport = rule((context) => {
  if (!HOOK_FILE.test(path.basename(context.filename))) {
    return {};
  }

  return visitImports((node) => {
    const spec = specOf(node);

    if (spec === null) {
      return;
    }

    const target = resolveSpec(context.filename, spec);

    if (target !== null && isComponentFile(target)) {
      context.report({ message: HOOK_MESSAGE, node: node.source });
    }
  });
});

const cloudPlatformImport = rule((context) => {
  if (!relativeOf(context.filename).startsWith(PLATFORM)) {
    return {};
  }

  return visitImports((node) => {
    const spec = specOf(node);

    if (spec === null) {
      return;
    }

    const target = relativeOf(path.resolve(path.dirname(context.filename), spec));

    if (!PLATFORM_ALLOWED.test(target)) {
      context.report({ message: PLATFORM_MESSAGE, node: node.source });
    }
  });
});

export { cloudPlatformImport, importResolves, noHookComponentImport, relativeImportJs };
