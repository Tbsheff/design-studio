import type { ReactElement } from "react";

import { keyParts } from "./deps.js";
import { IS_MAC } from "./keys.js";

interface LabelledPart {
  readonly id: string;
  readonly part: string;
}

const toKeysClass = (extraClass: string | null): string => {
  if (extraClass) {
    return `keys ${extraClass}`;
  }

  return "keys";
};

const toLabelledParts = (parts: readonly string[]): LabelledPart[] => {
  const counts = new Map<string, number>();

  return parts.map((part) => {
    const seen = counts.get(part) ?? 0;

    counts.set(part, seen + 1);

    return { id: `${part}-${seen}`, part };
  });
};

const Keys = ({
  extraClass,
  keys,
}: {
  extraClass: string | null;
  keys: string;
}): ReactElement => (
  <span className={toKeysClass(extraClass)}>
    {toLabelledParts(keyParts(keys, IS_MAC)).map((entry) => (
      <kbd key={entry.id}>{entry.part}</kbd>
    ))}
  </span>
);

export { Keys };
