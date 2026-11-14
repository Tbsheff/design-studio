import type { SelectionContext } from "@design-studio/contracts";

const toParentLines = (selection: SelectionContext): string[] => {
  const parent = selection.parentLoc ?? null;

  if (parent === null) {
    return [];
  }

  return [`parent source: ${parent.file}:${parent.line}:${parent.col}`];
};

export { toParentLines };
