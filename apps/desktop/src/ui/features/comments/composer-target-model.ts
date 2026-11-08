import type { SelectionContext } from "./deps.js";

const toComposerTarget = (selection: SelectionContext[]): string | null => {
  const [first] = selection;

  if (!first) {
    return null;
  }

  if (selection.length > 1) {
    return `${selection.length} elements`;
  }

  return `the ${first.tag}`;
};

const toComposerPlaceholder = (target: string | null): string => {
  if (target) {
    return `Add a comment on ${target}…`;
  }

  return "Press C or choose Comment, then click an element.";
};

export { toComposerPlaceholder, toComposerTarget };
