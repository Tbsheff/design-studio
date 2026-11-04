import type { SelectionContext } from "@design-studio/actions/_core/contracts";
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

const sameButRect = (a: SelectionContext, b: SelectionContext): boolean => {
  if (a === b) {
    return true;
  }

  const left = a as unknown as Record<string, unknown>;
  const right = b as unknown as Record<string, unknown>;
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);

  for (const key of keys) {
    if (key !== "rect" && left[key] !== right[key]) {
      return false;
    }
  }

  return true;
};

const sameSelection = (
  a: SelectionContext[],
  b: SelectionContext[]
): boolean => {
  if (a === b) {
    return true;
  }

  if (a.length !== b.length || vectorShown(b)) {
    return false;
  }

  return a.every((item, i) => sameButRect(item, b[i] as SelectionContext));
};

const sameShared = (a: object, b: object): boolean => {
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);

  for (const key of keys) {
    if (UNSHARED_PROPS.has(key) || left[key] === right[key]) {
      continue;
    }

    if (
      key === "selection" &&
      sameSelection(
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

export { sameShared };
