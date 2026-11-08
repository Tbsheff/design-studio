import type { ReactElement } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { copy } from "./copy.js";
import { Icon, KEYMAP, chordMatches, isDesktop } from "./deps.js";
import type { KeyBinding, KeyGroup } from "./deps.js";
import { IS_MAC, Keys } from "./keys.js";

const MARK_MS = 900;
const DESKTOP = "window" in globalThis && isDesktop();

const GROUPS: KeyGroup[] = [
  "General",
  "Run and chat",
  "Canvas",
  "Selection",
  "Edit",
  "Home",
];

const pressedIds = (event: KeyboardEvent): string[] =>
  KEYMAP.filter((entry) =>
    entry.keys.some((keys) => chordMatches(keys, event, IS_MAC))
  ).map((entry) => entry.id);

const ShortcutSheet = ({ onClose }: { onClose: () => void }): ReactElement => {
  const [query, setQuery] = useState("");
  const [marked, setMarked] = useState<ReadonlySet<string>>(new Set());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const live = timers.current;

    const onKey = (event: KeyboardEvent): void => {
      if (event.repeat) {
        return;
      }

      if (
        event.key === "Escape" &&
        rootRef.current?.contains(document.activeElement)
      ) {
        event.preventDefault();
        event.stopPropagation();
        onClose();

        return;
      }

      const ids = pressedIds(event);

      if (ids.length === 0) {
        return;
      }

      setMarked((prev) => new Set([...prev, ...ids]));

      for (const id of ids) {
        globalThis.clearTimeout(live.get(id));
        live.set(
          id,
          globalThis.setTimeout(() => {
            live.delete(id);
            setMarked((prev) => {
              const next = new Set(prev);
              next.delete(id);

              return next;
            });
          }, MARK_MS)
        );
      }
    };

    globalThis.addEventListener("keydown", onKey, true);

    return (): void => {
      globalThis.removeEventListener("keydown", onKey, true);

      for (const timer of live.values()) {
        globalThis.clearTimeout(timer);
      }

      live.clear();
    };
  }, [onClose]);

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const shown = (KEYMAP as readonly KeyBinding[]).filter(
      (entry) =>
        (DESKTOP || !entry.desktop) &&
        (!needle ||
          entry.label.toLowerCase().includes(needle) ||
          entry.keys.some((keyName) => keyName.toLowerCase().includes(needle)))
    );

    return GROUPS.map((group) => ({
      entries: shown.filter((entry) => entry.group === group),
      group,
    })).filter((grp) => grp.entries.length > 0);
  }, [query]);

  const iconNode = <Icon name="close" size={14} />;

  return (
    <aside className="keysheet" ref={rootRef} aria-label={copy.shortcuts}>
      <header className="keysheet-head">
        <h2>{copy.shortcuts}</h2>
        <button
          type="button"
          className="icon-btn small"
          aria-label={copy.closeShortcuts}
          onClick={onClose}
        >
          {iconNode}
        </button>
      </header>
      <div className="keysheet-search">
        <Icon name="search" size={14} />
        <input
          aria-label={copy.filterShortcuts}
          placeholder={copy.filter}
          spellCheck={false}
          value={query}
          onChange={(evt) => setQuery(evt.target.value)}
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
        {groups.map(({ group, entries }) => (
          <section key={group} className="keysheet-group" aria-label={group}>
            <h3>{group}</h3>
            <ul>
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className={(marked.has(entry.id) && "on") || undefined}
                  data-key-id={entry.id}
                >
                  <span className="keysheet-label">
                    {entry.label}
                    {entry.hold && (
                      <span className="keysheet-hold"> {copy.textHold}</span>
                    )}
                  </span>
                  <span className="keysheet-keys">
                    {entry.keys.map((keys, index) => (
                      <span key={keys} className="keysheet-alt">
                        {index > 0 && (
                          <span className="keysheet-or">{copy.textOr}</span>
                        )}
                        <Keys keys={keys} />
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </aside>
  );
};

export { ShortcutSheet };
