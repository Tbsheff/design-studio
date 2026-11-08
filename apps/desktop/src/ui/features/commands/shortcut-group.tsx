import type { ReactElement } from "react";

import { ShortcutEntry } from "./shortcut-entry.js";
import type { ShortcutGroupEntries } from "./shortcut-model.js";

const ShortcutGroup = ({
  entries,
  group,
  marked,
}: ShortcutGroupEntries & { marked: ReadonlySet<string> }): ReactElement => (
  <section className="keysheet-group" aria-label={group}>
    <h3>{group}</h3>
    <ul>
      {entries.map((entry) => (
        <ShortcutEntry
          key={entry.id}
          entry={entry}
          isMarked={marked.has(entry.id)}
        />
      ))}
    </ul>
  </section>
);

export { ShortcutGroup };
