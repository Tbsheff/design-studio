import { parse as parseJsx } from "@babel/parser";
import type { ParserPlugin } from "@babel/parser";
import { parse as parseHtml } from "parse5";
import type { DefaultTreeAdapterMap } from "parse5";

import type { ElementSpan } from "./engine/to-changed-layers.js";

type HtmlNode =
  | DefaultTreeAdapterMap["childNode"]
  | DefaultTreeAdapterMap["parentNode"];

type HtmlElement = DefaultTreeAdapterMap["element"];

const HTML_FILE = /\.html?$/iu;

const JSX_FILE = /\.[jt]sx$/iu;

const TS_FILE = /\.tsx$/iu;

const HOST_TAG = /^[a-z]/u;

const isHtmlElement = (node: HtmlNode): node is HtmlElement =>
  "tagName" in node;

const toHtmlChildren = (node: HtmlNode): readonly HtmlNode[] => {
  if (isHtmlElement(node) && node.tagName === "template") {
    return (node as DefaultTreeAdapterMap["template"]).content.childNodes;
  }

  if ("childNodes" in node) {
    return node.childNodes;
  }

  return [];
};

const toHtmlSpan = (element: HtmlElement, file: string): ElementSpan | null => {
  const location = element.sourceCodeLocation;
  const startTag = location?.startTag;

  if (!location || !startTag) {
    return null;
  }

  return {
    end: { col: location.endCol, line: location.endLine },
    loc: `${file}:${startTag.startLine}:${startTag.startCol}`,
    start: { col: startTag.startCol, line: startTag.startLine },
    tag: element.tagName,
    tagEnd: { col: startTag.endCol, line: startTag.endLine },
  };
};

const toHtmlBody = (node: HtmlNode): HtmlElement | null => {
  for (const child of toHtmlChildren(node)) {
    if (isHtmlElement(child) && child.tagName === "body") {
      return child;
    }

    const found = toHtmlBody(child);

    if (found) {
      return found;
    }
  }

  return null;
};

const toHtmlSpanList = (node: HtmlNode, file: string): ElementSpan[] =>
  toHtmlChildren(node).flatMap((child) => {
    if (!isHtmlElement(child)) {
      return [];
    }

    const span = toHtmlSpan(child, file);
    const inner = toHtmlSpanList(child, file);

    if (span) {
      inner.unshift(span);
    }

    return inner;
  });

const toHtmlSpans = (source: string, file: string): readonly ElementSpan[] => {
  const body = toHtmlBody(parseHtml(source, { sourceCodeLocationInfo: true }));

  if (!body) {
    return [];
  }

  return toHtmlSpanList(body, file);
};

type ParsedJsx = ReturnType<typeof parseJsx>;

interface JsxPoint {
  readonly column: number;
  readonly line: number;
}

interface JsxRange {
  readonly end: JsxPoint;
  readonly start: JsxPoint;
}

interface JsxName {
  readonly name: string | null;
  readonly type: string | null;
}

interface JsxNode {
  readonly loc: JsxRange | null;
  readonly name: JsxName | null;
  readonly openingElement: JsxNode | null;
  readonly type: string | null;
}

const isJsxNode = (value: unknown): value is JsxNode =>
  typeof value === "object" && value !== null;

const toJsxChildren = (node: JsxNode): unknown[] => {
  const children: unknown[] = [];

  for (const [key, value] of Object.entries(node)) {
    if (key !== "loc") {
      children.push(value);
    }
  }

  return children;
};

const toJsxSpan = (node: JsxNode, file: string): ElementSpan | null => {
  const opening = node.openingElement;
  const name = opening?.name;
  const whole = node.loc;
  const tag = opening?.loc;

  if (
    name?.type !== "JSXIdentifier" ||
    !HOST_TAG.test(name.name ?? "") ||
    !whole ||
    !tag
  ) {
    return null;
  }

  return {
    end: { col: whole.end.column + 1, line: whole.end.line },
    loc: `${file}:${tag.start.line}:${tag.start.column + 1}`,
    start: { col: tag.start.column + 1, line: tag.start.line },
    tag: name.name ?? "",
    tagEnd: { col: tag.end.column + 1, line: tag.end.line },
  };
};

const toJsxSpanList = (root: ParsedJsx, file: string): ElementSpan[] => {
  const spans: ElementSpan[] = [];
  const stack: unknown[] = [root];

  while (stack.length > 0) {
    const node = stack.pop();

    if (isJsxNode(node)) {
      const span = node.type === "JSXElement" && toJsxSpan(node, file);

      if (span) {
        spans.push(span);
      }

      stack.push(...toJsxChildren(node));
    }
  }

  return spans;
};

const toJsxPlugins = (file: string): ParserPlugin[] => {
  if (TS_FILE.test(file)) {
    return ["jsx", "typescript"];
  }

  return ["jsx"];
};

const toJsxSpans = (source: string, file: string): readonly ElementSpan[] => {
  try {
    const ast = parseJsx(source, {
      errorRecovery: false,
      plugins: toJsxPlugins(file),
      sourceType: "module",
    });

    return toJsxSpanList(ast, file);
  } catch {
    return [];
  }
};

const isSpanFile = (file: string): boolean =>
  HTML_FILE.test(file) || JSX_FILE.test(file);

const toElementSpans = (
  source: string | null,
  file: string
): readonly ElementSpan[] => {
  if (source === null) {
    return [];
  }

  if (HTML_FILE.test(file)) {
    return toHtmlSpans(source, file);
  }

  if (JSX_FILE.test(file)) {
    return toJsxSpans(source, file);
  }

  return [];
};

export {
  isHtmlElement,
  isSpanFile,
  toElementSpans,
  toHtmlChildren,
  toHtmlSpan,
};

export type { HtmlElement, HtmlNode };
