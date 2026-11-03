import { lastName, rule } from "./ast.js";

const DESKTOP = "studioDesktop";

const READ_NAME = /^(?:get|list|search|inspect)[A-Z]/u;

const CACHE_NAME =
  /(?:^|_)(?:WARM|TTL|MAX_AGE)(?:_|$)|^(?:warm|ttl|maxAge)(?:[A-Z]|$)/u;

const DESKTOP_MESSAGE =
  "Reading window.studioDesktop outside the platform layer is banned. Use desktopBridge or isDesktop from src/ui/platform/desktop.ts.";

const READ_MESSAGE =
  "useAction on a read action with no input is banned, because the read never runs. Use useAction(action, input) from src/ui/platform/query.ts.";

const CAST_MESSAGE =
  "Casting an action call with as Promise<...> is banned. Use WireOutput<typeof action> from src/shared/actions/_core/action.ts and the typed call from src/ui/platform/http.ts.";

const BARREL_MESSAGE =
  "A wildcard re-export (export * from) is banned in the UI. Use a named import from the real module, for example from src/ui/platform/<module>.ts.";

const CACHE_MESSAGE =
  "A time-based cache (warm, TTL, max age) is banned in the UI. Use in-flight dedupe and action.invalidates in src/ui/platform/query.ts.";

const noDesktopGlobal = rule((context) => ({
  BinaryExpression: (node) => {
    if (node.operator === "in" && node.left.value === DESKTOP) {
      context.report({ message: DESKTOP_MESSAGE, node });
    }
  },
  MemberExpression: (node) => {
    if (!node.computed && node.property.name === DESKTOP) {
      context.report({ message: DESKTOP_MESSAGE, node });
    }
  },
}));

const isReadAction = (node) => {
  const name = node && lastName(node);

  return name !== null && READ_NAME.test(name);
};

const readNeedsInput = rule((context) => ({
  CallExpression: (node) => {
    const isHook =
      node.callee.type === "Identifier" && node.callee.name === "useAction";

    if (isHook && node.arguments.length === 1 && isReadAction(node.arguments[0])) {
      context.report({ message: READ_MESSAGE, node });
    }
  },
}));

const noPromiseCast = rule((context) => ({
  TSAsExpression: (node) => {
    const target = node.typeAnnotation;

    const isPromise =
      target.type === "TSTypeReference" &&
      target.typeName.type === "Identifier" &&
      target.typeName.name === "Promise";

    if (isPromise) {
      context.report({ message: CAST_MESSAGE, node });
    }
  },
}));

const noWildcardReexport = rule((context) => ({
  ExportAllDeclaration: (node) => {
    context.report({ message: BARREL_MESSAGE, node });
  },
}));

const reportCache = (context, node) => {
  if (node.type === "Identifier" && CACHE_NAME.test(node.name)) {
    context.report({ message: CACHE_MESSAGE, node });
  }
};

const noCacheTtl = rule((context) => ({
  Property: (node) => reportCache(context, node.key),
  TSPropertySignature: (node) => reportCache(context, node.key),
  VariableDeclarator: (node) => reportCache(context, node.id),
}));

export {
  noCacheTtl,
  noDesktopGlobal,
  noPromiseCast,
  noWildcardReexport,
  readNeedsInput,
};
