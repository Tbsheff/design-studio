import { parseFragment } from "parse5";

import { toAllElements } from "./to-element-spot.js";
import type { HtmlElement } from "./to-element-spot.js";

interface PageMarks {
  readonly ariaCurrent: string | null;
  readonly classes: readonly string[];
}

interface TagSplice {
  readonly end: number;
  readonly start: number;
  readonly text: string;
}

const MARK_CLASSES: ReadonlySet<string> = new Set([
  "active",
  "current",
  "is-active",
  "is-current",
  "is-selected",
  "selected",
]);

const SPACE = /\s+/gu;

const ARIA_CURRENT = "aria-current";

const CLASS_ATTR = "class";

const NO_MARKS: PageMarks = { ariaCurrent: null, classes: [] };

const toClassTokens = (value: string | null): readonly string[] =>
  (value ?? "").split(SPACE).filter((token) => token !== "");

const toAttr = (element: HtmlElement, name: string): string | null =>
  element.attrs.find((attr) => attr.name === name)?.value ?? null;

const toMarks = (element: HtmlElement): PageMarks => ({
  ariaCurrent: toAttr(element, ARIA_CURRENT),
  classes: toClassTokens(toAttr(element, CLASS_ATTR)).filter((token) =>
    MARK_CLASSES.has(token)
  ),
});

const isSameMarks = (left: PageMarks, right: PageMarks): boolean =>
  left.ariaCurrent === right.ariaCurrent &&
  left.classes.join(" ") === right.classes.join(" ");

const toEscaped = (value: string): string =>
  value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");

const toAttrText = (name: string, value: string): string =>
  ` ${name}="${toEscaped(value)}"`;

const toClassValue = (element: HtmlElement, marks: PageMarks): string =>
  [
    ...toClassTokens(toAttr(element, CLASS_ATTR)).filter(
      (token) => !MARK_CLASSES.has(token)
    ),
    ...marks.classes,
  ].join(" ");

const toStartTag = (
  element: HtmlElement,
  marks: PageMarks,
  isSelfClosed: boolean
): string => {
  const parts: string[] = [`<${element.tagName}`];
  const classValue = toClassValue(element, marks);
  let hasClass = false;

  for (const attr of element.attrs) {
    if (attr.name === CLASS_ATTR) {
      hasClass = true;
    }

    if (attr.name === CLASS_ATTR && classValue !== "") {
      parts.push(toAttrText(CLASS_ATTR, classValue));
    }

    if (attr.name !== CLASS_ATTR && attr.name !== ARIA_CURRENT) {
      parts.push(toAttrText(attr.name, attr.value));
    }
  }

  if (!hasClass && classValue !== "") {
    parts.push(toAttrText(CLASS_ATTR, classValue));
  }

  if (marks.ariaCurrent !== null) {
    parts.push(toAttrText(ARIA_CURRENT, marks.ariaCurrent));
  }

  if (isSelfClosed) {
    parts.push(" />");
  } else {
    parts.push(">");
  }

  return parts.join("");
};

const toTagSplice = (
  markup: string,
  element: HtmlElement,
  marks: PageMarks
): TagSplice | null => {
  const startTag = element.sourceCodeLocation?.startTag;

  if (!startTag) {
    return null;
  }

  const original = markup.slice(startTag.startOffset, startTag.endOffset);

  return {
    end: startTag.endOffset,
    start: startTag.startOffset,
    text: toStartTag(element, marks, original.endsWith("/>")),
  };
};

const toElements = (markup: string): readonly HtmlElement[] =>
  toAllElements(parseFragment(markup, { sourceCodeLocationInfo: true }));

const toMarkedMarkup = (source: string, target: string): string => {
  const sources = toElements(source);
  const targets = toElements(target);
  const splices: TagSplice[] = [];

  for (const [index, element] of sources.entries()) {
    const wanted = targets.at(index) ?? null;
    let marks = NO_MARKS;

    if (wanted !== null) {
      marks = toMarks(wanted);
    }

    const splice = toTagSplice(source, element, marks);

    if (splice !== null && !isSameMarks(toMarks(element), marks)) {
      splices.push(splice);
    }
  }

  return splices
    .toSorted((left, right) => right.start - left.start)
    .reduce(
      (text, splice) =>
        text.slice(0, splice.start) + splice.text + text.slice(splice.end),
      source
    );
};

export { MARK_CLASSES, toMarkedMarkup };
