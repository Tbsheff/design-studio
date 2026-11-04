import path from "node:path";

import { isServiceFilePath } from "./facts.js";
import { rule } from "./ast.js";

const LIVE_IMPORT = /^(?:effect|\.\.\/handlers\/[a-z0-9-]+\/live\.js)$/u;

const CORE_SOURCE = "../store/index.js";

const CORE_SERVICES = new Set([
  "Authorizer",
  "LocalOrgScope",
  "LocalPrincipal",
  "ProjectAccess",
]);

const LIVE_MESSAGE =
  "Importing a service layer into the aggregator main/live-layer.ts is banned. Use the domain live layer: provide the service in src/server/handlers/<domain>/live.ts.";

const INDEX_MESSAGE =
  "Importing a service file from another folder past its index.ts is banned. Use the export from src/server/<area>/index.ts.";



const DEEP_AREA = /^\.\.\/\.\.\/(?!platform\/)[a-z0-9-]+\/(?!index\.js$).+/u;

const DEEP_MESSAGE =
  "A handler import past an area index.ts is banned. Use the export from src/server/<area>/index.ts.";

const BRIDGE_MESSAGE =
  "Mapping Cause.UnknownError by hand is banned. Use attemptKnown from src/server/platform/attempt/index.ts.";

const STUB_MESSAGE =
  "A route that fails with NotImplemented is banned. Use a real handler, or leave the route out of the group in cloud/api/src/http/groups.";

const GUESS_MESSAGE =
  "Guessing a result kind from the output shape in an aggregator is banned. Use the output schema the action declares, mapped in an owned adapter file such as src/server/mcp/tool-result.ts.";

const GUESS_CALLS = new Set(["is", "Struct"]);

const checkSource = (context, node) => {
  const source = node.source?.value ?? null;

  if (source !== null && DEEP_AREA.test(source)) {
    context.report({ message: DEEP_MESSAGE, node: node.source });
  }
};

const noDeepAreaImport = rule((context) => ({
  ExportAllDeclaration: (node) => checkSource(context, node),
  ExportNamedDeclaration: (node) => checkSource(context, node),
  ImportDeclaration: (node) => checkSource(context, node),
}));

const noLocalErrorBridge = rule((context) => ({
  TSQualifiedName: (node) => {
    const isUnknown =
      node.left.type === "Identifier" &&
      node.left.name === "Cause" &&
      node.right.name === "UnknownError";

    if (isUnknown) {
      context.report({ message: BRIDGE_MESSAGE, node });
    }
  },
}));

const noStubRoute = rule((context) => ({
  Identifier: (node) => {
    if (node.name === "NotImplemented") {
      context.report({ message: STUB_MESSAGE, node });
    }
  },
}));

const noOutputGuess = rule((context) => ({
  MemberExpression: (node) => {
    const isSchema =
      node.object.type === "Identifier" &&
      node.object.name === "Schema" &&
      !node.computed &&
      GUESS_CALLS.has(node.property.name);

    if (isSchema) {
      context.report({ message: GUESS_MESSAGE, node });
    }
  },
}));

const isCoreImport = (node) =>
  node.source.value === CORE_SOURCE &&
  node.specifiers.every(
    (specifier) =>
      specifier.type === "ImportSpecifier" &&
      CORE_SERVICES.has(specifier.imported.name)
  );

const isLiveImport = (node) =>
  node.importKind === "type" ||
  LIVE_IMPORT.test(String(node.source.value)) ||
  isCoreImport(node);

const liveLayerDomain = rule((context) => ({
  ImportDeclaration: (node) => {
    if (!isLiveImport(node)) {
      context.report({ message: LIVE_MESSAGE, node: node.source });
    }
  },
}));

const resolveTs = (context, source) => {
  if (!source.startsWith(".")) {
    return null;
  }

  return path.resolve(path.dirname(context.filename), source.replace(/\.js$/u, ".ts"));
};

const isOwnArea = (filename, target) => {
  const folder = path.dirname(filename);

  if (path.dirname(target) === folder) {
    return true;
  }

  return path.basename(filename) === "index.ts" && target.startsWith(`${folder}${path.sep}`);
};

const checkIndexImport = (context, node) => {
  const source = node.source?.value ?? null;
  const target = resolveTs(context, String(source));

  if (target === null || isOwnArea(context.filename, target)) {
    return;
  }

  if (isServiceFilePath(target)) {
    context.report({ message: INDEX_MESSAGE, node: node.source });
  }
};

const serviceImportIndex = rule((context) => ({
  ExportAllDeclaration: (node) => checkIndexImport(context, node),
  ExportNamedDeclaration: (node) => {
    if (node.source) {
      checkIndexImport(context, node);
    }
  },
  ImportDeclaration: (node) => checkIndexImport(context, node),
}));

export {
  liveLayerDomain,
  noDeepAreaImport,
  noLocalErrorBridge,
  noOutputGuess,
  noStubRoute,
  serviceImportIndex,
};
