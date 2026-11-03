import { relativeOf } from "./facts.js";
import { rule } from "./ast.js";

const SERVER_AREA = /^src\/server\/(?<area>[a-z0-9-]+)\//u;

const SLOT_CALLS = new Set(["delete", "get", "has", "set"]);

const SLOT_MESSAGE =
  "A hand-made runtime slot (a NOT_READY text or a Map keyed by loadConfig().dataDir) is banned. Use makeRuntimeSlot or requireBound from src/server/platform/runtime-slot/index.ts.";

const TAG_MESSAGE =
  'A service tag that does not match its folder and class is banned. Use "design-studio/<area>/<Class>" with the src/server/<area>/ folder of the file, as new:service makes it.';

const ASYNC_MESSAGE =
  "async, await, throw, try, new Promise and .catch are banned in Effect service and handler code. Use Effect.fn with yield*, Effect.promise and Effect.orElseSucceed from effect, and attemptKnown from src/server/platform/attempt/index.ts.";

const ENGINE_MESSAGE =
  "I/O, Effect, async and throw are banned in a pure engine. Use plain sync functions that return { ok: true, value } or { ok: false, code } in <area>/engine/<verb-noun>.ts.";

const isNamed = (node, name) => node?.type === "Identifier" && node.name === name;

const isConfigCall = (node) =>
  node.type === "CallExpression" && isNamed(node.callee, "loadConfig");

const isDataDir = (node) =>
  node?.type === "MemberExpression" &&
  !node.computed &&
  node.property.name === "dataDir" &&
  isConfigCall(node.object);

const isSlotCall = (node) =>
  node.callee.type === "MemberExpression" &&
  !node.callee.computed &&
  SLOT_CALLS.has(node.callee.property.name) &&
  isDataDir(node.arguments[0]);

const noRuntimeMap = rule((context) => ({
  CallExpression: (node) => {
    if (isSlotCall(node)) {
      context.report({ message: SLOT_MESSAGE, node });
    }
  },
  VariableDeclarator: (node) => {
    if (node.id.type === "Identifier" && node.id.name.includes("NOT_READY")) {
      context.report({ message: SLOT_MESSAGE, node });
    }
  },
}));

const isServiceCall = (node) =>
  node?.type === "CallExpression" &&
  node.callee.type === "MemberExpression" &&
  isNamed(node.callee.object, "Context") &&
  node.callee.property.name === "Service";

const tagOf = (superClass) => {
  if (superClass?.type !== "CallExpression" || !isServiceCall(superClass.callee)) {
    return null;
  }

  return superClass.arguments[0] ?? null;
};

const expectedTag = (context, name) => {
  const match = SERVER_AREA.exec(relativeOf(context.filename));

  if (match === null) {
    return null;
  }

  return `design-studio/${match.groups.area}/${name}`;
};

const checkTag = (context, node) => {
  const tag = tagOf(node.superClass);

  if (tag === null || node.id === null) {
    return;
  }

  const expected = expectedTag(context, node.id.name);

  if (expected !== null && tag.value !== expected) {
    context.report({ message: TAG_MESSAGE, node: tag });
  }
};

const serviceTagArea = rule((context) => ({
  ClassDeclaration: (node) => checkTag(context, node),
}));

const reportAsync = (context, node) => {
  if (node.async) {
    context.report({ message: ASYNC_MESSAGE, node });
  }
};

const isCatchCall = (node) =>
  node.callee.type === "MemberExpression" &&
  !node.callee.computed &&
  node.callee.property.name === "catch";

const asyncVisitors = (context, message) => {
  const report = (node) => context.report({ message, node });

  return {
    ArrowFunctionExpression: (node) => reportAsync(context, node),
    AwaitExpression: report,
    CallExpression: (node) => {
      if (isCatchCall(node)) {
        report(node);
      }
    },
    FunctionDeclaration: (node) => reportAsync(context, node),
    FunctionExpression: (node) => reportAsync(context, node),
    NewExpression: (node) => {
      if (isNamed(node.callee, "Promise")) {
        report(node);
      }
    },
    ThrowStatement: report,
    TryStatement: report,
  };
};

const isEffectMember = (node) =>
  node.type === "MemberExpression" && isNamed(node.object, "Effect");

const isEffectCall = (node) =>
  isEffectMember(node.callee) ||
  (node.callee.type === "CallExpression" && isEffectMember(node.callee.callee));

const isHandlerFile = (context) =>
  relativeOf(context.filename).startsWith("src/server/handlers/");

const inEffectOnly = (visitors, isInside) =>
  Object.fromEntries(
    Object.entries(visitors).map(([key, visit]) => [
      key,
      (node) => {
        if (isInside()) {
          visit(node);
        }
      },
    ])
  );

const noAsyncInService = rule((context) => {
  const base = asyncVisitors(context, ASYNC_MESSAGE);

  if (isHandlerFile(context)) {
    return base;
  }

  const depth = { value: 0 };
  const guarded = inEffectOnly(base, () => depth.value > 0);

  const visitCall = guarded.CallExpression;

  return {
    ...guarded,
    CallExpression: (node) => {
      visitCall(node);

      if (isEffectCall(node)) {
        depth.value += 1;
      }
    },
    "CallExpression:exit": (node) => {
      if (isEffectCall(node)) {
        depth.value -= 1;
      }
    },
  };
});

const isImpure = (node) => {
  const source = String(node.source.value);

  if (node.importKind === "type") {
    return false;
  }

  return source.startsWith("node:") || source === "effect" || source.startsWith("effect/");
};

const enginePure = rule((context) => {
  const base = asyncVisitors(context, ENGINE_MESSAGE);

  return {
    ...base,
    ImportDeclaration: (node) => {
      if (isImpure(node)) {
        context.report({ message: ENGINE_MESSAGE, node });
      }
    },
  };
});

export { enginePure, noAsyncInService, noRuntimeMap, serviceTagArea };
