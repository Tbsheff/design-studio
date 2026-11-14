import type { DefaultTreeAdapterMap } from "parse5";

import { toSelectorOf } from "../../page-match/engine/to-element-spot.js";
import type { HtmlElement } from "../../page-match/engine/to-element-spot.js";
import { toAttr } from "./to-flow-styles.js";

type HtmlNode = DefaultTreeAdapterMap["childNode"];

interface FlowPart {
  readonly element: HtmlElement;
  readonly name: string;
  readonly selector: string;
}

const PART_TAGS: ReadonlySet<string> = new Set(["header", "nav", "footer"]);

const PART_ROLES: ReadonlySet<string> = new Set(["banner", "navigation"]);

const isInside = (element: HtmlElement, outer: HtmlElement): boolean => {
  let current = element.parentNode;

  while (current !== null && "tagName" in current) {
    if (current === outer) {
      return true;
    }

    current = current.parentNode;
  }

  return false;
};

const toPartKey = (element: HtmlElement): string | null => {
  if (PART_TAGS.has(element.tagName)) {
    return element.tagName;
  }

  return null;
};

const toRoleKey = (element: HtmlElement): string | null => {
  const role = toAttr(element, "role") ?? "";

  if (PART_ROLES.has(role)) {
    return role;
  }

  return null;
};

const toFirstParts = (all: readonly HtmlElement[]): readonly FlowPart[] => {
  const tags = new Map<string, HtmlElement>();
  const roles = new Map<string, HtmlElement>();

  for (const element of all) {
    const tag = toPartKey(element);
    const role = toRoleKey(element);

    if (tag !== null && !tags.has(tag)) {
      tags.set(tag, element);
    }

    if (role !== null && !roles.has(role)) {
      roles.set(role, element);
    }
  }

  return [
    ...[...tags].map(([tag, element]) => ({
      element,
      name: tag,
      selector: toSelectorOf(element, all),
    })),
    ...[...roles].map(([role, element]) => ({
      element,
      name: `${element.tagName}[role=${role}]`,
      selector: toSelectorOf(element, all),
    })),
  ];
};

const toFlowParts = (all: readonly HtmlElement[]): readonly FlowPart[] => {
  const first = toFirstParts(all);

  const own = first.filter(
    (part, index) =>
      first.findIndex((item) => item.element === part.element) === index
  );

  return own.filter(
    (part) => !own.some((outer) => isInside(part.element, outer.element))
  );
};

const listTexts = (node: HtmlNode, found: string[]): string[] => {
  if (node.nodeName === "#text" && "value" in node) {
    const text = node.value.replaceAll(/\s+/gu, " ").trim();

    if (text !== "") {
      found.push(text);
    }
  }

  if ("childNodes" in node) {
    for (const child of node.childNodes) {
      listTexts(child, found);
    }
  }

  return found;
};

const toChangedCount = (from: HtmlElement, to: HtmlElement): number => {
  const left = listTexts(from, []);
  const right = listTexts(to, []);
  const rest = [...right];
  let missing = 0;

  for (const text of left) {
    const at = rest.indexOf(text);

    if (at === -1) {
      missing += 1;
    } else {
      rest.splice(at, 1);
    }
  }

  return Math.max(missing, rest.length);
};

export { toChangedCount, toFlowParts };

export type { FlowPart };
