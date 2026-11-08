import type { SelectionContext } from "@design-studio/contracts";

const SNIPPET_CHARS = 24;

const toSnippet = (selected: SelectionContext): string => {
  if (selected.text) {
    return ` "${selected.text.slice(0, SNIPPET_CHARS)}"`;
  }

  return "";
};

export { toSnippet };
