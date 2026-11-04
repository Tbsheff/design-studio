import { rule } from "./ast.js";

const DOM_QUERIES = new Set([
  "getElementById",
  "getElementsByClassName",
  "getElementsByTagName",
  "querySelector",
  "querySelectorAll",
]);

const DOM_MESSAGE =
  "A DOM query or a MutationObserver in a UI feature is banned, because it reaches into another component. Use a slot, a render prop or a callback prop that src/ui/app or the owner component passes in.";

const AWAIT_MESSAGE =
  "A write that is fired with no await is banned, because state changes before the write ends. Use startTransition(async () => { const result = await action.run(input); ... }) with useTransition from react.";

const APP_IMPORT_MESSAGE =
  "Importing desktop app code (src/shared) into a cloud file is banned. Use the one bridge file apps/api/src/shared-actions.ts, and packages/common/actions when the layout wave lands.";

const RUN_METHODS = new Set(["mutate", "run"]);

const APP_SOURCE = /(?:^|\/)src\/shared\//u;

const noDomQuery = rule((context) => ({
  MemberExpression: (node) => {
    if (!node.computed && DOM_QUERIES.has(node.property.name)) {
      context.report({ message: DOM_MESSAGE, node });
    }
  },
  NewExpression: (node) => {
    if (node.callee.type === "Identifier" && node.callee.name === "MutationObserver") {
      context.report({ message: DOM_MESSAGE, node });
    }
  },
}));

const isRunMember = (callee) =>
  callee.type === "MemberExpression" && !callee.computed && RUN_METHODS.has(callee.property.name);

const isRunCall = (node) =>
  node.type === "CallExpression" &&
  isRunMember(node.callee) &&
  node.arguments[0]?.type === "ObjectExpression";

const awaitWrite = rule((context) => ({
  ExpressionStatement: (node) => {
    if (isRunCall(node.expression)) {
      context.report({ message: AWAIT_MESSAGE, node });
    }
  },
}));

const checkAppSource = (context, node) => {
  const source = node.source?.value ?? null;

  if (source !== null && APP_SOURCE.test(String(source))) {
    context.report({ message: APP_IMPORT_MESSAGE, node: node.source });
  }
};

const noAppImport = rule((context) => ({
  ExportAllDeclaration: (node) => checkAppSource(context, node),
  ExportNamedDeclaration: (node) => checkAppSource(context, node),
  ImportDeclaration: (node) => checkAppSource(context, node),
}));

export { awaitWrite, noAppImport, noDomQuery };
