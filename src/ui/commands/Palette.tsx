import { useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { errorText, api } from '../api';
import { Icon } from '../components/Icon';
import { ProjectThumb, TypeBadge } from '../components/ProjectThumb';
import { openProject } from '../projectNav';
import { useProjectHits, useRouteHits } from '../projectHits';
import { projectsApi } from '../projectsStore';
import { uiStore } from '../storage';
import { globalCommands } from './globalCommands';
import { Keys } from './keys';
import { buildRows, type Row } from './paletteRows';
import { collectCommands } from './registry';

const RECENT_KEY = 'design-studio.commands.recent.v1';
const RECENT_MAX = 5;
const DESKTOP = typeof window !== 'undefined' && 'studioDesktop' in window;

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

function RowLead({ row }: { row: Row }) {
  if (row.hit && row.kind === 'project' && !row.icon) return <ProjectThumb hit={row.hit} />;
  return (
    <span className="cmdk-icon" data-tone={row.tone} aria-hidden="true">
      <Icon name={row.icon ?? 'dot'} size={14} />
    </span>
  );
}

function RowEnd({ row, active, typing }: { row: Row; active: boolean; typing: boolean }) {
  return (
    <span className="cmdk-end">
      {row.disabled ? <span className="cmdk-note truncate">{row.disabled}</span> : row.note && <span className="cmdk-note">{row.note}</span>}
      {row.hit && row.kind === 'project' && !row.icon && <TypeBadge hit={row.hit} />}
      {typing && active ? <Keys keys="Enter" className="cmdk-keys" /> : row.keys && <Keys keys={row.keys} className="cmdk-keys" />}
    </span>
  );
}

function stepOf(event: ReactKeyboardEvent): number {
  if (event.key === 'ArrowDown' || (event.ctrlKey && event.key === 'n')) return 1;
  if (event.key === 'ArrowUp' || (event.ctrlKey && event.key === 'p')) return -1;
  return 0;
}

function digitOf(event: ReactKeyboardEvent): number | null {
  if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return null;
  const n = Number(event.key);
  return Number.isInteger(n) && n >= 1 && n <= 9 ? n : null;
}

function usePaletteRows(query: string, onShortcuts: () => void, onClose: () => void, setError: (error: string | null) => void) {
  const current = uiStore.get().activeProjectId;
  const hits = useProjectHits(current);
  const routes = useRouteHits(query, current, hits?.routes ?? []);
  const [recent] = useState(readRecent);
  const [commands] = useState(() => {
    const all = [...collectCommands(), ...globalCommands(onShortcuts)].filter((c) => !c.id.startsWith('project.open.'));
    return all.filter((c, i) => all.findIndex((x) => x.id === c.id) === i);
  });
  const [busy, setBusy] = useState(false);
  const actions = useMemo(
    () => ({
      openProject: (id: string, route?: string) => {
        onClose();
        window.setTimeout(() => openProject(id, route), 0);
      },
      newPrototype: (prompt: string) => {
        setBusy(true);
        setError(null);
        api
          .createProject({ prompt, kind: 'html' })
          .then(({ project }) => {
            void projectsApi.load();
            onClose();
            openProject(project.id);
          })
          .catch((err: unknown) => {
            setBusy(false);
            setError(errorText(err));
          });
      },
    }),
    [onClose, setError],
  );
  const rows = useMemo(
    () => buildRows({ query, commands, projects: hits?.projects ?? [], routes, recent, current, desktop: DESKTOP, actions }),
    [query, commands, hits, routes, recent, current, actions],
  );
  return { rows, busy, loading: hits === null };
}

export function Palette({ onClose, onShortcuts }: { onClose: () => void; onShortcuts: () => void }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const listId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const { rows, busy, loading } = usePaletteRows(query, onShortcuts, onClose, setError);
  const current = Math.min(active, Math.max(0, rows.length - 1));
  const typing = query.trim() !== '';

  useLayoutEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${current}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [current, rows]);

  const run = (row: Row | undefined) => {
    if (!row || row.disabled || busy) return;
    if (row.commandId) noteRecent(row.commandId);
    if (row.kind === 'new' || row.kind === 'project' || row.kind === 'route') {
      row.run();
      return;
    }
    onClose();
    window.setTimeout(() => row.run(), 0);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    const step = stepOf(event);
    const digit = typing ? null : digitOf(event);
    if (step !== 0 && rows.length > 0) {
      event.preventDefault();
      setActive((current + step + rows.length) % rows.length);
    } else if (digit !== null) {
      event.preventDefault();
      event.stopPropagation();
      run(rows.find((row) => row.keys === `Mod+${digit}` && row.group === 'Recent'));
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
      <div className="cmdk" role="dialog" aria-modal="true" aria-label="Command palette" aria-busy={busy || undefined}>
        <div className="cmdk-search">
          {busy ? <span className="spinner" aria-hidden="true" /> : <Icon name="search" size={16} />}
          <input
            autoFocus
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={rows[current] ? `${listId}-${current}` : undefined}
            aria-autocomplete="list"
            aria-label="Go to anything, or describe something new"
            placeholder="Go to anything, or describe something new"
            spellCheck={false}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
              setError(null);
            }}
            onKeyDown={onKeyDown}
          />
          <kbd className="cmdk-esc">Esc</kbd>
        </div>
        {error && (
          <div className="cmdk-error" role="alert">
            <Icon name="alert" size={14} />
            <span>{error}</span>
          </div>
        )}
        <div className="cmdk-list" role="listbox" id={listId} ref={listRef} aria-label="Results">
          {rows.length === 0 && <p className="cmdk-empty">{loading ? 'Loading projects…' : `Nothing matches “${query}”.`}</p>}
          {rows.map((row, index) => {
            const head = row.group !== lastGroup ? row.group : null;
            lastGroup = row.group;
            return (
              <div key={`${row.group}-${row.key}`} role="presentation">
                {head && (
                  <div className="cmdk-group" role="presentation">
                    {head}
                  </div>
                )}
                <div
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === current}
                  aria-disabled={row.disabled ? true : undefined}
                  data-index={index}
                  data-kind={row.kind}
                  className="cmdk-row"
                  onMouseMove={() => index !== current && setActive(index)}
                  onClick={() => run(row)}
                >
                  <RowLead row={row} />
                  <span className="cmdk-title truncate">
                    <Marked text={row.title} marks={row.marks} />
                  </span>
                  {row.meta && <span className="cmdk-meta truncate">{row.meta}</span>}
                  <RowEnd row={row} active={index === current} typing={typing} />
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
            <kbd>↩</kbd> Open
          </span>
          <span>
            <kbd>Esc</kbd> Close
          </span>
          <span className="cmdk-foot-end">
            <Keys keys="?" /> All shortcuts
          </span>
        </footer>
      </div>
    </div>
  );
}
