import { lastName, rule } from "./ast.js";

const DECODE_NAME = /^decode/u;

const SCHEMA_NAME = /Schema$/u;

const FUNCTION_TYPES = new Set(["ArrowFunctionExpression", "FunctionDeclaration", "FunctionExpression"]);

const DECODE_MESSAGE =
  "A Schema decoder built inside a function in an adapter is banned (W7, P1), because it is built again on each request. Use a module-level const, for example const decodeComment = Schema.decodeUnknownEffect(CommentPayloadSchema), and call it in the route.";

const COERCE_MESSAGE =
  "String(x ?? \"\") on a request field is banned (E3), because it accepts any value with no schema. Use a Schema.Struct for the body, decoded by a module-level decoder.";

const SERVICE_OPTION_MESSAGE =
  "Effect.serviceOption is banned (S7), because it hides the service from R, so the S7 read and write check cannot see it. Use yield* <Service> in a Context.Service layer, for example src/server/publish/publication-router.ts.";

const isSchemaDecode = (callee) =>
  callee.type === "MemberExpression" &&
  callee.object.type === "Identifier" &&
  callee.object.name === "Schema" &&
  DECODE_NAME.test(lastName(callee) ?? "");

const isInFunction = (node) => {
  let current = node.parent;

  while (current) {
    if (FUNCTION_TYPES.has(current.type)) {
      return true;
    }

    current = current.parent;
  }

  return false;
};

const noInlineDecode = rule((context) => ({
  CallExpression: (node) => {
    const [schema = null] = node.arguments;

    if (!isSchemaDecode(node.callee) || schema?.type !== "Identifier" || !SCHEMA_NAME.test(schema.name)) {
      return;
    }

    if (isInFunction(node)) {
      context.report({ message: DECODE_MESSAGE, node });
    }
  },
}));

const isFieldFallback = (node) =>
  node?.type === "LogicalExpression" && node.operator === "??" && node.left.type === "MemberExpression";

const noStringCoerce = rule((context) => ({
  CallExpression: (node) => {
    const [first = null] = node.arguments;

    if (node.callee.type === "Identifier" && node.callee.name === "String" && isFieldFallback(first)) {
      context.report({ message: COERCE_MESSAGE, node });
    }
  },
}));

const noServiceOption = rule((context) => ({
  CallExpression: (node) => {
    const { callee } = node;

    if (callee.type === "MemberExpression" && callee.object.type === "Identifier" && callee.object.name === "Effect" && lastName(callee) === "serviceOption") {
      context.report({ message: SERVICE_OPTION_MESSAGE, node });
    }
  },
}));

export { noInlineDecode, noServiceOption, noStringCoerce };
