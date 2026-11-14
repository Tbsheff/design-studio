import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { KeyBinding } from "./deps.js";
import { ShortcutAlt } from "./shortcut-alt.js";
import { toOnClass } from "./shortcut-model.js";

const ShortcutEntry = ({
  entry,
  isMarked,
}: {
  entry: KeyBinding;
  isMarked: boolean;
}): ReactElement => (
  <li className={toOnClass(isMarked)} data-key-id={entry.id}>
    <span className="keysheet-label">
      {entry.label}
      {entry.hold && <span className="keysheet-hold"> {copy.textHold}</span>}
      {entry.tip && <span className="keysheet-note">{entry.tip}</span>}
    </span>
    <span className="keysheet-keys">
      {entry.keys.map((keys, index) => (
        <ShortcutAlt key={keys} index={index} keys={keys} />
      ))}
    </span>
  </li>
);

export { ShortcutEntry };
