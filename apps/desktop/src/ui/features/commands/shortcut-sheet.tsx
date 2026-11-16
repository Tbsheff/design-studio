import type { ChangeEvent, ReactElement } from "react";
import { useCallback, useMemo, useRef, useState } from "react";

import { copy } from "./copy.js";
import { Icon } from "./deps.js";
import { ShortcutGroup } from "./shortcut-group.js";
import { ShortcutHead } from "./shortcut-head.js";
import { toShortcutGroups } from "./shortcut-model.js";
import { useShortcutDismiss } from "./use-shortcut-dismiss.js";
import { useShortcutMarks } from "./use-shortcut-marks.js";

const ShortcutSheet = ({ onClose }: { onClose: () => void }): ReactElement => {
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLElement>(null);
  const marked = useShortcutMarks();

  useShortcutDismiss(rootRef, onClose);
  const groups = useMemo(() => toShortcutGroups(query), [query]);

  const changeQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void =>
      setQuery(event.target.value),
    []
  );

  return (
    <aside className="keysheet" ref={rootRef} aria-label={copy.shortcuts}>
      <ShortcutHead onClose={onClose} />
      <div className="keysheet-search">
        <Icon name="search" size={14} />
        <input
          aria-label={copy.filterShortcuts}
          placeholder={copy.filter}
          spellCheck={false}
          value={query}
          onChange={changeQuery}
        />
      </div>
      <p className="keysheet-tip">{copy.textPressAKeyTo}</p>
      <div className="keysheet-body">
        {groups.length === 0 && (
          <p className="keysheet-empty">
            {copy.textNoShortcutMatches}
            {query}
            {copy.textGlyph}
          </p>
        )}
        {groups.map(({ entries, group }) => (
          <ShortcutGroup
            key={group}
            entries={entries}
            group={group}
            marked={marked}
          />
        ))}
      </div>
    </aside>
  );
};

export { ShortcutSheet };
