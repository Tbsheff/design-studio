import type { SelectionContext } from "@design-studio/contracts";

import { vectorShown } from "./inspector-model.js";

const UNSHARED_PROPS = new Set([
  "layers",
  "tweaks",
  "components",
  "tab",
  "onTab",
  "session",
  "onExit",
  "onSessionEnd",
]);

const isSameButRect = (
  first: SelectionContext,
  second: SelectionContext
): boolean => {
  if (first === second) {
    return true;
  }

  const left = first as unknown as Record<string, unknown>;
  const right = second as unknown as Record<string, unknown>;
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);

  for (const key of keys) {
    if (key !== "rect" && left[key] !== right[key]) {
      return false;
    }
  }

  return true;
};

const isSameSelection = (
  first: SelectionContext[],
  second: SelectionContext[]
): boolean => {
  if (first === second) {
    return true;
  }

  if (first.length !== second.length || vectorShown(second)) {
    return false;
  }

  return first.every((item, index) =>
    isSameButRect(item, second[index] as SelectionContext)
  );
};

const isSameShared = (first: object, second: object): boolean => {
  const left = first as Record<string, unknown>;
  const right = second as Record<string, unknown>;
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);

  for (const key of keys) {
    if (UNSHARED_PROPS.has(key) || left[key] === right[key]) {
      continue;
    }

    if (
      key === "selection" &&
      isSameSelection(
        left[key] as SelectionContext[],
        right[key] as SelectionContext[]
      )
    ) {
      continue;
    }

    return false;
  }

  return true;
};

export { isSameShared as sameShared };
