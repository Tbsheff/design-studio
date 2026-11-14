import { parse as parseHtml } from "parse5";

import { isHtmlElement, toHtmlChildren, toHtmlSpan } from "./change-spans.js";
import type { HtmlElement, HtmlNode } from "./change-spans.js";
import type {
  ElementKey,
  StyleBlock,
  StyledElement,
} from "./engine/to-style-layers.js";

interface StyleTargets {
  readonly blocks: readonly StyleBlock[];
  readonly elements: readonly StyledElement[];
}

const HTML_FILE = /\.html?$/iu;

const SPACE = /\s+/u;

const NO_TARGETS: StyleTargets = { blocks: [], elements: [] };

const toAttribute = (element: HtmlElement, name: string): string | null =>
  element.attrs.find((attr) => attr.name === name)?.value ?? null;

const toElementKey = (element: HtmlElement): ElementKey => ({
  classes: new Set(
    (toAttribute(element, "class") ?? "")
      .split(SPACE)
      .filter((name) => name !== "")
  ),
  id: toAttribute(element, "id"),
  tag: element.tagName,
});

const toStyleText = (element: HtmlElement): string =>
  element.childNodes
    .map((child) => {
      if ("value" in child) {
        return child.value;
      }

      return "";
    })
    .join("");

const toStyleBlock = (element: HtmlElement): StyleBlock | null => {
  const location = element.sourceCodeLocation;
  const startTag = location?.startTag;

  if (!location || !startTag) {
    return null;
  }

  return {
    endLine: location.endLine,
    startLine: startTag.endLine,
    text: toStyleText(element),
  };
};

const toStyleBlocks = (node: HtmlNode): StyleBlock[] =>
  toHtmlChildren(node).flatMap((child) => {
    if (!isHtmlElement(child)) {
      return [];
    }

    if (child.tagName === "style") {
      const block = toStyleBlock(child);

      if (block) {
        return [block];
      }

      return [];
    }

    return toStyleBlocks(child);
  });

const toLineage = (
  parents: readonly ElementKey[],
  key: ElementKey
): readonly ElementKey[] => [...parents, key];

const toStyledElements = (
  node: HtmlNode,
  file: string,
  parents: readonly ElementKey[]
): StyledElement[] =>
  toHtmlChildren(node).flatMap((child) => {
    if (!isHtmlElement(child)) {
      return [];
    }

    const key = toElementKey(child);
    const inner = toStyledElements(child, file, toLineage(parents, key));
    const span = toHtmlSpan(child, file);

    const isInBody = parents.some((parent) => parent.tag === "body");

    if (span !== null && isInBody) {
      inner.unshift({ key, parents, span });
    }

    return inner;
  });

const toStyleTargets = (source: string | null, file: string): StyleTargets => {
  if (source === null || !HTML_FILE.test(file)) {
    return NO_TARGETS;
  }

  const root = parseHtml(source, { sourceCodeLocationInfo: true });
  const blocks = toStyleBlocks(root);

  if (blocks.length === 0) {
    return NO_TARGETS;
  }

  return { blocks, elements: toStyledElements(root, file, []) };
};

export { toStyleTargets };

export type { StyleTargets };
