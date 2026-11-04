import type { IconPosition, InsertTarget, SelectionContext } from "./deps.js";

type IconMode = "insert" | "swap";

const VOID_TAGS = new Set([
  "img",
  "input",
  "hr",
  "br",
  "textarea",
  "select",
  "svg",
  "path",
]);

const ICON_COMPONENT = /^Icon[A-Z]|Icon$/u;

const isIconLayer = (selection: SelectionContext): boolean =>
  selection.tag.toLowerCase() === "svg" ||
  ICON_COMPONENT.test(selection.component ?? "");

const iconTarget = (selection: SelectionContext): InsertTarget => {
  const target: InsertTarget = {
    selector: selection.selector,
    source: selection.source,
    tag: selection.tag.toLowerCase(),
  };

  if (selection.owners?.length) {
    target.owners = selection.owners;
  }

  return target;
};

const iconPosition = (
  selection: SelectionContext,
  mode: IconMode
): IconPosition => {
  if (mode === "swap") {
    return "inside";
  }

  if (isIconLayer(selection) || VOID_TAGS.has(selection.tag.toLowerCase())) {
    return "after";
  }

  return "inside";
};

export { iconPosition, iconTarget, isIconLayer };

export type { IconMode };
