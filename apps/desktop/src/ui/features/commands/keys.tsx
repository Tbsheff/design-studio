import type { ReactElement } from "react";

import { binding, keyParts } from "./deps.js";
import type { KeyId } from "./deps.js";
import { IS_MAC } from "./key-model.js";

export { IS_MAC, tipWithKey } from "./key-model.js";

export function Keys({
  keys,
  className,
}: {
  keys: string;
  className?: string;
}): ReactElement {
  return (
    <span className={`keys${className ? ` ${className}` : ""}`}>
      {keyParts(keys, IS_MAC).map((part, index) => (
        <kbd key={`${part}-${index}`}>{part}</kbd>
      ))}
    </span>
  );
}

export function KeyHint({ id }: { id: KeyId }): ReactElement | null {
  const first = binding(id).keys[0];

  return first ? <Keys keys={first} /> : null;
}
