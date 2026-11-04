import path from "node:path";

import { relativeOf } from "./facts.js";
import { rule } from "./ast.js";

const SERVER_AREA = /^src\/server\/(?<area>[a-z0-9-]+)\//u;

const AREA_INDEX = /^src\/server\/(?:platform\/[a-z0-9-]+|[a-z0-9-]+)\/index\.ts$/u;

const FS_SOURCES = new Set(["fs", "node:fs"]);

const FUNCTION_TYPES = [
  "ArrowFunctionExpression",
  "FunctionDeclaration",
  "FunctionExpression",
  "TSFunctionType",
  "TSMethodSignature",
];

const INLINE_MESSAGE =
  "An inline export, a re-export or a default export outside index.ts is banned. Use one export { } block and one export type { } block at the end of the file (AGENTS.md L3).";

const BLOCK_MESSAGE =
  "A second export { } or export type { } block, or code after the export blocks, is banned. Use one export { } block and one export type { } block as the last statements of the file (AGENTS.md L3).";

const READONLY_MESSAGE =
  "A type field without readonly is banned. Use readonly on every field (AGENTS.md L4), for example readonly orgId: string.";

const UNDEFINED_MESSAGE =
  "The undefined type, an optional parameter and a default parameter are banned. Use a required parameter typed T | null and pass null (AGENTS.md L4).";

const SYNC_MESSAGE =
  "A sync node:fs call is banned. Use the async helpers from src/server/platform/local-file/index.ts or node:fs/promises.";

const ZOD_MESSAGE =
  "Importing zod outside src/server/agent-tools/sdk-shape.ts is banned. Use Schema from effect, and toJsonFileReader from src/server/platform/local-file/index.ts to read a JSON file.";

const AREA_MESSAGE =
  "An import past another area index.ts is banned. Use the export from src/server/<area>/index.ts, or src/server/platform/<module>/index.ts (AGENTS.md W13).";

const isIndexFile = (filename) => path.basename(filename) === "index.ts";

const INLINE_TYPES = new Set(["ExportAllDeclaration", "ExportDefaultDeclaration"]);

const isInlineNamed = (node) =>
  node.type === "ExportNamedDeclaration" && (node.declaration !== null || node.source !== null);

const isInlineExport = (node) => INLINE_TYPES.has(node.type) || isInlineNamed(node);

const blockKindOf = (node) => {
  if (node.type !== "ExportNamedDeclaration") {
    return null;
  }

  if (node.exportKind === "type") {
    return "type";
  }

  return "value";
};

const checkBlocks = (context, body) => {
  const seen = new Set();

  for (const node of body) {
    const kind = blockKindOf(node);

    if (kind === null && seen.size > 0) {
      context.report({ message: BLOCK_MESSAGE, node });
    }

    if (kind !== null && seen.has(kind)) {
      context.report({ message: BLOCK_MESSAGE, node });
    }

    if (kind !== null) {
      seen.add(kind);
    }
  }
};

const exportBlocks = rule((context) => {
  if (isIndexFile(context.filename)) {
    return {};
  }

  return {
    Program: (program) => {
      const inline = program.body.filter(isInlineExport);

      for (const node of inline) {
        context.report({ message: INLINE_MESSAGE, node });
      }

      checkBlocks(context, program.body.filter((node) => !isInlineExport(node)));
    },
  };
});

const readonlyField = rule((context) => ({
  TSPropertySignature: (node) => {
    if (!node.readonly) {
      context.report({ message: READONLY_MESSAGE, node });
    }
  },
}));

const isOptionalParam = (param) =>
  param.type === "AssignmentPattern" || param.optional === true;

const checkOptionalParams = (context, node) => {
  for (const param of node.params) {
    if (isOptionalParam(param)) {
      context.report({ message: UNDEFINED_MESSAGE, node: param });
    }
  }
};

const noUndefinedType = rule((context) => {
  const visitors = Object.fromEntries(
    FUNCTION_TYPES.map((type) => [type, (node) => checkOptionalParams(context, node)])
  );

  return {
    ...visitors,
    TSUndefinedKeyword: (node) => context.report({ message: UNDEFINED_MESSAGE, node }),
  };
});

const importedName = (specifier) => {
  if (specifier.type !== "ImportSpecifier") {
    return "";
  }

  return specifier.imported.name ?? String(specifier.imported.value);
};

const noSyncFs = rule((context) => ({
  ImportDeclaration: (node) => {
    if (!FS_SOURCES.has(node.source.value)) {
      return;
    }

    for (const specifier of node.specifiers) {
      if (importedName(specifier).endsWith("Sync")) {
        context.report({ message: SYNC_MESSAGE, node: specifier });
      }
    }
  },
}));

const isZodSource = (source) => source === "zod" || source.startsWith("zod/");

const noZodImport = rule((context) => ({
  ImportDeclaration: (node) => {
    if (isZodSource(String(node.source.value))) {
      context.report({ message: ZOD_MESSAGE, node: node.source });
    }
  },
}));

const areaOf = (relative) => SERVER_AREA.exec(relative)?.groups.area ?? null;

const isPastIndex = (context, source) => {
  if (!source.startsWith("../")) {
    return false;
  }

  const target = path.resolve(path.dirname(context.filename), source.replace(/\.js$/u, ".ts"));
  const relative = relativeOf(target);
  const area = areaOf(relative);

  if (area === null || area === areaOf(relativeOf(context.filename))) {
    return false;
  }

  return !AREA_INDEX.test(relative);
};

const checkAreaSource = (context, node) => {
  const source = node.source?.value ?? null;

  if (source !== null && isPastIndex(context, String(source))) {
    context.report({ message: AREA_MESSAGE, node: node.source });
  }
};

const areaImportIndex = rule((context) => ({
  ExportAllDeclaration: (node) => checkAreaSource(context, node),
  ExportNamedDeclaration: (node) => checkAreaSource(context, node),
  ImportDeclaration: (node) => checkAreaSource(context, node),
}));

export {
  areaImportIndex,
  exportBlocks,
  noSyncFs,
  noUndefinedType,
  noZodImport,
  readonlyField,
};
