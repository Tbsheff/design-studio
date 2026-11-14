import { parse } from "@babel/parser";
import { parse as parseHtml } from "parse5";
import type { DefaultTreeAdapterMap } from "parse5";

import { isJsxNode } from "./babel-ast.js";
import type { AstNode, JSXElement } from "./babel-ast.js";
import { childNodesOf, pluginsOf } from "./scan-jsx.js";

type HtmlNode = DefaultTreeAdapterMap["node"];

type TagTest = (tag: string, open: string) => boolean;

interface StyledQuery {
  readonly column: number;
  readonly end: number;
  readonly isMatch: TagTest;
  readonly line: number;
  readonly start: number;
}

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

const isAround = (extent: Extent, outer: Extent, query: StyledQuery): boolean =>
  extent.openStart >= outer.openEnd &&
  extent.closeEnd <= outer.closeStart &&
  extent.openEnd <= query.start &&
  extent.closeStart >= query.end;

const toInnermost = (
  extents: readonly Extent[],
  source: string,
  outer: Extent,
  query: StyledQuery
): Extent | null => {
  let found: Extent | null = null;

  for (const extent of extents) {
    const open = source.slice(extent.openStart, extent.openEnd);

    if (
      isAround(extent, outer, query) &&
      query.isMatch(extent.tag, open) &&
      extent.openStart >= (found?.openStart ?? -1)
    ) {
      found = extent;
    }
  }

  return found;
};

const toJsxExtents = (file: string, source: string): Extent[] => {
  const program = parse(source, {
    errorRecovery: false,
    plugins: pluginsOf(file),
    sourceType: "module",
  });

  const stack: AstNode[] = [program];
  const extents: Extent[] = [];

  for (let node = stack.pop(); node; node = stack.pop()) {
    if (isJsxNode(node) && node.type === "JSXElement") {
      const extent = toJsxExtentOf(node);

      if (extent) {
        extents.push(extent);
      }
    }

    stack.push(...childNodesOf(node));
  }

  return extents;
};

const toHtmlExtents = (source: string): Extent[] => {
  const stack: HtmlNode[] = [
    parseHtml(source, { sourceCodeLocationInfo: true }),
  ];

  const extents: Extent[] = [];

  for (let node = stack.pop(); node; node = stack.pop()) {
    const extent = toHtmlExtentOf(node);

    if (extent) {
      extents.push(extent);
    }

    stack.push(...toChildrenOf(node));
  }

  return extents;
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

const toInnerExtent = (
  file: string,
  source: string,
  outer: Extent,
  query: StyledQuery
): Extent | null => {
  if (HTML_FILE.test(file)) {
    return toInnermost(toHtmlExtents(source), source, outer, query);
  }

  return toInnermost(toJsxExtents(file, source), source, outer, query);
};

const toStyledExtent = (
  file: string,
  source: string,
  query: StyledQuery
): Extent | null => {
  const layer = toLayerExtent(file, source, query.line, query.column);

  if (layer === null) {
    return null;
  }

  if (query.isMatch(layer.tag, source.slice(layer.openStart, layer.openEnd))) {
    return layer;
  }

  return toInnerExtent(file, source, layer, query);
};

export { HTML_FILE, toLayerExtent as layerExtent, toStyledExtent };

export type { Extent, StyledQuery };
