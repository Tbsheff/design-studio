import { useEffect, useMemo, useRef, useState } from 'react';
import { chordMatches, KEYMAP, type KeyBinding, type KeyGroup } from '../../shared/keymap';
import { Icon } from '../components/Icon';
import { IS_MAC, Keys } from './keys';

const MARK_MS = 900;
const DESKTOP = typeof window !== 'undefined' && 'studioDesktop' in window;
const GROUPS: KeyGroup[] = ['General', 'Run and chat', 'Canvas', 'Selection', 'Edit', 'Home'];

function pressedIds(event: KeyboardEvent): string[] {
  return KEYMAP.filter((entry) => entry.keys.some((keys) => chordMatches(keys, event, IS_MAC))).map((entry) => entry.id);
}

export function ShortcutSheet({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [marked, setMarked] = useState<ReadonlySet<string>>(new Set());
  const timers = useRef(new Map<string, number>());
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const live = timers.current;
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.key === 'Escape' && rootRef.current?.contains(document.activeElement)) {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }
      const ids = pressedIds(event);
      if (ids.length === 0) return;
      setMarked((prev) => new Set([...prev, ...ids]));
      for (const id of ids) {
        window.clearTimeout(live.get(id));
        live.set(
          id,
          window.setTimeout(() => {
            live.delete(id);
            setMarked((prev) => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
          }, MARK_MS),
        );
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      for (const timer of live.values()) window.clearTimeout(timer);
      live.clear();
    };
  }, [onClose]);

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const shown = (KEYMAP as readonly KeyBinding[]).filter((entry) => (DESKTOP || !entry.desktop) && (!needle || entry.label.toLowerCase().includes(needle) || entry.keys.some((k) => k.toLowerCase().includes(needle))));
    return GROUPS.map((group) => ({ group, entries: shown.filter((entry) => entry.group === group) })).filter((g) => g.entries.length > 0);
  }, [query]);

  return (
    <aside className="keysheet" ref={rootRef} aria-label="Keyboard shortcuts">
      <header className="keysheet-head">
        <h2>Keyboard shortcuts</h2>
        <button type="button" className="icon-btn small" aria-label="Close shortcuts" onClick={onClose}>
          <Icon name="close" size={14} />
        </button>
      </header>
      <div className="keysheet-search">
        <Icon name="search" size={14} />
        <input aria-label="Filter shortcuts" placeholder="Filter" spellCheck={false} value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <p className="keysheet-tip">Press a key to find it here.</p>
      <div className="keysheet-body">
        {groups.length === 0 && <p className="keysheet-empty">No shortcut matches “{query}”.</p>}
        {groups.map(({ group, entries }) => (
          <section key={group} className="keysheet-group" aria-label={group}>
            <h3>{group}</h3>
            <ul>
              {entries.map((entry) => (
                <li key={entry.id} className={marked.has(entry.id) ? 'on' : undefined} data-key-id={entry.id}>
                  <span className="keysheet-label">
                    {entry.label}
                    {entry.hold && <span className="keysheet-hold"> (hold)</span>}
                  </span>
                  <span className="keysheet-keys">
                    {entry.keys.map((keys, index) => (
                      <span key={keys} className="keysheet-alt">
                        {index > 0 && <span className="keysheet-or">or</span>}
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
}
