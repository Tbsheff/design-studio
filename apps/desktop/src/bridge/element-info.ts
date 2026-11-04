import { SOURCE_LOC_ATTR } from "../shared/actions/_core/contracts.js";
import type { SelectionContext, SourceLoc } from "../shared/actions/_core/contracts.js";
import { USED_AT_ATTR, appSourceFor, componentUseOf } from "./app-source.js";
import type { Rect } from "./bridge-types.js";
import { componentOwners } from "./component-owner.js";
import { layoutStyles } from "./inlineStyle.js";
import { APP_MODE } from "./session.js";

const STYLE_KEYS = [
  "color",
  "background-color",
  "font-family",
  "font-size",
  "font-weight",
  "line-height",
  "letter-spacing",
  "padding",
  "margin",
  "border-radius",
  "display",
  "gap",
  "width",
  "height",
  "text-align",
  "flex-direction",
  "flex-wrap",
  "justify-content",
  "align-items",
  "align-self",
  "flex",
  "box-shadow",
  "filter",
  "font-style",
  "text-decoration-line",
  "text-transform",
  "overflow",
  "text-shadow",
  "transform",
  "opacity",
  "border-width",
  "border-style",
  "border-color",
  "position",
  "top",
  "right",
  "bottom",
  "left",
  "min-width",
  "max-width",
  "min-height",
  "max-height",
  "row-gap",
  "column-gap",
  "justify-items",
  "object-fit",
  "object-position",
  "background-image",
  "background-size",
  "background-position",
  "background-repeat",
];

const MAX_SELECTOR_DEPTH = 8;
const MAX_ANCESTORS = 5;
const MAX_TEXT = 300;
const MAX_HTML = 3000;
const SELECT_SETTLE_MS = 400;

const rectOf = (element: Element): Rect => {
  const box = element.getBoundingClientRect();

  return { height: box.height, width: box.width, x: box.x, y: box.y };
};

const shortLabel = (element: Element): string => {
  const tag = element.tagName.toLowerCase();

  const [firstClass] = (element.getAttribute("class") ?? "")
    .trim()
    .split(/\s+/u);

  if (firstClass) {
    return `${tag}.${firstClass}`;
  }

  return tag;
};

const uniqueId = (element: Element): string | null => {
  const { id } = element;

  if (!id) {
    return null;
  }

  const selector = `#${CSS.escape(id)}`;

  try {
    if (document.querySelectorAll(selector).length === 1) {
      return selector;
    }

    return null;
  } catch {
    return null;
  }
};

const nthOfType = (element: Element): string => {
  const tag = element.tagName.toLowerCase();
  const parent = element.parentElement;

  if (!parent) {
    return tag;
  }

  let index = 0;
  let count = 0;

  for (const sibling of parent.children) {
    if (sibling.tagName === element.tagName) {
      count += 1;

      if (sibling === element) {
        index = count;
      }
    }
  }

  if (count > 1) {
    return `${tag}:nth-of-type(${index})`;
  }

  return tag;
};

const selectorFor = (element: Element): string => {
  const own = uniqueId(element);

  if (own) {
    return own;
  }

  const parts: string[] = [];
  let current: Element | null = element;

  while (
    current &&
    current !== document.body &&
    current !== document.documentElement
  ) {
    if (parts.length >= MAX_SELECTOR_DEPTH) {
      break;
    }

    let id: string | null = null;

    if (parts.length > 0) {
      id = uniqueId(current);
    }

    if (id) {
      parts.unshift(id);

      return parts.join(" > ");
    }

    parts.unshift(nthOfType(current));
    current = current.parentElement;
  }

  if (current === document.body) {
    parts.unshift("body");
  }

  if (parts.length === 0) {
    return element.tagName.toLowerCase();
  }

  return parts.join(" > ");
};

const parseLoc = (value: string): SourceLoc | null => {
  const match = /^(.*):(\d+):(\d+)$/u.exec(value);

  if (!match) {
    return null;
  }

  const [, file, line, col] = match;

  if (!file || !line || !col) {
    return null;
  }

  return { col: Number(col), file, line: Number(line) };
};

const sourceOf = (element: Element): SourceLoc | null => {
  let owner: Element | null = element;

  if (APP_MODE !== "next") {
    owner = element.closest(`[${SOURCE_LOC_ATTR}]`);
  }

  const value = owner?.getAttribute(SOURCE_LOC_ATTR);

  if (value) {
    return parseLoc(value);
  }

  return null;
};

const usedAtOf = (element: Element): SourceLoc | null => {
  const value = element.getAttribute(USED_AT_ATTR);

  if (value) {
    return parseLoc(value);
  }

  return null;
};

const stylesOf = (element: Element): Record<string, string> => {
  const computed = window.getComputedStyle(element);
  const styles: Record<string, string> = {};

  for (const key of STYLE_KEYS) {
    styles[key] = computed.getPropertyValue(key);
  }

  return { ...styles, ...layoutStyles(element, computed) };
};

const ancestorsOf = (element: Element): string[] => {
  const labels: string[] = [];
  let current = element.parentElement;

  while (current && labels.length < MAX_ANCESTORS) {
    labels.push(shortLabel(current));

    if (current === document.body) {
      break;
    }

    current = current.parentElement;
  }

  return labels;
};

const textOf = (element: Element): string => {
  let raw = element.textContent ?? "";

  if (element instanceof HTMLElement) {
    raw = element.innerText;
  }

  return raw.trim().slice(0, MAX_TEXT);
};

const selectionFor = (element: Element): SelectionContext => {
  const context: SelectionContext = {
    ancestors: ancestorsOf(element),
    outerHTML: element.outerHTML.slice(0, MAX_HTML),
    owners: componentOwners(element),
    rect: rectOf(element),
    selector: selectorFor(element),
    source: sourceOf(element),
    styles: stylesOf(element),
    tag: element.tagName.toLowerCase(),
    text: textOf(element),
  };

  if (APP_MODE === "next") {
    context.usedAt = usedAtOf(element);
    context.usedBy = componentUseOf(element);
  }

  return context;
};

const appSourceStrings = async (
  element: Element,
  usedAt: string | null
): Promise<{ own: string | null; usedAt: string | null }> => {
  const own = await appSourceFor(element);

  return { own, usedAt: element.getAttribute(USED_AT_ATTR) ?? usedAt };
};

const sourceStrings = (
  element: Element
): Promise<{ own: string | null; usedAt: string | null }> => {
  const usedAt = element.getAttribute(USED_AT_ATTR);

  if (APP_MODE === "next") {
    return appSourceStrings(element, usedAt);
  }

  return Promise.resolve({
    own:
      element.closest(`[${SOURCE_LOC_ATTR}]`)?.getAttribute(SOURCE_LOC_ATTR) ??
      null,
    usedAt,
  });
};

const queryElement = (selector: string): Element | null => {
  try {
    return document.querySelector(selector);
  } catch {
    return null;
  }
};

export {
  SELECT_SETTLE_MS,
  parseLoc,
  queryElement,
  rectOf,
  selectionFor,
  selectorFor,
  shortLabel,
  sourceOf,
  sourceStrings,
  textOf,
  usedAtOf,
};
