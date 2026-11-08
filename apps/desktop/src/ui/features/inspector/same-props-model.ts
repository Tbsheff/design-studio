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

const isSameMaps = (
  first: Map<string, unknown>,
  second: Map<string, unknown>,
  isSkipped: (key: string) => boolean
): boolean => {
  const keys = new Set([...first.keys(), ...second.keys()]);

  return [...keys].every(
    (key) => isSkipped(key) || first.get(key) === second.get(key)
  );
};

const isSameButRect = (
  first: SelectionContext,
  second: SelectionContext
): boolean => {
  if (first === second) {
    return true;
  }

  return isSameMaps(
    new Map(Object.entries(first)),
    new Map(Object.entries(second)),
    (key) => key === "rect"
  );
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

  return first.every((item, index) => {
    const other = second[index];

    return Boolean(other) && isSameButRect(item, other as SelectionContext);
  });
};

interface SelectionProps {
  readonly selection: SelectionContext[];
}

const isSameShared = <Props extends SelectionProps>(
  first: Props,
  second: Props
): boolean =>
  isSameMaps(
    new Map(Object.entries(first)),
    new Map(Object.entries(second)),
    (key) =>
      UNSHARED_PROPS.has(key) ||
      (key === "selection" &&
        isSameSelection(first.selection, second.selection))
  );

export { isSameShared };
