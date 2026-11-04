import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { rule } from "./ast.js";
import { autofixRules } from "./autofix-rules.js";
import { relativeOf } from "./facts.js";
import { committedTextOf } from "./freeze-rules.js";
import { committedUsesOf, fileValuesOf, partsOf } from "./override-pins.js";

const LAZY_MESSAGE =
  "lazy(() => import(...)) on a module with no default export is banned (U6), because React gets no component. Use lazy(async () => ({ default: (await import('./x.js')).Name })), as apps/desktop/src/ui/features/chat/index.ts does.";

const HUB_MESSAGE =
  "A root apps/desktop/src/ui file that re-exports feature code is banned (U7), because it lets features import each other past the boundaries check. Use the feature index.ts, and let apps/desktop/src/ui/app compose features with slots or callback props.";

const INDEX_MESSAGE =
  "An eager component re-export from a .tsx file in a feature index.ts is banned (U14). Use a lazy named export: const X = lazy(async () => ({ default: (await import('./x.js')).X })), and export pure values from a <thing>-model.ts file.";

const VOID_MESSAGE =
  "A `void 0;` placeholder statement is banned (L1), because it hides an empty block from the lint. Use a returned value in the catch, or let the error go to the caller.";

const DATA_CAST_MESSAGE =
  "Casting message data with `as` (event.data as T) in the bridge is banned (L1), because the data comes from another window. Use a type guard on the message type from apps/desktop/src/shared/contracts.ts.";

const MODULE_LET_MESSAGE =
  "A module-level `let` in a server adapter or store is banned (S13a), because it is hidden mutable state. Use a Layer, or makeRuntimeSlot from apps/desktop/src/server/platform/runtime-slot/index.ts.";

const TYPE_LIST_MESSAGE =
  "A *_TYPES list typed as string[] is banned (N8), because it accepts names that are not message types. Use readonly BridgeMessage['type'][] from apps/desktop/src/shared/contracts.ts.";

const JSON_READ_MESSAGE =
  "JSON.parse on a file that you read by hand is banned (P4), because each file has one owner. Use the owning store (DeviceBindings for bindings.json), or toJsonFileReader from apps/desktop/src/server/platform/local-file/index.ts.";

const SCOPE_MESSAGE =
  "An OrgScope parameter on a service method or a handler step is banned (T12), because the caller must not pass its scope. Use `const scope = yield* LocalOrgScope` inside the method, from apps/desktop/src/server/store/index.ts.";

const DEEP_MESSAGE =
  "Importing a store or preview file past its index.ts from another server area is banned (W16). Use the export from apps/desktop/src/server/store/index.ts or apps/desktop/src/server/preview/index.ts.";

const OVERLAP_MESSAGE =
  "A file that is in more than one decision override is banned (L11). Use one override object per file set in lint/decisions.ts, with all the rules for that file in it.";

const SOURCE_EXTENSIONS = [".tsx", ".ts"];

const READ_CALLS = new Set(["readFile", "readFileSync", "readTextFile"]);

const cache = { defaults: new Map() };

const isCommittedSource = (context, source) => {
  const text = committedTextOf(relativeOf(context.filename));

  return text !== null && text.includes(`"${source}"`);
};

const isFreshSource = (context, node) => !isCommittedSource(context, String(node.source?.value ?? ""));

const fileOf = (fromFile, source) => {
  const base = path.resolve(path.dirname(fromFile), source).replace(/\.js$/u, "");

  return SOURCE_EXTENSIONS.map((extension) => `${base}${extension}`).find((file) => existsSync(file)) ?? null;
};

const hasDefaultExport = (file) => {
  if (!cache.defaults.has(file)) {
    cache.defaults.set(file, /\bexport\s+default\b/u.test(readFileSync(file, "utf-8")));
  }

  return cache.defaults.get(file);
};

const importSourceOf = (node) => {
  if (node?.type === "ImportExpression" && node.source.type === "Literal") {
    return String(node.source.value);
  }

  return null;
};

const directImportOf = (loader) => {
  if (loader?.type !== "ArrowFunctionExpression") {
    return null;
  }

  return importSourceOf(loader.body);
};

const targetOf = (context, source) => {
  if (source === null) {
    return null;
  }

  return fileOf(context.filename, source);
};

