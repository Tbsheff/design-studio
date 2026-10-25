import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import type { Project } from '../../shared/contracts';
import { binding } from '../../shared/keymap';
import { api } from '../api';
import { Icon } from '../components/Icon';
import { rank } from './fuzzy';
import { globalCommands, recentProjectCommands } from './globalCommands';
import { Keys } from './keys';
import { collectCommands, type Command } from './registry';

const RECENT_KEY = 'design-studio.commands.recent.v1';
const RECENT_MAX = 5;
const GROUP_ORDER = ['Recent', 'Run', 'Canvas', 'View', 'Panels', 'Selection', 'Version', 'Go', 'Projects', 'Help'];

function readRecent(): string[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((id): id is string => typeof id === 'string').slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

function noteRecent(id: string): void {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...readRecent().filter((x) => x !== id)].slice(0, RECENT_MAX)));
  } catch {
    return;
  }
}

function groupIndex(group: string): number {
  const at = GROUP_ORDER.indexOf(group);
  return at < 0 ? GROUP_ORDER.length : at;
}

interface Row {
  command: Command;
  group: string;
  marks: number[];
}

function rowsFor(commands: Command[], query: string, recent: string[]): Row[] {
  if (query.trim() === '') {
    const byId = new Map(commands.map((c) => [c.id, c]));
    const top = recent.map((id) => byId.get(id)).filter((c): c is Command => c !== undefined && !c.disabled);
    const topIds = new Set(top.map((c) => c.id));
    const rest = commands.filter((c) => !topIds.has(c.id)).sort((a, b) => groupIndex(a.group) - groupIndex(b.group));
    return [...top.map((command) => ({ command, group: 'Recent', marks: [] })), ...rest.map((command) => ({ command, group: command.group, marks: [] }))];
  }
  const boost = new Set(recent);
  return rank(commands, query, (c) => ({ title: c.title, keywords: `${c.keywords ?? ''} ${c.group}` }))
    .map((r) => ({ ...r, score: r.score + (boost.has(r.item.id) ? 1 : 0) - (r.item.disabled ? 4 : 0) }))
    .sort((a, b) => b.score - a.score)
    .map((r) => ({ command: r.item, group: 'Results', marks: r.marks }));
}

function Marked({ text, marks }: { text: string; marks: number[] }): ReactNode {
  if (marks.length === 0) return text;
  const set = new Set(marks);
  const out: ReactNode[] = [];
  let run = '';
  let on = false;
  const flush = (key: number) => {
    if (run) out.push(on ? <mark key={key}>{run}</mark> : run);
    run = '';
  };
  [...text].forEach((ch, i) => {
    const hit = set.has(i);
    if (hit !== on) {
      flush(i);
      on = hit;
    }
    run += ch;
  });
  flush(text.length);
  return out;
}

export function Palette({ onClose, onShortcuts }: { onClose: () => void; onShortcuts: () => void }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [projects, setProjects] = useState<Project[]>([]);
  const listId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const [recent] = useState(readRecent);
  const [base] = useState(() => [...collectCommands(), ...globalCommands(onShortcuts)]);

  useEffect(() => {
    let alive = true;
    api
      .listProjects()
      .then((list) => alive && setProjects(list))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const commands = useMemo(() => [...base.filter((c) => !c.id.startsWith('project.open.')), ...recentProjectCommands(projects)], [base, projects]);
  const rows = useMemo(() => rowsFor(commands, query, recent), [commands, query, recent]);
  const current = Math.min(active, Math.max(0, rows.length - 1));

  useLayoutEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${current}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [current, rows]);

  const run = (row: Row | undefined) => {
    if (!row || row.command.disabled) return;
    noteRecent(row.command.id);
    onClose();
    window.setTimeout(() => row.command.run(), 0);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    const step = event.key === 'ArrowDown' || (event.ctrlKey && event.key === 'n') ? 1 : event.key === 'ArrowUp' || (event.ctrlKey && event.key === 'p') ? -1 : 0;
    if (step !== 0 && rows.length > 0) {
      event.preventDefault();
      setActive((current + step + rows.length) % rows.length);
    } else if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault();
      run(rows[current]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (query) setQuery('');
      else onClose();
    }
  };

  let lastGroup = '';
  return (
    <div className="cmdk-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cmdk" role="dialog" aria-modal="true" aria-label="Command palette">
        <div className="cmdk-search">
          <Icon name="search" size={16} />
          <input
            autoFocus
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={rows[current] ? `${listId}-${current}` : undefined}
            aria-autocomplete="list"
            aria-label="Search commands"
            placeholder="Type a command or a project"
            spellCheck={false}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
          />
          <kbd className="cmdk-esc">Esc</kbd>
        </div>
        <div className="cmdk-list" role="listbox" id={listId} ref={listRef} aria-label="Commands">
          {rows.length === 0 && <p className="cmdk-empty">No commands match “{query}”.</p>}
          {rows.map((row, index) => {
            const head = row.group !== lastGroup && query.trim() === '' ? row.group : null;
            lastGroup = row.group;
            const keys = row.command.keyId ? binding(row.command.keyId).keys[0] : undefined;
            return (
              <div key={`${row.group}-${row.command.id}`} role="presentation">
                {head && (
                  <div className="cmdk-group" role="presentation">
                    {head}
                  </div>
                )}
                <div
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === current}
                  aria-disabled={row.command.disabled ? true : undefined}
                  data-index={index}
                  className="cmdk-row"
                  onMouseMove={() => index !== current && setActive(index)}
                  onClick={() => run(row)}
                >
                  <span className="cmdk-icon" aria-hidden="true">
                    <Icon name={row.command.icon ?? 'dot'} size={14} />
                  </span>
                  <span className="cmdk-title truncate">
                    <Marked text={row.command.title} marks={row.marks} />
                  </span>
                  {row.command.disabled ? (
                    <span className="cmdk-note truncate">{row.command.disabled}</span>
                  ) : (
                    query.trim() !== '' && <span className="cmdk-note">{row.command.group}</span>
                  )}
                  {keys && <Keys keys={keys} className="cmdk-keys" />}
                </div>
              </div>
            );
          })}
        </div>
        <footer className="cmdk-foot" aria-hidden="true">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> Move
          </span>
          <span>
            <kbd>↩</kbd> Run
          </span>
          <span className="cmdk-foot-end">
            <Keys keys="?" /> All shortcuts
          </span>
        </footer>
      </div>
    </div>
  );
}
