import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from 'react';
import { matchesKey } from '../../shared/keymap';
import type { ProjectHit } from '../../shared/project-search';
import { IS_MAC, tipWithKey } from '../commands/keys';
import { useCommands } from '../commands/registry';
import { openProject } from '../projectNav';
import { noteProjectOpened, refreshProjectHits, useProjectHits } from '../projectHits';
import { BrandMark } from './BrandMark';
import { Icon } from './Icon';
import { HealthDot, ProjectThumb } from './ProjectThumb';
import '../styles/project-nav.css';

const KEY = 'design-studio.rail.v1';
const MINI_MAX = 8;
const GROUPS: { title: string; test: (hit: ProjectHit) => boolean }[] = [
  { title: 'Apps', test: (hit) => hit.type === 'next' || hit.type === 'vite' },
  { title: 'Prototypes', test: (hit) => hit.type === 'html' || hit.type === 'react' },
  { title: 'Design systems', test: (hit) => hit.type === 'design-system' },
];

type RailState = 'open' | 'mini';
const listeners = new Set<() => void>();

function readRail(): RailState {
  try {
    return localStorage.getItem(KEY) === 'open' ? 'open' : 'mini';
  } catch {
    return 'mini';
  }
}

let railState: RailState = readRail();

export function setRail(next: RailState): void {
  railState = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    return;
  } finally {
    for (const listener of listeners) listener();
  }
}

export function toggleRail(): void {
  setRail(railState === 'open' ? 'mini' : 'open');
}

export function useRail(): RailState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => railState,
  );
}

