import { parse } from "@babel/parser";
import { parse as parseHtml } from "parse5";
import type { DefaultTreeAdapterMap } from "parse5";

import { isJsxNode } from "./babel-ast.js";
import type { AstNode, JSXElement } from "./babel-ast.js";
import { childNodesOf, pluginsOf } from "./scan-jsx.js";

type HtmlNode = DefaultTreeAdapterMap["node"];

interface Extent {
  readonly closeEnd: number;
  readonly closeStart: number;
  readonly openEnd: number;
  readonly openStart: number;
  readonly tag: string;
}

const HTML_FILE = /\.html?$/iu;

const toJsxExtentOf = (element: JSXElement): Extent | null => {
  const closing = element.closingElement;
  const { name } = element.openingElement;

  if (!closing || name.type !== "JSXIdentifier") {
    return null;
  }

  return {
    closeEnd: closing.end ?? 0,
    closeStart: closing.start ?? 0,
    openEnd: element.openingElement.end ?? 0,
    openStart: element.start ?? 0,
    tag: name.name,
  };
};

const toJsxElementAt = (
  node: AstNode,
  line: number,
  column: number
): JSXElement | null => {
  if (
    isJsxNode(node) &&
    node.type === "JSXElement" &&
    node.loc?.start.line === line &&
    node.loc.start.column + 1 === column
  ) {
    return node;
  }

  return null;
};

const toJsxExtent = (
  file: string,
  source: string,
  line: number,
  column: number
): Extent | null => {
  const program = parse(source, {
    errorRecovery: false,
    plugins: pluginsOf(file),
    sourceType: "module",
  });

  const stack: AstNode[] = [program];

  while (stack.length > 0) {
    const node = stack.pop();

    if (!node) {
      break;
    }

    const element = toJsxElementAt(node, line, column);

    if (element) {
      return toJsxExtentOf(element);
    }

    stack.push(...childNodesOf(node));
  }

  return null;
};

const toChildrenOf = (node: HtmlNode): HtmlNode[] => {
  const children: HtmlNode[] = [];

  if ("childNodes" in node) {
    children.push(...node.childNodes);
  }

  if ("content" in node && node.content) {
    children.push(...node.content.childNodes);
  }

  return children;
};

const toHtmlExtentOf = (node: HtmlNode): Extent | null => {
  if (!("tagName" in node)) {
    return null;
  }

  const location = node.sourceCodeLocation;

  if (!location?.startTag || !location.endTag) {
    return null;
  }

  return {
    closeEnd: location.endTag.endOffset,
    closeStart: location.endTag.startOffset,
    openEnd: location.startTag.endOffset,
    openStart: location.startTag.startOffset,
    tag: node.tagName,
  };
};

const isHtmlAt = (node: HtmlNode, line: number, column: number): boolean =>
  "tagName" in node &&
  node.sourceCodeLocation?.startLine === line &&
  node.sourceCodeLocation.startCol === column;

const toHtmlExtent = (
  source: string,
  line: number,
  column: number
): Extent | null => {
  const stack: HtmlNode[] = [
    parseHtml(source, { sourceCodeLocationInfo: true }),
  ];

  while (stack.length > 0) {
    const node = stack.pop();

    if (!node) {
      break;
    }

    if (isHtmlAt(node, line, column)) {
      return toHtmlExtentOf(node);
    }

    stack.push(...toChildrenOf(node));
  }

  return null;
};

const toLayerExtent = (
  file: string,
  source: string,
  line: number,
  column: number
): Extent | null => {
  if (HTML_FILE.test(file)) {
    return toHtmlExtent(source, line, column);
  }

  return toJsxExtent(file, source, line, column);
};

export { HTML_FILE, toLayerExtent as layerExtent };

export type { Extent };
