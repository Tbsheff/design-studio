import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { rule } from "./ast.js";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));

const SCAN_ROOTS = ["src", "../api/src", "../api/test", "desktop", "scripts", "e2e", "lint"];

const SKIP_DIRS = new Set(["node_modules", "dist", "templates", "__fixtures__"]);

const CODE_FILE = /\.(?:ts|tsx|mts|cts|js|mjs|cjs)$/u;

const STATIC_IMPORT = /^(?:import|export)\b(?<clause>[^"';]*)from "(?<spec>[^"]+)"/gmu;

const DYNAMIC_IMPORT = /\b(?:import|mock)\(\s*["'](?<spec>[^"']+)["']/gu;

const SOURCE_TAILS = ["", ".ts", ".tsx", ".d.ts", ".js", "/index.ts", "/index.tsx"];

const JS_TAIL = /\.(?:js|mjs|cjs|jsx)$/u;

const ALL = "*";

const UNUSED_MESSAGE =
  "An exported value that no other file imports is banned, because it is dead code (a gate or path that was never wired). Use it from its caller in the same slice, or delete the export.";

const listCode = (dir) => {
  const stat = statSync(dir, { throwIfNoEntry: false });

  if (!stat?.isDirectory()) {
    return [];
  }

  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) {
        return [];
      }

      return listCode(full);
    }

    if (CODE_FILE.test(entry.name)) {
      return [full];
    }

    return [];
  });
};

const isFile = (full) => statSync(full, { throwIfNoEntry: false })?.isFile() === true;

const resolveFrom = (file, spec) => {
  if (!spec.startsWith(".")) {
    return null;
  }

  const base = path.resolve(path.dirname(file), spec).replace(JS_TAIL, "");

  for (const tail of SOURCE_TAILS) {
    if (isFile(`${base}${tail}`)) {
      return `${base}${tail}`;
    }
  }

  return null;
};

const namesOf = (raw) => {
  const clause = raw.trim().replace(/^type\b/u, "").trim();

  if (clause.startsWith("*")) {
    return [ALL];
  }

  const open = clause.indexOf("{");
  const close = clause.indexOf("}", open);
  const names = [];

  if (!clause.startsWith("{")) {
    names.push("default");
  }

  if (open === -1 || close === -1) {
    return names;
  }

  for (const part of clause.slice(open + 1, close).split(",")) {
    const name = part
      .trim()
      .split(/\s/u)
      .find((word) => word !== "" && word !== "type") ?? "";

    if (name !== "") {
      names.push(name);
    }
  }

  return names;
};

const addUse = (index, target, names) => {
  if (target === null) {
    return;
  }

  const used = index.get(target) ?? new Set();

  for (const name of names) {
    used.add(name);
  }

  index.set(target, used);
};

const indexFile = (index, file) => {
  const text = readFileSync(file, "utf-8");

  for (const match of text.matchAll(STATIC_IMPORT)) {
    addUse(index, resolveFrom(file, match.groups.spec), namesOf(match.groups.clause));
  }

  for (const match of text.matchAll(DYNAMIC_IMPORT)) {
    addUse(index, resolveFrom(file, match.groups.spec), [ALL]);
  }
};

const cache = { index: null };

const usesOf = (file) => {
  if (cache.index === null) {
    cache.index = new Map();

    for (const root of SCAN_ROOTS) {
      for (const code of listCode(path.join(ROOT, root))) {
        indexFile(cache.index, code);
      }
    }
  }

  return cache.index.get(file) ?? new Set();
};

const declaredNames = (declaration) => {
  if (declaration === null) {
    return [];
  }

  if (declaration.type === "VariableDeclaration") {
    return declaration.declarations.flatMap((item) => {
      if (item.id.type === "Identifier") {
        return [item.id];
      }

      return [];
    });
  }

  if (declaration.id?.type === "Identifier") {
    return [declaration.id];
  }

  return [];
};

const exportedNodes = (node) => {
  if (node.exportKind === "type" || node.source) {
    return [];
  }

  if (node.declaration) {
    if (node.declaration.type.startsWith("TS")) {
      return [];
    }

    return declaredNames(node.declaration);
  }

  return node.specifiers.flatMap((specifier) => {
    if (specifier.exportKind === "type") {
      return [];
    }

    return [specifier.exported];
  });
};

const nameOf = (node) => node.name ?? String(node.value);

const noUnusedExport = rule((context) => ({
  ExportNamedDeclaration: (node) => {
    const used = usesOf(context.filename);

    if (used.has(ALL)) {
      return;
    }

    for (const exported of exportedNodes(node)) {
      if (!used.has(nameOf(exported))) {
        context.report({ message: UNUSED_MESSAGE, node: exported });
      }
    }
  },
}));

export { noUnusedExport };
