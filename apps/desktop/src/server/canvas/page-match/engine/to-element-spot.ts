import { parse } from "parse5";
import type { DefaultTreeAdapterMap } from "parse5";

type HtmlNode =
  | DefaultTreeAdapterMap["childNode"]
  | DefaultTreeAdapterMap["parentNode"];

type HtmlElement = DefaultTreeAdapterMap["element"];

type HtmlDocument = DefaultTreeAdapterMap["document"];

interface ElementSpot {
  readonly element: HtmlElement;
  readonly end: number;
  readonly start: number;
  readonly tag: string;
}

interface SelectorStep {
  readonly id: string | null;
  readonly nth: number;
  readonly tag: string;
}

const STEP = /^(?<tag>[a-z][a-z0-9-]*)(?::nth-of-type\((?<nth>\d+)\))?$/u;

const ID_STEP = /^#(?<id>.+)$/u;

const CSS_ESCAPE = /\\(?<char>.)/gu;

const isHtmlElement = (node: HtmlNode): node is HtmlElement =>
  "tagName" in node;

const toChildElements = (node: HtmlNode): readonly HtmlElement[] => {
  if (!("childNodes" in node)) {
    return [];
  }

  return node.childNodes.filter(isHtmlElement);
};

const toAllElements = (root: HtmlNode): readonly HtmlElement[] => {
  const found: HtmlElement[] = [];
  const queue: HtmlNode[] = [root];

  for (const node of queue) {
    if (isHtmlElement(node)) {
      found.push(node);
    }

    queue.push(...toChildElements(node));
  }

  return found;
};

const toDocument = (html: string): HtmlDocument =>
  parse(html, { sourceCodeLocationInfo: true });

const toAttr = (element: HtmlElement, name: string): string | null =>
  element.attrs.find((attr) => attr.name === name)?.value ?? null;

const toStep = (raw: string): SelectorStep | null => {
  const id = ID_STEP.exec(raw)?.groups?.["id"] ?? null;

  if (id !== null) {
    return { id: id.replaceAll(CSS_ESCAPE, "$<char>"), nth: 1, tag: "" };
  }

  const groups = STEP.exec(raw)?.groups ?? null;
  const tag = groups?.["tag"] ?? null;

  if (tag === null) {
    return null;
  }

  return { id: null, nth: Number(groups?.["nth"] ?? "1"), tag };
};

const toSteps = (selector: string): readonly SelectorStep[] | null => {
  const steps: SelectorStep[] = [];

  for (const raw of selector.split(">")) {
    const step = toStep(raw.trim());

    if (step === null) {
      return null;
    }

    steps.push(step);
  }

  return steps;
};

const toChildAt = (
  parent: HtmlElement,
  step: SelectorStep
): HtmlElement | null => {
  if (step.id !== null) {
    return (
      toChildElements(parent).find(
        (child) => toAttr(child, "id") === step.id
      ) ?? null
    );
  }

  const same = toChildElements(parent).filter(
    (child) => child.tagName === step.tag
  );

  return same[step.nth - 1] ?? null;
};

const isStepOf = (element: HtmlElement, step: SelectorStep): boolean => {
  if (step.id !== null) {
    return toAttr(element, "id") === step.id;
  }

  return element.tagName === step.tag;
};

const toChain = (
  start: HtmlElement,
  rest: readonly SelectorStep[]
): HtmlElement | null => {
  let current: HtmlElement | null = start;

  for (const step of rest) {
    if (current === null) {
      return null;
    }

    current = toChildAt(current, step);
  }

  return current;
};

const toSpot = (element: HtmlElement): ElementSpot | null => {
  const location = element.sourceCodeLocation;

  if (!location) {
    return null;
  }

  return {
    element,
    end: location.endOffset,
    start: location.startOffset,
    tag: element.tagName,
  };
};

const toElementSpot = (html: string, selector: string): ElementSpot | null => {
  const steps = toSteps(selector) ?? [];
  const first = steps.at(0) ?? null;

  if (first === null) {
    return null;
  }

  const rest = steps.slice(1);

  for (const start of toAllElements(toDocument(html))) {
    if (isStepOf(start, first)) {
      const found = toChain(start, rest);

      if (found !== null) {
        return toSpot(found);
      }
    }
  }

  return null;
};

const toOwnStep = (element: HtmlElement, parent: HtmlNode): string => {
  const same = toChildElements(parent).filter(
    (child) => child.tagName === element.tagName
  );

  if (same.length > 1) {
    return `${element.tagName}:nth-of-type(${same.indexOf(element) + 1})`;
  }

  return element.tagName;
};

const toUniqueId = (
  element: HtmlElement,
  all: readonly HtmlElement[]
): string | null => {
  const id = toAttr(element, "id");

  if (id === null || id === "" || !/^[\w-]+$/u.test(id)) {
    return null;
  }

  if (all.filter((item) => toAttr(item, "id") === id).length === 1) {
    return `#${id}`;
  }

  return null;
};

const toSelectorOf = (
  element: HtmlElement,
  all: readonly HtmlElement[]
): string => {
  const parts: string[] = [];
  let current: HtmlElement = element;

  while (current.tagName !== "body" && current.tagName !== "html") {
    const id = toUniqueId(current, all);

    if (id !== null) {
      parts.unshift(id);

      return parts.join(" > ");
    }

    const parent = current.parentNode;

    if (parent === null || !isHtmlElement(parent)) {
      break;
    }

    parts.unshift(toOwnStep(current, parent));
    current = parent;
  }

  if (current.tagName === "body") {
    parts.unshift("body");
  }

  return parts.join(" > ");
};

export { toAllElements, toDocument, toElementSpot, toSelectorOf, toSpot };

export type { ElementSpot, HtmlElement };
