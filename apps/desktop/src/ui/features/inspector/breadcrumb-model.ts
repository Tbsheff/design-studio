import type { SelectionContext } from "@design-studio/contracts";

const HTML_PREFIX_LENGTH = 4000;

const toElementLabel = (selection: SelectionContext): string => {
  const firstClass = /^<[^>]*\bclass="(?<name>[^"\s]+)/u.exec(
    selection.outerHTML.slice(0, HTML_PREFIX_LENGTH)
  )?.groups?.name;

  if (firstClass) {
    return `${selection.tag}.${firstClass}`;
  }

  return selection.tag;
};

export { toElementLabel };
