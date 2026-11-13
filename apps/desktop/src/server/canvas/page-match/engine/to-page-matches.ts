import type { DefaultTreeAdapterMap } from "parse5";

import {
  toAllElements,
  toDocument,
  toElementSpot,
  toSelectorOf,
} from "./to-element-spot.js";
import type { HtmlElement } from "./to-element-spot.js";
import { MARK_CLASSES } from "./to-marked-markup.js";

type HtmlNode = DefaultTreeAdapterMap["childNode"];

interface PageSource {
  readonly markup: string;
  readonly normal: string;
  readonly selector: string;
  readonly tag: string;
}

interface PageHit {
  readonly isSame: boolean;
  readonly selector: string;
}

const SKIP_ATTRS: ReadonlySet<string> = new Set([
  "aria-current",
  "data-studio-loc",
]);

const SPACE = /\s+/gu;

const toSpaced = (value: string): string => value.replaceAll(SPACE, " ").trim();

const toNormalClass = (value: string): string | null => {
  const tokens: string[] = [];

  for (const token of value.split(SPACE)) {
    if (token !== "" && !MARK_CLASSES.has(token)) {
      tokens.push(token);
    }
  }

  if (tokens.length === 0) {
    return null;
  }

  return `class="${tokens.toSorted().join(" ")}"`;
};

const toNormalAttrs = (element: HtmlElement): string => {
  const parts: string[] = [];

  for (const attr of element.attrs) {
    let normal: string | null = `${attr.name}="${toSpaced(attr.value)}"`;

    if (attr.name === "class") {
      normal = toNormalClass(attr.value);
    }

    if (normal !== null && !SKIP_ATTRS.has(attr.name)) {
      parts.push(normal);
    }
  }

  return parts.toSorted().join(" ");
};

const toNormalNode = (node: HtmlNode): string => {
  if (node.nodeName === "#text" && "value" in node) {
    return toSpaced(node.value);
  }

  if (!("tagName" in node)) {
    return "";
  }

  const children: string[] = [];

  for (const child of node.childNodes) {
    const text = toNormalNode(child);

    if (text !== "") {
      children.push(text);
    }
  }

  return `<${node.tagName} ${toNormalAttrs(node)}>${children.join("|")}</${node.tagName}>`;
};

const toPageSource = (html: string, selector: string): PageSource | null => {
  const spot = toElementSpot(html, selector);

  if (spot === null) {
    return null;
  }

  const markup = html.slice(spot.start, spot.end);
  const normal = toNormalNode(spot.element);
  const { tag } = spot;

  return { markup, normal, selector, tag };
};

const isSameElement = (source: PageSource, element: HtmlElement): boolean =>
  element.tagName === source.tag && toNormalNode(element) === source.normal;

const toPageHit = (source: PageSource, html: string): PageHit | null => {
  const all = toAllElements(toDocument(html));
  const same = all.find((element) => isSameElement(source, element)) ?? null;

  if (same !== null) {
    return { isSame: true, selector: toSelectorOf(same, all) };
  }

  const spot = toElementSpot(html, source.selector);

  if (spot?.tag === source.tag) {
    return { isSame: false, selector: toSelectorOf(spot.element, all) };
  }

  const tagged = all.filter((element) => element.tagName === source.tag);
  const only = tagged.at(0) ?? null;

  if (tagged.length === 1 && only !== null) {
    return { isSame: false, selector: toSelectorOf(only, all) };
  }

  return null;
};

export { toPageHit, toPageSource };

export type { PageHit, PageSource };