const isLazyCall = (node) =>
  (node.callee.type === "Identifier" && node.callee.name === "lazy") ||
  (node.callee.type === "MemberExpression" && node.callee.property.name === "lazy");

const lazyDefaultExport = rule((context) => ({
  CallExpression: (node) => {
    if (!isLazyCall(node)) {
      return;
    }

    const source = directImportOf(node.arguments[0]);
    const file = targetOf(context, source);

    if (file !== null && !hasDefaultExport(file)) {
      context.report({ message: LAZY_MESSAGE, node });
    }
  },
}));

const isFeatureSource = (node) => String(node.source?.value ?? "").startsWith("./features/");

const noUiRootHub = rule((context) => {
  if (context.filename.endsWith(".test.ts")) {
    return {};
  }

  const check = (node) => {
    if (node.source !== null && node.importKind !== "type" && isFeatureSource(node) && isFreshSource(context, node)) {
      context.report({ message: HUB_MESSAGE, node });
    }
  };

  return { ExportAllDeclaration: check, ExportNamedDeclaration: check, ImportDeclaration: check };
});

const isComponentSource = (context, node) => {
  const source = String(node.source?.value ?? "");

  if (!source.startsWith("./")) {
    return false;
  }

  const file = fileOf(context.filename, source);

  return file !== null && file.endsWith(".tsx");
};

const isValueNode = (node) => node.exportKind !== "type" && node.importKind !== "type";

const featureIndexLazy = rule((context) => {
  if (path.basename(context.filename) !== "index.ts") {
    return {};
  }

  const check = (node) => {
    if (node.source !== null && isValueNode(node) && isComponentSource(context, node) && isFreshSource(context, node)) {
      context.report({ message: INDEX_MESSAGE, node });
    }
  };

  return { ExportAllDeclaration: check, ExportNamedDeclaration: check, ImportDeclaration: check };
});

const noVoidPlaceholder = rule((context) => ({
  ExpressionStatement: (node) => {
    const { expression } = node;

    if (expression.type === "UnaryExpression" && expression.operator === "void" && expression.argument.type === "Literal") {
      context.report({ message: VOID_MESSAGE, node });
    }
  },
}));

const innerOf = (node) => {
  if (node?.type === "ParenthesizedExpression") {
    return innerOf(node.expression);
  }

  if (node?.type === "LogicalExpression") {
    return innerOf(node.left);
  }

  return node;
};

const isDataMember = (node) =>
  node?.type === "MemberExpression" && !node.computed && node.property.name === "data";

const noMessageDataCast = rule((context) => ({
  TSAsExpression: (node) => {
    if (isDataMember(innerOf(node.expression))) {
      context.report({ message: DATA_CAST_MESSAGE, node });
    }
  },
}));

const noModuleLet = rule((context) => ({
  VariableDeclaration: (node) => {
    if (node.kind === "let" && node.parent?.type === "Program") {
      context.report({ message: MODULE_LET_MESSAGE, node });
    }
  },
}));

const unwrapOperator = (annotation) => {
  if (annotation?.type === "TSTypeOperator") {
    return annotation.typeAnnotation;
  }

  return annotation;
};

const isStringList = (annotation) => {
  const inner = unwrapOperator(annotation);

  return inner?.type === "TSArrayType" && inner.elementType.type === "TSStringKeyword";
};

const typedStringList = rule((context) => ({
  VariableDeclarator: (node) => {
    const name = String(node.id.name ?? "");

    if (name.endsWith("_TYPES") && isStringList(node.id.typeAnnotation?.typeAnnotation ?? null)) {
      context.report({ message: TYPE_LIST_MESSAGE, node });
    }
  },
}));

const calleeName = (node) => {
  if (node.callee.type === "Identifier") {
    return node.callee.name;
  }

  if (node.callee.type === "MemberExpression" && !node.callee.computed) {
    return node.callee.property.name;
  }

  return null;
};

const unwrapAwait = (node) => {
  if (node?.type === "AwaitExpression") {
    return node.argument;
  }

  return node;
};

const readsFile = (node) => {
  const inner = unwrapAwait(node);

  return inner?.type === "CallExpression" && READ_CALLS.has(calleeName(inner));
};

const isJsonParse = (node) =>
  node.callee.type === "MemberExpression" &&
  node.callee.object.type === "Identifier" &&
  node.callee.object.name === "JSON" &&
  node.callee.property.name === "parse";

