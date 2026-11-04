import { rule } from "./ast.js";

const OPTIONAL_NULL_MESSAGE =
  "An optional field whose type also allows null is banned. Use a required field typed T | null (AGENTS.md L4).";

const hasNull = (type) =>
  type?.type === "TSUnionType" &&
  type.types.some((member) => member.type === "TSNullKeyword");

const noOptionalNull = rule((context) => ({
  TSPropertySignature: (node) => {
    if (node.optional && hasNull(node.typeAnnotation?.typeAnnotation)) {
      context.report({ message: OPTIONAL_NULL_MESSAGE, node });
    }
  },
}));

export { noOptionalNull };
