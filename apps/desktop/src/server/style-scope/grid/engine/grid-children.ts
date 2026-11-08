import { parse } from "parse5";
import type { DefaultTreeAdapterMap } from "parse5";

import { findElementAt, findJsxElement, parseSource } from "./deps.js";

type HtmlElement = DefaultTreeAdapterMap["element"];

type JsxElement = NonNullable<ReturnType<typeof findJsxElement>>;

type JsxName = JsxElement["openingElement"]["name"];

interface ChildLoc {
  readonly col: number;
  readonly line: number;
  readonly tag: string;
}

interface ChildPosition {
  readonly col: number;
  readonly line: number;
}

const isHtmlElement = (node: unknown): node is HtmlElement =>
  typeof node === "object" && node !== null && "tagName" in node;

const toHtmlChildren = (source: string, at: ChildPosition): ChildLoc[] => {
  const document = parse(source, { sourceCodeLocationInfo: true });
  const parent = findElementAt(document, at);

  if (parent === null) {
    return [];
  }

  return parent.childNodes.flatMap((child) => {
    if (!isHtmlElement(child)) {
      return [];
    }

    const start = child.sourceCodeLocation?.startTag;

    if (!start) {
      return [];
    }

    return [{ col: start.startCol, line: start.startLine, tag: child.tagName }];
  });
};

const toJsxTag = (name: JsxName): string => {
  if (name.type === "JSXIdentifier") {
    return name.name;
  }

  return "component";
};

const toJsxChildren = (
  source: string,
  at: ChildPosition,
  isTypescript: boolean
): ChildLoc[] => {
  const parent = findJsxElement(parseSource(source, isTypescript).program, at);

  if (parent === null) {
    return [];
  }

  return parent.children.flatMap((child) => {
    if (child.type !== "JSXElement") {
      return [];
    }

    const start = child.openingElement.loc?.start;

    if (!start) {
      return [];
    }

    return [
      {
        col: start.column + 1,
        line: start.line,
        tag: toJsxTag(child.openingElement.name),
      },
    ];
  });
};

const toChildLocs = (
  source: string,
  extension: string,
  at: ChildPosition
): ChildLoc[] => {
  if (extension === ".html" || extension === ".htm") {
    return toHtmlChildren(source, at);
  }

  return toJsxChildren(source, at, extension === ".tsx");
};

export { toChildLocs };

export type { ChildLoc, ChildPosition };
