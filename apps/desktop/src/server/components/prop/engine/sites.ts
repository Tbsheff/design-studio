import type { JSXAttribute, JSXElement } from "@babel/types";

import { toEnd, toStart } from "./ast.js";
import type { Splice } from "./types.js";

const toAttribute = (
  element: JSXElement,
  name: string
): JSXAttribute | null => {
  for (const attribute of element.openingElement.attributes) {
    if (
      attribute.type === "JSXAttribute" &&
      attribute.name.type === "JSXIdentifier" &&
      attribute.name.name === name
    ) {
      return attribute;
    }
  }

  return null;
};

const hasSpread = (element: JSXElement): boolean =>
  element.openingElement.attributes.some(
    (attribute) => attribute.type === "JSXSpreadAttribute"
  );

const isBlankText = (child: JSXElement["children"][number]): boolean =>
  child.type === "JSXText" && child.value.trim() === "";

const hasChildren = (element: JSXElement): boolean =>
  element.children.some((child) => !isBlankText(child));

const toLine = (element: JSXElement): number =>
  element.openingElement.loc?.start.line ?? 0;

const toRenameSplice = (attribute: JSXAttribute, newName: string): Splice => ({
  end: toEnd(attribute.name),
  start: toStart(attribute.name),
  text: newName,
});

const toRemoveSplice = (code: string, attribute: JSXAttribute): Splice => {
  let start = toStart(attribute);

  while (start > 0 && /\s/u.test(code[start - 1] ?? "")) {
    start -= 1;
  }

  const end = toEnd(attribute);
  const text = "";

  return { end, start, text };
};

export {
  hasChildren,
  hasSpread,
  isBlankText,
  toAttribute,
  toLine,
  toRemoveSplice,
  toRenameSplice,
};
