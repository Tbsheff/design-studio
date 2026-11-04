import { actionAccessOf, relativeOf, serviceAccessOf } from "./facts.js";
import { rule } from "./ast.js";

const HANDLER_FILE =
  /^src\/server\/handlers\/(?<domain>[a-z0-9-]+)\/(?<tail>[a-z0-9-]+)\.ts$/u;

const WRAPPERS = new Set(["handlers", "live"]);

const CHECKED = new Map([
  ["handle", "Handle"],
  ["preview", "Preview"],
]);

const READ_MESSAGE =
  "Yielding a write service in a read handler or a preview is banned. Use a service with access read, for example a <Noun>Store in src/server/<area>/index.ts.";

const SATISFIES_MESSAGE =
  "A handle or preview without satisfies Handle<typeof action> or Preview<typeof action> is banned. Use satisfies with the types from src/server/handlers/_core/handler.ts.";

const handlerOf = (context) => {
  const match = HANDLER_FILE.exec(relativeOf(context.filename));

  if (match === null || WRAPPERS.has(match.groups.tail)) {
    return null;
  }

  return match.groups;
};

const isWriteYield = (node) =>
  node.delegate &&
  node.argument?.type === "Identifier" &&
  serviceAccessOf(node.argument.name) === "write";

const declaredName = (node) => {
  if (node.id.type === "Identifier") {
    return node.id.name;
  }

  return null;
};

const readYieldsReadService = rule((context) => {
  const handler = handlerOf(context);

  if (handler === null) {
    return {};
  }

  const isRead = actionAccessOf(handler.domain, handler.tail) === "read";
  const names = [];

  return {
    VariableDeclarator: (node) => {
      names.push(declaredName(node));
    },
    "VariableDeclarator:exit": () => {
      names.pop();
    },
    YieldExpression: (node) => {
      if (!isWriteYield(node)) {
        return;
      }

      if (isRead || names.includes("preview")) {
        context.report({ message: READ_MESSAGE, node });
      }
    },
  };
});

const satisfiesName = (init) => {
  const isSatisfies =
    init?.type === "TSSatisfiesExpression" &&
    init.typeAnnotation.type === "TSTypeReference" &&
    init.typeAnnotation.typeName.type === "Identifier";

  if (!isSatisfies) {
    return null;
  }

  return init.typeAnnotation.typeName.name;
};

const isTopLevel = (node) =>
  node.parent?.parent?.type === "Program" ||
  node.parent?.parent?.type === "ExportNamedDeclaration";

const handlerSatisfies = rule((context) => {
  if (handlerOf(context) === null) {
    return {};
  }

  return {
    VariableDeclarator: (node) => {
      const expected = CHECKED.get(declaredName(node)) ?? null;

      if (expected === null || !isTopLevel(node)) {
        return;
      }

      if (satisfiesName(node.init) !== expected) {
        context.report({ message: SATISFIES_MESSAGE, node });
      }
    },
  };
});

export { handlerSatisfies, readYieldsReadService };
