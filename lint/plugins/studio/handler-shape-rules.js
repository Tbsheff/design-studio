import { relativeOf } from "./facts.js";
import { rule } from "./ast.js";

const HANDLER_FILE = /^apps\/desktop\/src\/server\/handlers\/(?<domain>[a-z0-9-]+)\/(?<tail>[a-z0-9-]+)\.ts$/u;

const IO_TYPES = new Set(["Input", "Output", "WireInput", "WireOutput"]);

const NODE_GLOBALS = new Set(["Buffer", "__dirname", "__filename", "process", "require"]);

const TYPE_MESSAGE =
  "A hand-written action type name that is not the derived name is banned. Use <Verb><Object><Domain>Input or Output from deriveNames in apps/desktop/scripts/stamp/names.ts, for example GetProjectInput for apps/desktop/src/server/handlers/project/get.ts.";

const GLOBAL_MESSAGE =
  "A Node global (Buffer, process, require, __dirname) in a handler is banned, because handlers stay thin. Use a service method in apps/desktop/src/server/<area>/<kebab>.ts that does the Node work.";

const pascal = (value) =>
  value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

const typeBaseOf = (filename) => {
  const match = HANDLER_FILE.exec(relativeOf(filename));

  if (match === null || match.groups.tail.startsWith("_")) {
    return null;
  }

  return `${pascal(match.groups.tail)}${pascal(match.groups.domain)}`;
};

const ioKindOf = (annotation) => {
  const name = annotation?.typeName?.name ?? null;

  if (annotation?.type !== "TSTypeReference" || !IO_TYPES.has(name)) {
    return null;
  }

  return name.replace(/^Wire/u, "");
};

const derivedTypeName = rule((context) => {
  const base = typeBaseOf(context.filename);

  return {
    TSTypeAliasDeclaration: (node) => {
      const kind = ioKindOf(node.typeAnnotation);

      if (base === null || kind === null) {
        return;
      }

      const allowed = new Set([`${base}${kind}`, `${base}Wire${kind}`]);

      if (!allowed.has(node.id.name)) {
        context.report({ message: TYPE_MESSAGE, node: node.id });
      }
    },
  };
});

const isGlobalUse = (node) => {
  const parent = node.parent ?? null;

  if (parent === null) {
    return true;
  }

  if (parent.type === "MemberExpression" && parent.property === node && !parent.computed) {
    return false;
  }

  return !(parent.type === "Property" && parent.key === node && !parent.computed);
};

const noHandlerNodeGlobal = rule((context) => ({
  Identifier: (node) => {
    if (NODE_GLOBALS.has(node.name) && isGlobalUse(node)) {
      context.report({ message: GLOBAL_MESSAGE, node });
    }
  },
}));

export { derivedTypeName, noHandlerNodeGlobal };