const noHandJsonRead = rule((context) => ({
  CallExpression: (node) => {
    if (isJsonParse(node) && readsFile(node.arguments[0])) {
      context.report({ message: JSON_READ_MESSAGE, node });
    }
  },
}));

const isOverrideList = (node) =>
  node.parent?.type === "VariableDeclarator" &&
  node.parent.id.type === "Identifier" &&
  node.parent.id.name === "decisionOverrides";

const countUses = (elements) => {
  const uses = new Map();

  for (const element of elements) {
    for (const file of fileValuesOf(partsOf(element)?.files ?? null)) {
      uses.set(file, (uses.get(file) ?? 0) + 1);
    }
  }

  return uses;
};

const overrideFileOnce = rule((context) => ({
  ArrayExpression: (node) => {
    if (!isOverrideList(node) || relativeOf(context.filename) !== "lint/decisions.ts") {
      return;
    }

    for (const [file, count] of countUses(node.elements)) {
      if (count > 1 && count > committedUsesOf(file)) {
        context.report({ message: `${OVERLAP_MESSAGE} File: ${file}.`, node });
      }
    }
  },
}));

const SCOPE_TYPE_NAMES = new Set(["OrgScope"]);

const typeNameOf = (param) => {
  const annotation = param.typeAnnotation?.typeAnnotation ?? null;

  if (annotation?.type !== "TSTypeReference" || annotation.typeName.type !== "Identifier") {
    return null;
  }

  return annotation.typeName.name;
};

const checkScopeParams = (context, node) => {
  for (const param of node.params ?? []) {
    if (SCOPE_TYPE_NAMES.has(typeNameOf(param))) {
      context.report({ message: SCOPE_MESSAGE, node: param });
    }
  }
};

const isApiMember = (node) => {
  const owner = node.parent?.parent ?? null;

  return owner?.type === "TSInterfaceDeclaration" && owner.id.name.endsWith("Api");
};

const noServerScopeParam = rule((context) => ({
  FunctionExpression: (node) => {
    if (node.generator) {
      checkScopeParams(context, node);
    }
  },
  TSMethodSignature: (node) => {
    if (isApiMember(node)) {
      checkScopeParams(context, node);
    }
  },
  TSPropertySignature: (node) => {
    const annotation = node.typeAnnotation?.typeAnnotation ?? null;

    if (annotation?.type === "TSFunctionType" && isApiMember(node)) {
      checkScopeParams(context, annotation);
    }
  },
}));

const SUB_INDEX = /^apps\/desktop\/src\/server\/[a-z-]+\/(?:[a-z-]+\/)?index\.js$/u;

const CORE_AREAS = new Set(["preview", "store"]);

const SERVER_ROOT = /^apps\/desktop\/src\/server\/(?<area>[a-z0-9-]+)\//u;

const areaOf = (relative) => SERVER_ROOT.exec(relative)?.groups.area ?? null;

const deepTargetOf = (context, source) => {
  if (!source.startsWith(".")) {
    return null;
  }

  const target = relativeOf(path.resolve(path.dirname(context.filename), source));
  const area = areaOf(target);

  if (area === null || !CORE_AREAS.has(area) || SUB_INDEX.test(target)) {
    return null;
  }

  return area;
};

const noDeepStoreImport = rule((context) => {
  const ownArea = areaOf(relativeOf(context.filename));

  const check = (node) => {
    const area = deepTargetOf(context, String(node.source?.value ?? ""));

    if (area !== null && area !== ownArea && isFreshSource(context, node)) {
      context.report({ message: DEEP_MESSAGE, node: node.source });
    }
  };

  return { ExportNamedDeclaration: check, ImportDeclaration: check };
});

const catchupRules = {
  ...autofixRules,
  "feature-index-lazy": featureIndexLazy,
  "lazy-default-export": lazyDefaultExport,
  "no-deep-store-import": noDeepStoreImport,
  "no-hand-json-read": noHandJsonRead,
  "no-message-data-cast": noMessageDataCast,
  "no-module-let": noModuleLet,
  "no-server-scope-param": noServerScopeParam,
  "no-ui-root-hub": noUiRootHub,
  "no-void-placeholder": noVoidPlaceholder,
  "override-file-once": overrideFileOnce,
  "typed-string-list": typedStringList,
};

export { catchupRules };
