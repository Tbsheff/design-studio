import type { ReactElement } from "react";

import { binding } from "./deps.js";
import type { KeyId } from "./deps.js";
import { IS_MAC, tipWithKey } from "./key-model.js";
import { Keys } from "./keys-view.js";

const KeyHint = ({ id }: { id: KeyId }): ReactElement | null => {
  const [first] = binding(id).keys;

  if (first) {
    return <Keys extraClass={null} keys={first} />;
  }

  return null;
};

export { IS_MAC, KeyHint, tipWithKey };