function moveFocus(event: ReactKeyboardEvent<HTMLElement>): void {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
  const items = [...event.currentTarget.querySelectorAll<HTMLElement>('.prail-item')];
  const at = items.indexOf(document.activeElement as HTMLElement);
  if (at < 0 && !(document.activeElement instanceof HTMLInputElement)) return;
  event.preventDefault();
  const next = at < 0 ? 0 : (at + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
  items[next]?.focus();
}

function useRailKeys(onOpened: () => void): void {
  const opened = useRef(onOpened);
  opened.current = onOpened;
  useCommands(() => [{ id: 'view.project-rail', title: 'Show or hide the project rail', group: 'View', icon: 'sidebar', keyId: 'project-rail', keywords: 'projects switch sidebar recent', run: () => toggleRail() }]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || !matchesKey('project-rail', event, IS_MAC)) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      event.preventDefault();
      toggleRail();
      if (railState === 'open') window.requestAnimationFrame(() => opened.current());
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

interface RailProps {
  projectId: string;
  onHome: () => void;
  onNewPrototype: () => void;
}

function tipOf(hit: ProjectHit, current: boolean): string {
  const parts = [hit.name, hit.typeLabel, hit.health?.note].filter(Boolean);
  return current ? `${parts.join(' · ')} (open)` : parts.join(' · ');
}

function MiniRail({ hits, projectId, onNewPrototype }: { hits: ProjectHit[]; projectId: string; onNewPrototype: () => void }) {
  const top = hits.slice(0, MINI_MAX);
  const current = hits.find((hit) => hit.id === projectId);
  const shown = current && !top.includes(current) ? [...top.slice(0, MINI_MAX - 1), current] : top;
  return (
    <>
      <div className="prail-top">
        <BrandMark />
      </div>
      <nav className="prail-thumbs" aria-label="Recent projects">
        {shown.map((hit) => (
          <button
            key={hit.id}
            type="button"
            className="prail-item prail-mini"
            aria-current={hit.id === projectId ? 'page' : undefined}
            aria-label={tipOf(hit, hit.id === projectId)}
            data-tip={tipOf(hit, hit.id === projectId)}
            data-tip-align="start"
            onClick={() => openProject(hit.id)}
          >
            <ProjectThumb hit={hit} />
            <HealthDot hit={hit} className="prail-mini-dot" />
          </button>
        ))}
      </nav>
      <div className="prail-foot">
        <button type="button" className="icon-btn small" aria-label="New prototype" data-tip="New prototype" data-tip-align="start" onClick={onNewPrototype}>
          <Icon name="plus" size={14} />
        </button>
        <button type="button" className="icon-btn small" aria-label="Show projects" aria-expanded="false" data-tip={tipWithKey('Show projects', 'project-rail')} data-tip-align="start" onClick={() => setRail('open')}>
          <Icon name="sidebar" size={14} />
        </button>
      </div>
    </>
  );
}

function RailRow({ hit, current }: { hit: ProjectHit; current: boolean }) {
  return (
    <button
      type="button"
      className="prail-item prail-row"
      aria-current={current ? 'page' : undefined}
      data-tip={hit.health ? `${hit.typeLabel} · ${hit.health.note}` : hit.typeLabel}
      data-tip-align="start"
      onClick={() => openProject(hit.id)}
    >
      <ProjectThumb hit={hit} />
      <span className="truncate">{hit.name}</span>
      <HealthDot hit={hit} />
    </button>
  );
}

function OpenRail({ hits, projectId, onHome, onNewPrototype, find }: { hits: ProjectHit[]; projectId: string; onHome: () => void; onNewPrototype: () => void; find: RefObject<HTMLInputElement | null> }) {
  const [filter, setFilter] = useState('');
  const shown = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return needle ? hits.filter((hit) => `${hit.name} ${hit.place ?? ''}`.toLowerCase().includes(needle)) : hits;
  }, [hits, filter]);
  return (
    <>
      <div className="prail-head">
        <BrandMark />
        <span className="prail-title">Projects</span>
        <button type="button" className="icon-btn small" aria-label="Collapse projects" aria-expanded="true" data-tip={tipWithKey('Collapse', 'project-rail')} data-tip-align="end" onClick={() => setRail('mini')}>
          <Icon name="sidebar" size={14} />
        </button>
      </div>
      <div className="prail-find">
        <Icon name="search" size={12} />
        <input
          ref={find}
          value={filter}
          placeholder="Find"
          aria-label="Find a project"
          spellCheck={false}
          onChange={(e) => setFilter(e.target.value)}
          onKeyDown={(e) => {
            const first = shown[0];
            if (e.key === 'Enter' && first && !e.nativeEvent.isComposing) openProject(first.id);
            else if (e.key === 'Escape' && filter) {
              e.preventDefault();
              e.stopPropagation();
              setFilter('');
            }
          }}
        />
      </div>
      <nav className="prail-list" aria-label="Projects">
        {GROUPS.map((group) => {
          const items = shown.filter(group.test);
          if (items.length === 0) return null;
          return (
            <div key={group.title} className="prail-group" role="group" aria-label={group.title}>
              <div className="prail-group-head">{group.title}</div>
              {items.map((hit) => (
                <RailRow key={hit.id} hit={hit} current={hit.id === projectId} />
              ))}
            </div>
          );
        })}
        {shown.length === 0 && <p className="prail-empty">{filter ? 'No project matches.' : 'Loading projects…'}</p>}
      </nav>
      <div className="prail-foot">
        <button type="button" className="btn small" onClick={onNewPrototype}>
          <Icon name="plus" size={12} />
          New prototype
        </button>
        <button type="button" className="btn small ghost" onClick={onHome}>
          <Icon name="arrowLeft" size={12} />
          All projects
        </button>
      </div>
    </>
  );
}

export function ProjectRail({ projectId, onHome, onNewPrototype }: RailProps) {
  const state = useRail();
  const result = useProjectHits(projectId);
  const find = useRef<HTMLInputElement>(null);
  useRailKeys(() => find.current?.focus());
  useEffect(() => noteProjectOpened(projectId), [projectId]);
  useEffect(() => {
    const onFocus = () => void refreshProjectHits(projectId);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [projectId]);
  const hits = result?.projects ?? [];
  return (
    <aside className="prail" data-state={state} aria-label="Project rail" onKeyDown={moveFocus}>
      {state === 'open' ? <OpenRail hits={hits} projectId={projectId} onHome={onHome} onNewPrototype={onNewPrototype} find={find} /> : <MiniRail hits={hits} projectId={projectId} onNewPrototype={onNewPrototype} />}
    </aside>
  );
}
