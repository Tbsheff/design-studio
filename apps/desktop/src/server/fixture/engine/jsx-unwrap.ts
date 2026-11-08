import { inspectNode } from "./ast-walk.js";
import type { JSXElement, Node } from "./deps.js";
import { WRAPPER_NAMES } from "./statement-plan.js";

interface Splice {
  readonly end: number;
  readonly start: number;
  readonly text: string;
}

interface Unwrapped {
  readonly names: readonly string[];
  readonly splices: readonly Splice[];
}

const isWrapper = (node: Node): node is JSXElement =>
  node.type === "JSXElement" &&
  node.openingElement.name.type === "JSXIdentifier" &&
  WRAPPER_NAMES.has(node.openingElement.name.name);

const isJsxParent = (parent: Node | null): boolean =>
  parent?.type === "JSXElement" || parent?.type === "JSXFragment";

const toMeaningfulCount = (element: JSXElement): number =>
  element.children.filter(
    (child) => !(child.type === "JSXText" && child.value.trim() === "")
  ).length;

const toWrapperSplices = (
  element: JSXElement,
  parent: Node | null
): readonly Splice[] => {
  const open = element.openingElement;
  const close = element.closingElement ?? null;

  if (close === null) {
    return [{ end: element.end ?? 0, start: element.start ?? 0, text: "" }];
  }

  let openText = "";
  let closeText = "";

  if (!isJsxParent(parent) && toMeaningfulCount(element) > 1) {
    openText = "<>";
    closeText = "</>";
  }

  return [
    { end: open.end ?? 0, start: open.start ?? 0, text: openText },
    { end: close.end ?? 0, start: close.start ?? 0, text: closeText },
  ];
};

const toUnwrapped = (roots: readonly Node[]): Unwrapped => {
  const names: string[] = [];
  const splices: Splice[] = [];

  for (const root of roots) {
    inspectNode(root, null, (node, parent) => {
      if (
        isWrapper(node) &&
        node.openingElement.name.type === "JSXIdentifier"
      ) {
        names.push(node.openingElement.name.name);
        splices.push(...toWrapperSplices(node, parent));
      }

      return true;
    });
  }

  return { names: [...new Set(names)], splices };
};

export { toUnwrapped };

export type { Splice, Unwrapped };
