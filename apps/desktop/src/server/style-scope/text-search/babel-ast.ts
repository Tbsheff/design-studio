import type { parse } from "@babel/parser";

interface AstNode {
  readonly type: string;
}

type BabelFile = ReturnType<typeof parse>;

type Statement = BabelFile["program"]["body"][number];

type Expression = Extract<
  Statement,
  { type: "ExpressionStatement" }
>["expression"];

type JSXElement = Extract<Expression, { type: "JSXElement" }>;

type JSXFragment = Extract<Expression, { type: "JSXFragment" }>;

type StringLiteral = Extract<Expression, { type: "StringLiteral" }>;

type TemplateLiteral = Extract<Expression, { type: "TemplateLiteral" }>;

type JSXChild = JSXElement["children"][number];

type JSXText = Extract<JSXChild, { type: "JSXText" }>;

type ContainerExpression = Extract<
  JSXChild,
  { type: "JSXExpressionContainer" }
>["expression"];

type JSXOpeningElement = JSXElement["openingElement"];

type JSXAttribute = Extract<
  JSXOpeningElement["attributes"][number],
  { type: "JSXAttribute" }
>;

const isJsxNode = (node: AstNode): node is JSXElement | JSXFragment =>
  node.type === "JSXElement" || node.type === "JSXFragment";

export { isJsxNode };

export type {
  AstNode,
  ContainerExpression,
  JSXAttribute,
  JSXElement,
  JSXFragment,
  JSXOpeningElement,
  JSXText,
  StringLiteral,
  TemplateLiteral,
};
