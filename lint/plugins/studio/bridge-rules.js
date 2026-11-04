import path from "node:path";

import { propertyOf, rule } from "./ast.js";
import { relativeOf } from "./facts.js";

const TYPE_IMPORT_MESSAGE =
  "A value import from @design-studio/actions in the bridge is banned (S7a, U5), because it puts effect Schema code in the page bundle. Use `import type { BridgeMessage } from \"@design-studio/actions/bridge-protocol\"`, and value imports from @design-studio/contracts.";

const CATCH_ALL_MESSAGE =
  "A Schema.Union member with `type: Schema.String` next to members with `type: Schema.Literal(...)` is banned, because the catch-all matches every message and the union does not discriminate. Use only Schema.Literal type members in the union in packages/common/actions/src/bridge-protocol.ts.";

const FLOATING_MESSAGE =
  "A call to an async function as a bare statement is banned, because a rejection then has no owner. Use `void name()` to mark it on purpose, or await it in an async function.";

const APP_IMPORT_MESSAGE =
  "A dynamic import from server code into another app (apps/desktop/desktop/, apps/desktop/scripts/) is banned (AGENTS.md W13, N7), because boundaries do not check import(). Use a module in apps/desktop/src/server/platform/<module>/index.ts that both apps import, as apps/desktop/src/server/platform/bridge-build/index.ts does.";

const ACTIONS_PACKAGE = /^@design-studio\/actions(?:\/|$)/u;

const isActionsSource = (context, source) => {
  if (!source.startsWith(".")) {
    return ACTIONS_PACKAGE.test(source);
  }

  const target = relativeOf(path.resolve(path.dirname(context.filename), source));

  return target.startsWith("packages/common/actions/src/");
};

const isValueImport = (node) =>
  node.importKind !== "type" &&
  node.specifiers.some((specifier) => specifier.importKind !== "type");

const bridgeTypeImport = rule((context) => ({
  ImportDeclaration: (node) => {
    if (isValueImport(node) && isActionsSource(context, String(node.source.value))) {
      context.report({ message: TYPE_IMPORT_MESSAGE, node: node.source });
    }
  },
}));

const isSchemaMember = (node, name) =>
  node?.type === "MemberExpression" &&
  node.object.type === "Identifier" &&
  node.object.name === "Schema" &&
  node.property.name === name;

const isSchemaCall = (node, name) =>
  node?.type === "CallExpression" && isSchemaMember(node.callee, name);

const typeKindOf = (struct) => {
  if (!isSchemaCall(struct, "Struct") || struct.arguments[0]?.type !== "ObjectExpression") {
    return null;
  }

  const field = propertyOf(struct.arguments[0], "type");

  if (field === null) {
    return null;
  }

  if (isSchemaMember(field.value, "String")) {
    return "string";
  }

  if (isSchemaCall(field.value, "Literal")) {
    return "literal";
  }

  return null;
};

const unionMembers = (call) => {
  const [first] = call.arguments;

  if (first?.type === "ArrayExpression") {
    return first.elements;
  }

  return call.arguments;
};

const noCatchAllUnion = rule((context) => {
  const structs = new Map();
  const unions = [];

  return {
    CallExpression: (node) => {
      if (isSchemaCall(node, "Union")) {
        unions.push(node);
      }
    },
    "Program:exit": () => {
      for (const union of unions) {
        const kinds = unionMembers(union).map((member) => {
          if (member?.type === "Identifier") {
            return typeKindOf(structs.get(member.name));
          }

          return typeKindOf(member);
        });

        const kindSet = new Set(kinds);

        if (kindSet.has("string") && kindSet.has("literal")) {
          context.report({ message: CATCH_ALL_MESSAGE, node: union });
        }
      }
    },
    VariableDeclarator: (node) => {
      if (node.id.type === "Identifier") {
        structs.set(node.id.name, node.init);
      }
    },
  };
});

const isAsyncFunction = (node) =>
  node?.async === true &&
  (node.type === "ArrowFunctionExpression" || node.type === "FunctionExpression");

const noFloatingAsync = rule((context) => {
  const asyncNames = new Set();
  const calls = [];

  return {
    ExpressionStatement: (node) => {
      const { expression } = node;

      if (expression.type === "CallExpression" && expression.callee.type === "Identifier") {
        calls.push(expression);
      }
    },
    FunctionDeclaration: (node) => {
      if (node.async && node.id !== null) {
        asyncNames.add(node.id.name);
      }
    },
    "Program:exit": () => {
      for (const call of calls) {
        if (asyncNames.has(call.callee.name)) {
          context.report({ message: FLOATING_MESSAGE, node: call });
        }
      }
    },
    VariableDeclarator: (node) => {
      if (node.id.type === "Identifier" && isAsyncFunction(node.init)) {
        asyncNames.add(node.id.name);
      }
    },
  };
});

const isOtherApp = (context, source) => {
  if (!source.startsWith(".")) {
    return false;
  }

  const target = relativeOf(path.resolve(path.dirname(context.filename), source));

  return !target.startsWith("apps/desktop/src/") && !target.startsWith("node_modules/");
};

const noDynamicAppImport = rule((context) => ({
  ImportExpression: (node) => {
    if (node.source.type !== "Literal") {
      return;
    }

    if (isOtherApp(context, String(node.source.value))) {
      context.report({ message: APP_IMPORT_MESSAGE, node: node.source });
    }
  },
}));

export { bridgeTypeImport, noCatchAllUnion, noDynamicAppImport, noFloatingAsync };
