import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { Keys } from "./keys-view.js";

const ShortcutAlt = ({
  index,
  keys,
}: {
  index: number;
  keys: string;
}): ReactElement => (
  <span className="keysheet-alt">
    {index > 0 && <span className="keysheet-or">{copy.textOr}</span>}
    <Keys extraClass={null} keys={keys} />
  </span>
);

export { ShortcutAlt };
