import { parse } from "parse5";
import type { DefaultTreeAdapterMap } from "parse5";

import { TEXT_SEARCH_ATTRIBUTES } from "./deps.js";
import type { TextLayer } from "./deps.js";
import { encodeHtmlText, markupAttribute } from "./encode.js";
import { markupPieces } from "./entities.js";
import { toSegment } from "./segment.js";
import type { Segment } from "./segment.js";

type Node = DefaultTreeAdapterMap["node"];

type Element = DefaultTreeAdapterMap["element"];

type TextNode = DefaultTreeAdapterMap["textNode"];

interface AttributeLocation {
  readonly startOffset: number;
  readonly endOffset: number;
}

const HIDDEN_PARENTS = new Set(["script", "style", "noscript", "title"]);

const ATTRIBUTES = new Set<string>(TEXT_SEARCH_ATTRIBUTES);

const isElement = (node: Node): node is Element =>
  "tagName" in node && "attrs" in node;

const isText = (node: Node): node is TextNode => node.nodeName === "#text";

const layerOf = (relative: string, element: Element): TextLayer => ({
  col: element.sourceCodeLocation?.startCol ?? 1,
  file: relative,
  line: element.sourceCodeLocation?.startLine ?? 1,
  tag: element.tagName,
});

const valueRange = (
  source: string,
  location: AttributeLocation
): { start: number; end: number; quote: string } | null => {
  const raw = source.slice(location.startOffset, location.endOffset);
  const equals = raw.indexOf("=");

  if (equals === -1) {
    return null;
  }

  let at = equals + 1;

  while (at < raw.length && /\s/u.test(raw.charAt(at))) {
    at += 1;
  }

  const mark = raw.charAt(at);

  if (mark === '"' || mark === "'") {
    return {
      end: location.endOffset - 1,
      quote: mark,
      start: location.startOffset + at + 1,
    };
  }

  return {
    end: location.endOffset,
    quote: "",
    start: location.startOffset + at,
  };
};

const attributeSegments = (
  file: string,
  source: string,
  element: Element
): Segment[] => {
  const segments: Segment[] = [];
  const locations = element.sourceCodeLocation?.attrs ?? {};

  for (const attribute of element.attrs) {
    const location = locations[attribute.name];

    const range =
      location &&
      ATTRIBUTES.has(attribute.name) &&
      valueRange(source, location);

    if (range && range.end > range.start) {
      segments.push(
        toSegment(
          {
            attribute: attribute.name,
            encode: markupAttribute(range.quote),
            kind: "attribute",
            layer: layerOf(file, element),
          },
          markupPieces(source, range.start, range.end)
        )
      );
    }
  }

  return segments;
};

const textSegment = (
  relative: string,
  source: string,
  node: TextNode,
  parent: Element | null
): Segment | null => {
  const location = node.sourceCodeLocation;

  if (!location || node.value.trim() === "") {
    return null;
  }

  if (parent && HIDDEN_PARENTS.has(parent.tagName)) {
    return null;
  }

  let layer: TextLayer = {
    col: location.startCol,
    file: relative,
    line: location.startLine,
    tag: "#text",
  };

  if (parent?.sourceCodeLocation) {
    layer = layerOf(relative, parent);
  }

  return toSegment(
    { attribute: null, encode: encodeHtmlText, kind: "text", layer },
    markupPieces(source, location.startOffset, location.endOffset)
  );
};

const childrenOf = (node: Node): Node[] => {
  const children: Node[] = [];

  if ("childNodes" in node) {
    children.push(...node.childNodes);
  }

  if ("content" in node && node.content) {
    children.push(...node.content.childNodes);
  }

  return children;
};

const htmlSegments = (file: string, source: string): Segment[] => {
  const segments: Segment[] = [];

  const stack: { node: Node; parent: Element | null }[] = [
    { node: parse(source, { sourceCodeLocationInfo: true }), parent: null },
  ];

  while (stack.length > 0) {
    const entry = stack.pop();

    if (!entry) {
      break;
    }

    if (isText(entry.node)) {
      const segment = textSegment(file, source, entry.node, entry.parent);

      if (segment) {
        segments.push(segment);
      }
    }

    let element = entry.parent;

    if (isElement(entry.node)) {
      element = entry.node;
      segments.push(...attributeSegments(file, source, entry.node));
    }

    for (const child of childrenOf(entry.node).toReversed()) {
      stack.push({ node: child, parent: element });
    }
  }

  return segments;
};

export { htmlSegments };
