import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { rule } from "./ast.js";
import { relativeOf } from "./facts.js";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));

const ACTIONS = path.join(ROOT, "packages/common/actions/src");

const ACTION_CONST = /^const (?<name>[a-z]\w*) = defineAction\(/gmu;

const ADAPTER_IMPORT = /^(?:\.\.\/)+(?<area>http|mcp|agent-tools)\/(?<tail>.+)$/u;

const AREA_OF = /^src\/server\/(?<area>[a-z-]+)\//u;

const ADAPTER_MESSAGE =
  "A value import past another adapter's index.ts (http, mcp, agent-tools) is banned (W6, W13), because it couples two surfaces through a hidden module. Use a service from the one runtime, or the export from src/server/<adapter>/index.ts.";

const NAME_REUSE_MESSAGE =
  "A server function or const with the name of an action const (for example stopRun) is banned (N2), because one name must mean one thing. Use a name with a different verb or noun, and keep the derived name for packages/common/actions/src/<domain>/<verb>.ts.";

const AWAITED_MESSAGE =
  "Awaited<ReturnType<...>> in a type is banned (S9), because it hides the output type behind the implementation. Use Schema.Type of the schema from packages/common/actions/src/<domain>/schema.ts, or a named interface.";

const cache = { actionNames: null };

const listTs = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      return listTs(full);
    }

    if (entry.name.endsWith(".ts")) {
      return [full];
    }

    return [];
  });

const toActionNames = () => {
  const names = new Set();

  for (const file of listTs(ACTIONS)) {
    for (const match of readFileSync(file, "utf-8").matchAll(ACTION_CONST)) {
      names.add(match.groups.name);
    }
  }

  return names;
};

const isActionName = (name) => {
  if (cache.actionNames === null) {
    cache.actionNames = toActionNames();
  }

  return cache.actionNames.has(name);
};

const areaOf = (relative) => AREA_OF.exec(relative)?.groups.area ?? null;

const adapterImportIndex = rule((context) => {
  const from = areaOf(relativeOf(context.filename));

  return {
    ImportDeclaration: (node) => {
      const match = ADAPTER_IMPORT.exec(String(node.source.value));
      const isType = node.importKind === "type";

      if (match === null || isType || match.groups.area === from) {
        return;
      }

      if (match.groups.tail !== "index.js") {
        context.report({ message: ADAPTER_MESSAGE, node });
      }
    },
  };
});

const typeArgsOf = (node) => node.typeArguments ?? node.typeParameters ?? null;

const isModuleLevel = (node) => {
  if (node.parent?.type === "ExportNamedDeclaration") {
    return node.parent.parent?.type === "Program";
  }

  return node.parent?.type === "Program";
};

const checkName = (context, id, node) => {
  if (id?.type === "Identifier" && isModuleLevel(node) && isActionName(id.name)) {
    context.report({ message: NAME_REUSE_MESSAGE, node: id });
  }
};

const noActionNameReuse = rule((context) => ({
  FunctionDeclaration: (node) => checkName(context, node.id, node),
  VariableDeclaration: (node) => {
    for (const declarator of node.declarations) {
      checkName(context, declarator.id, node);
    }
  },
}));

const typeNameIs = (node, name) =>
  node?.type === "TSTypeReference" && node.typeName.type === "Identifier" && node.typeName.name === name;

const noAwaitedReturnType = rule((context) => ({
  TSTypeReference: (node) => {
    const [first] = typeArgsOf(node)?.params ?? [];

    if (typeNameIs(node, "Awaited") && typeNameIs(first, "ReturnType")) {
      context.report({ message: AWAITED_MESSAGE, node });
    }
  },
}));

export { adapterImportIndex, noActionNameReuse, noAwaitedReturnType };
