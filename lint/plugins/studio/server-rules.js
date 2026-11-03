import { rule } from "./ast.js";

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

export { noDeepAreaImport, noLocalErrorBridge, noOutputGuess, noStubRoute };
