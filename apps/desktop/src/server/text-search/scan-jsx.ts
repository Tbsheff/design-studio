import { parse } from "@babel/parser";
import type { ParserPlugin } from "@babel/parser";

import { isJsxNode } from "./babel-ast.js";
import type {
  AstNode,
  ContainerExpression,
  JSXAttribute,
  JSXElement,
  JSXFragment,
  JSXOpeningElement,
  JSXText,
  StringLiteral,
  TemplateLiteral,
} from "./babel-ast.js";
import { TEXT_SEARCH_ATTRIBUTES } from "./deps.js";
import type { TextHitKind, TextLayer } from "./deps.js";
import { encodeJsxText, jsString, markupAttribute } from "./encode.js";
import { markupPieces, plainPieces } from "./entities.js";
import { toSegment } from "./segment.js";
import type { Piece, Segment } from "./segment.js";

interface Context {
  readonly file: string;
  readonly source: string;
}

interface Place {
  readonly kind: TextHitKind;
  readonly attribute: string | null;
  readonly layer: TextLayer;
}

const ATTRIBUTES = new Set<string>(TEXT_SEARCH_ATTRIBUTES);

const pluginsOf = (file: string): ParserPlugin[] => {
  if (/\.tsx?$/u.test(file)) {
    return ["jsx", "typescript"];
  }

  return ["jsx"];
};

const isAstNode = (value: unknown): value is AstNode =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { type?: unknown }).type === "string";

const childNodesOf = (node: AstNode): AstNode[] => {
  const out: AstNode[] = [];

  for (const [key, value] of Object.entries(node)) {
    if (key !== "loc" && !key.endsWith("Comments")) {
      const items: unknown[] = [value].flat();
      out.push(...items.filter((item) => isAstNode(item)));
    }
  }

  return out;
};

const nameOf = (name: JSXOpeningElement["name"]): string => {
  if (name.type === "JSXIdentifier") {
    return name.name;
  }

  if (name.type === "JSXNamespacedName") {
    return `${name.namespace.name}:${name.name.name}`;
  }

  return `${nameOf(name.object)}.${name.property.name}`;
};

const layerOf = (
  context: Context,
  node: JSXElement | JSXFragment
): TextLayer => {
  let tag = "<>";

  if (node.type === "JSXElement") {
    tag = nameOf(node.openingElement.name);
  }

  return {
    col: (node.loc?.start.column ?? 0) + 1,
    file: context.file,
    line: node.loc?.start.line ?? 1,
    tag,
  };
};

const quotedPieces = (
  context: Context,
  start: number,
  end: number,
  value: string
): Piece[] => {
  if (context.source.slice(start, end).includes("\\")) {
    return [{ end, start, text: value }];
  }

  return plainPieces(context.source, start, end);
};

const literalValue = (node: StringLiteral | TemplateLiteral): string => {
  if (node.type === "StringLiteral") {
    return node.value;
  }

  return node.quasis[0]?.value.cooked ?? "";
};

const stringSegment = (
  context: Context,
  node: StringLiteral | TemplateLiteral,
  place: Place
): Segment | null => {
  const start = (node.start ?? 0) + 1;
  const end = (node.end ?? 0) - 1;
  const value = literalValue(node);

  if (value.trim() === "") {
    return null;
  }

  return toSegment(
    { ...place, encode: jsString(context.source.charAt(start - 1)) },
    quotedPieces(context, start, end, value)
  );
};

const literalSegments = (
  context: Context,
  node: ContainerExpression,
  place: Place
): (Segment | null)[] => {
  if (node.type === "StringLiteral") {
    return [stringSegment(context, node, place)];
  }

  if (node.type === "TemplateLiteral" && node.expressions.length === 0) {
    return [stringSegment(context, node, place)];
  }

  if (node.type === "ConditionalExpression") {
    return [
      ...literalSegments(context, node.consequent, place),
      ...literalSegments(context, node.alternate, place),
    ];
  }

  if (node.type === "LogicalExpression" && node.operator === "&&") {
    return literalSegments(context, node.right, place);
  }

  if (node.type === "LogicalExpression") {
    return [
      ...literalSegments(context, node.left, place),
      ...literalSegments(context, node.right, place),
    ];
  }

  return [];
};

const attributeSegments = (
  context: Context,
  attribute: JSXAttribute,
  layer: TextLayer
): (Segment | null)[] => {
  if (attribute.name.type !== "JSXIdentifier" || !attribute.value) {
    return [];
  }

  const { name } = attribute.name;

  if (!ATTRIBUTES.has(name)) {
    return [];
  }

  const place: Place = { attribute: name, kind: "attribute", layer };
  const { value } = attribute;

  if (value.type === "StringLiteral") {
    const start = (value.start ?? 0) + 1;
    const end = (value.end ?? 0) - 1;

    return [
      toSegment(
        { ...place, encode: markupAttribute(context.source.charAt(start - 1)) },
        markupPieces(context.source, start, end)
      ),
    ];
  }

  if (value.type === "JSXExpressionContainer") {
    return literalSegments(context, value.expression, place);
  }

  return [];
};

const textSegment = (
  context: Context,
  node: JSXText,
  layer: TextLayer
): Segment | null => {
  if (node.value.trim() === "") {
    return null;
  }

  return toSegment(
    { attribute: null, encode: encodeJsxText, kind: "text", layer },
    markupPieces(context.source, node.start ?? 0, node.end ?? 0)
  );
};

const childSegments = (
  context: Context,
  child: JSXElement["children"][number],
  layer: TextLayer
): (Segment | null)[] => {
  if (child.type === "JSXText") {
    return [textSegment(context, child, layer)];
  }

  if (child.type === "JSXExpressionContainer") {
    return literalSegments(context, child.expression, {
      attribute: null,
      kind: "literal",
      layer,
    });
  }

  return [];
};

const elementSegments = (
  context: Context,
  node: JSXElement | JSXFragment
): (Segment | null)[] => {
  const layer = layerOf(context, node);
  const out: (Segment | null)[] = [];

  if (node.type === "JSXElement") {
    for (const attribute of node.openingElement.attributes) {
      if (attribute.type === "JSXAttribute") {
        out.push(...attributeSegments(context, attribute, layer));
      }
    }
  }

  for (const child of node.children) {
    out.push(...childSegments(context, child, layer));
  }

  return out;
};

const jsxSegments = (file: string, source: string): Segment[] => {
  const context: Context = { file, source };

  const program = parse(source, {
    errorRecovery: false,
    plugins: pluginsOf(file),
    sourceType: "module",
  });

  const segments: Segment[] = [];
  const stack: AstNode[] = [program];

  while (stack.length > 0) {
    const node = stack.pop();

    if (!node) {
      break;
    }

    if (isJsxNode(node)) {
      segments.push(
        ...elementSegments(context, node).filter((segment) => segment !== null)
      );
    }

    stack.push(...childNodesOf(node));
  }

  return segments;
};

export { jsxSegments };
