import { relativeOf } from "./facts.js";
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

const THEN_MESSAGE =
  "A .then chain on an action call or in a platform, feature, app, kit or domain file is banned. Use await in an async function, or startTransition from react.";

const WIRE_CAST_MESSAGE =
  "A type cast on action data in the UI is banned. Use WireOutput<typeof action> from src/shared/actions/_core/action.ts and the typed call from src/ui/platform/http.ts.";

const NEW_UI = /^src\/ui\/(?:app|domain|features|kit|platform)\//u;

const ACTION_IMPORT = /(?:^\.|platform)\/http(?:\.js)?$|\/shared\/actions\/[a-z0-9-]+\/routes(?:\.js)?$/u;

const importsActions = (context) =>
  context.sourceCode.ast.body.some(
    (node) =>
      node.type === "ImportDeclaration" &&
      node.importKind !== "type" &&
      ACTION_IMPORT.test(String(node.source.value))
  );

const isThenCall = (node) =>
  node.callee.type === "MemberExpression" &&
  !node.callee.computed &&
  node.callee.property.name === "then";

const noThen = rule((context) => {
  const isNew = NEW_UI.test(relativeOf(context.filename));

  if (!isNew && !importsActions(context)) {
    return {};
  }

  return {
    CallExpression: (node) => {
      if (isThenCall(node)) {
        context.report({ message: THEN_MESSAGE, node });
      }
    },
  };
});

const unwrap = (node) => {
  if (node?.type === "AwaitExpression" || node?.type === "TSNonNullExpression") {
    return unwrap(node.argument ?? node.expression);
  }

  if (node?.type === "ParenthesizedExpression") {
    return unwrap(node.expression);
  }

  return node;
};

const HTTP_IMPORT = /(?:^\.|platform)\/http(?:\.js)?$/u;

const ROUTES_IMPORT = /\/shared\/actions\/[a-z0-9-]+\/routes(?:\.js)?$/u;

const isImportFrom = (node, pattern) =>
  node.type === "ImportDeclaration" && pattern.test(String(node.source.value));

const specifierNames = (node, imported) =>
  node.specifiers.flatMap((specifier) => {
    if (imported === null || specifier.imported?.name === imported) {
      return [specifier.local.name];
    }

    return [];
  });

const localNames = (context, pattern, imported) =>
  context.sourceCode.ast.body.flatMap((node) => {
    if (!isImportFrom(node, pattern)) {
      return [];
    }

    return specifierNames(node, imported);
  });

const isActionArgument = (node, names) =>
  node?.type === "Identifier" ||
  (node?.type === "MemberExpression" &&
    node.object.type === "Identifier" &&
    names.routes.has(node.object.name));

const isActionCall = (node, names) => {
  const inner = unwrap(node);

  return (
    inner?.type === "CallExpression" &&
    inner.callee.type === "Identifier" &&
    names.call.has(inner.callee.name) &&
    isActionArgument(inner.arguments[0], names)
  );
};

const rootName = (node) => {
  const inner = unwrap(node);

  if (inner?.type === "MemberExpression") {
    return rootName(inner.object);
  }

  if (inner?.type === "Identifier") {
    return inner.name;
  }

  return null;
};

const patternNames = (pattern) => {
  if (pattern.type === "Identifier") {
    return [pattern.name];
  }

  if (pattern.type === "ObjectPattern") {
    return pattern.properties.flatMap((property) =>
      patternNames(property.value ?? property.argument)
    );
  }

  return [];
};

const isNeverCast = (node) => node.typeAnnotation.type === "TSNeverKeyword";

const noWireCast = rule((context) => {
  if (!importsActions(context)) {
    return {};
  }

  const fromCall = new Set();

  const names = {
    call: new Set(localNames(context, HTTP_IMPORT, "call")),
    routes: new Set(localNames(context, ROUTES_IMPORT, null)),
  };

  const isWire = (node) =>
    isActionCall(node, names) || fromCall.has(rootName(node));

  return {
    TSAsExpression: (node) => {
      if (isWire(node.expression) || isNeverCast(node)) {
        context.report({ message: WIRE_CAST_MESSAGE, node });
      }
    },
    VariableDeclarator: (node) => {
      if (isActionCall(node.init, names)) {
        for (const name of patternNames(node.id)) {
          fromCall.add(name);
        }
      }
    },
  };
});

export {
  noThen,
  noWireCast,
  noCacheTtl,
  noDesktopGlobal,
  noPromiseCast,
  noWildcardReexport,
  readNeedsInput,
};
