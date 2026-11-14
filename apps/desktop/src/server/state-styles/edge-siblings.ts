import { parse } from "parse5";
import type { DefaultTreeAdapterMap } from "parse5";

import {
  findElementAt,
  findJsxElement,
  isEdgeStateName,
  jsxAncestors,
  parseSource,
} from "./deps.js";
import type {
  SourceLoc,
  StateEdgeKind,
  StateLayer,
  StyleSite,
} from "./deps.js";

type JsxElement = NonNullable<ReturnType<typeof findJsxElement>>;

type AstNode = ReturnType<typeof jsxAncestors>[number];

type HtmlElement = DefaultTreeAdapterMap["element"];

const TS_FILE = /\.tsx$/iu;

const LIST_CALLS = new Set(["flatMap", "map"]);

const SIBLINGS_MIN = 2;

const toTagOf = (element: JsxElement): string | null => {
  const { name } = element.openingElement;

  if (name.type !== "JSXIdentifier") {
    return null;
  }

  return name.name;
};

const isListCall = (node: AstNode): boolean =>
  node.type === "CallExpression" &&
  node.callee.type === "MemberExpression" &&
  node.callee.property.type === "Identifier" &&
  LIST_CALLS.has(node.callee.property.name);

const isSameTag = (node: AstNode, tag: string): boolean =>
  node.type === "JSXElement" && toTagOf(node) === tag;

const toJsxSiblings = (parent: AstNode, tag: string): number => {
  if (parent.type !== "JSXElement" && parent.type !== "JSXFragment") {
    return 0;
  }

  return parent.children.filter((child) => isSameTag(child, tag)).length;
};

const toCountKind = (count: number): StateEdgeKind | null => {
  if (count >= SIBLINGS_MIN) {
    return "siblings";
  }

  return null;
};

const toJsxEdgeKind = (
  code: string,
  loc: SourceLoc,
  isTypescript: boolean
): StateEdgeKind | null => {
  const root = parseSource(code, isTypescript).program;
  const element = findJsxElement(root, { col: loc.col, line: loc.line });

  if (element === null) {
    return null;
  }

  const tag = toTagOf(element);

  if (tag === null) {
    return null;
  }

  for (const node of jsxAncestors(root, element)) {
    if (isListCall(node)) {
      return "list";
    }

    if (node.type === "JSXElement" || node.type === "JSXFragment") {
      return toCountKind(toJsxSiblings(node, tag));
    }
  }

  return null;
};

const isHtmlElement = (node: unknown): node is HtmlElement =>
  typeof node === "object" && node !== null && "tagName" in node;

const toHtmlEdgeKind = (code: string, loc: SourceLoc): StateEdgeKind | null => {
  const document = parse(code, { sourceCodeLocationInfo: true });
  const element = findElementAt(document, { col: loc.col, line: loc.line });

  const parent = element?.parentNode ?? null;

  if (element === null || parent === null) {
    return null;
  }

  const same = parent.childNodes.filter(
    (child) => isHtmlElement(child) && child.tagName === element.tagName
  );

  return toCountKind(same.length);
};

const toSourceEdgeKind = (
  site: StyleSite,
  loc: SourceLoc
): StateEdgeKind | null => {
  if (site.html) {
    return toHtmlEdgeKind(site.code, loc);
  }

  return toJsxEdgeKind(site.code, loc, TS_FILE.test(site.relative));
};

const hasEdgeStyles = (layer: StateLayer): boolean =>
  layer.overrides.some((entry) => isEdgeStateName(entry.state));

const toEdgeKind = (
  site: StyleSite,
  loc: SourceLoc,
  layer: StateLayer
): StateEdgeKind | null => {
  if (layer.mode === "none") {
    return null;
  }

  const kind = toSourceEdgeKind(site, loc);

  if (kind === null && hasEdgeStyles(layer)) {
    return "siblings";
  }

  return kind;
};

export { toEdgeKind };
