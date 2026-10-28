import { lazy, Suspense, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import type { PackSummary, Project } from '../../shared/contracts';
import { api } from '../api';
import { findPack, keySwatches } from '../packs';
import { filterProjects, gridColumns, nextGridIndex, sortProjects } from '../projectList';
import { HOME_SORTS, uiStore, useUi, type HomeSort } from '../storage';
import { homePrefs, useHomePrefs } from '../homePrefs';
import { Swatches } from './Swatches';
import { formatRelative, formatTime } from '../format';
import { Icon } from './Icon';
import { LazySelect } from './LazySelect';
import { prefetchStudio } from '../screens';

const SORT_LABELS: Record<HomeSort, string> = { recent: 'Recent', name: 'Name', created: 'Created' };
const SORT_OPTIONS = HOME_SORTS.map((sort) => ({ value: sort, label: SORT_LABELS[sort] }));

const thumbCache = new Map<string, Promise<string>>();

function useThumbnail(project: Project): string | null {
  const thumb = project.thumbnail ?? null;
  const key = thumb ? `${project.id}/${thumb.versionId}` : null;
  const [url, setUrl] = useState<{ key: string; url: string } | null>(null);
  useEffect(() => {
    if (!key || !thumb) return;
    let live = true;
    let pending = thumbCache.get(key);
    if (!pending) {
      pending = api.thumbnail(project.id, thumb.versionId).then((blob) => URL.createObjectURL(blob));
      pending.catch(() => thumbCache.delete(key));
      thumbCache.set(key, pending);
    }
    pending.then(
      (next) => live && setUrl({ key, url: next }),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [key, project.id, thumb]);
  if (url) return url.url;
  return null;
}

function Star({ filled, size = 14 }: { filled: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.4} strokeLinejoin="round">
      <path d="M8 1.9l1.8 3.8 4.1.5-3 2.9.8 4.1L8 11.2l-3.7 2 .8-4.1-3-2.9 4.1-.5z" />
    </svg>
  );
}

export interface CardActions {
  onOpen: (project: Project) => void;
  onRename: (project: Project, name: string) => Promise<void>;
  onDuplicate: (project: Project) => void;
  onDelete: (project: Project) => void;
}

export type MenuAt = { x: number; y: number } | 'button' | 'keys' | null;

const menusChunk = import('./ProjectCardMenus');
const CardMenu = lazy(() => menusChunk.then((m) => ({ default: m.CardMenu })));
const RenameField = lazy(() => menusChunk.then((m) => ({ default: m.RenameField })));

interface CardProps {
  project: Project;
  pack: PackSummary | null;
  active: boolean;
  favorite: boolean;
  actions: CardActions;
  onFocusCard: () => void;
}

const FRAMEWORK_BADGE = { next: 'Next.js', vite: 'Vite' } as const;

function kindBadge(project: Project): string {
  if (project.app) return FRAMEWORK_BADGE[project.app.framework];
  return project.kind === 'html' ? 'HTML' : 'React + Vite';
}

function ProjectCard({ project, pack, active, favorite, actions, onFocusCard }: CardProps) {
  const html = project.kind === 'html';
  const count = project.directions.length;
  const thumb = useThumbnail(project);
  const [menu, setMenu] = useState<MenuAt>(null);
  const [renaming, setRenaming] = useState(false);
  const openRef = useRef<HTMLButtonElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const closeMenu = (refocus: boolean) => {
    setMenu(null);
    if (refocus) openRef.current?.focus();
  };

  const pick = (action: 'open' | 'rename' | 'duplicate' | 'delete') => {
    closeMenu(action === 'duplicate');
    if (action === 'open') actions.onOpen(project);
    if (action === 'rename') setRenaming(true);
    if (action === 'duplicate') actions.onDuplicate(project);
    if (action === 'delete') actions.onDelete(project);
  };

  const onContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const box = cardRef.current?.getBoundingClientRect();
    setMenu(box ? { x: event.clientX - box.left, y: event.clientY - box.top } : 'button');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const mod = event.metaKey || event.ctrlKey;
    if (event.key === 'F2') {
      event.preventDefault();
      setRenaming(true);
    } else if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
      event.preventDefault();
      setMenu('keys');
    } else if (mod && event.key.toLowerCase() === 'd') {
      event.preventDefault();
      actions.onDuplicate(project);
    } else if (mod && (event.key === 'Backspace' || event.key === 'Delete')) {
      event.preventDefault();
      actions.onDelete(project);
    }
  };

  const finishRename = (name: string | null) => {
    setRenaming(false);
    window.requestAnimationFrame(() => openRef.current?.focus());
    if (name) void actions.onRename(project, name);
  };

  const meta = (
    <span className="project-meta">
      <span className="badge">{kindBadge(project)}</span>
      <time className="project-time" dateTime={new Date(project.updatedAt).toISOString()} data-tip={formatTime(project.updatedAt)}>
        {formatRelative(project.updatedAt)}
      </time>
      {count > 1 && <span className="truncate">{count} directions</span>}
      {pack && (
        <span className="project-pack" data-tip={`Design system: ${pack.name}`}>
          <Swatches swatches={keySwatches(pack)} max={4} size="sm" />
          <span className="sr-only">Design system: {pack.name}</span>
        </span>
      )}
    </span>
  );

  const preview: ReactNode = (
    <span className={`project-thumb${thumb ? ' has-image' : ''}`} aria-hidden="true">
      {thumb ? (
        <img src={thumb} alt="" draggable={false} data-version={project.thumbnail?.versionId} />
      ) : (
        <span className={`project-glyph ${project.kind}`}>
          <Icon name={html ? 'code' : 'react'} size={18} />
        </span>
      )}
    </span>
  );

  return (
    <div ref={cardRef} className={`project-card${menu ? ' menu-open' : ''}${favorite ? ' favorite' : ''}`} data-project-id={project.id} onContextMenu={onContextMenu}>
      {renaming ? (
        <div className="project-open renaming">
          {preview}
          <span className="project-body">
            <Suspense fallback={<span className="project-name">{project.name}</span>}>
              <RenameField project={project} onDone={finishRename} />
            </Suspense>
            {meta}
          </span>
        </div>
      ) : (
        <button ref={openRef} type="button" className="project-open" tabIndex={active ? 0 : -1} onClick={() => actions.onOpen(project)} onPointerEnter={() => void prefetchStudio()} onFocus={() => { void prefetchStudio(); onFocusCard(); }} onKeyDown={onKeyDown}>
          {preview}
          <span className="project-body">
            <span className="project-name" title={project.name}>
              {project.name}
            </span>
            {meta}
          </span>
        </button>
      )}
      <button
        type="button"
        className="project-star icon-btn small"
        tabIndex={active ? 0 : -1}
        aria-label={favorite ? `Remove ${project.name} from favorites` : `Add ${project.name} to favorites`}
        aria-pressed={favorite}
        data-tip={favorite ? 'Remove from favorites' : 'Add to favorites'}
        data-tip-align="end"
        onClick={() => homePrefs.toggleFavorite(project.id)}
      >
        <Star filled={favorite} />
      </button>
      <button
        ref={moreRef}
        type="button"
        className="project-more icon-btn"
        tabIndex={active ? 0 : -1}
        aria-label={`More actions for ${project.name}`}
        aria-haspopup="menu"
        aria-expanded={menu !== null}
        data-tip="More actions"
        data-tip-align="end"
        onClick={() => setMenu((current) => (current ? null : 'button'))}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <Icon name="more" size={16} />
      </button>
      {menu && (
        <Suspense fallback={null}>
          <CardMenu project={project} at={menu} onClose={closeMenu} onPick={pick} />
        </Suspense>
      )}
    </div>
  );
}

interface Props {
  projects: Project[] | null;
  packs: PackSummary[] | null;
  error: string | null;
  actions: CardActions;
  query: string;
  onQuery: (query: string) => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
  filter?: { label: string; onClear: () => void } | null;
  tabs: ReactNode;
}

function ProjectListTools({ query, onQuery, searchRef, onFirst, onOpenFirst, canOpen }: { query: string; onQuery: (query: string) => void; searchRef: React.RefObject<HTMLInputElement | null>; onFirst: () => void; onOpenFirst: () => void; canOpen: boolean }) {
  const { homeSort } = useUi();
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && canOpen) {
      event.preventDefault();
      onFirst();
    } else if (event.key === 'Enter' && canOpen) {
      event.preventDefault();
      onOpenFirst();
    } else if (event.key === 'Escape' && query) {
      event.preventDefault();
      event.stopPropagation();
      onQuery('');
    }
  };
  return (
    <div className="home-list-tools">
      <label className="home-search">
        <Icon name="search" size={14} />
        <input ref={searchRef} type="search" aria-label="Search projects" placeholder="Search" value={query} onChange={(event) => onQuery(event.target.value)} onKeyDown={onKeyDown} />
        {!query && (
          <kbd className="home-search-key" aria-hidden="true">
            /
          </kbd>
        )}
      </label>
      <ViewTools />
      <LazySelect className="home-sort" aria-label="Sort projects" value={homeSort} options={SORT_OPTIONS} onChange={(sort) => uiStore.set({ homeSort: sort })} />
    </div>
  );
}

function ViewTools() {
  const { view, favoritesOnly } = useHomeView();
  return (
    <>
      <button type="button" className="icon-btn home-fav-filter" aria-pressed={favoritesOnly} aria-label="Show favorites only" data-tip="Favorites" onClick={() => homePrefs.set({ favoritesOnly: !favoritesOnly })}>
        <Star filled={favoritesOnly} />
      </button>
      <div className="ui-tools home-view-toggle" role="group" aria-label="Layout">
        <button type="button" aria-pressed={view === 'list'} aria-label="List" data-tip="List" onClick={() => homePrefs.set({ view: 'list' })}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden="true">
            <path d="M5.5 4h8M5.5 8h8M5.5 12h8M2.5 4h.01M2.5 8h.01M2.5 12h.01" />
          </svg>
        </button>
        <button type="button" aria-pressed={view === 'grid'} aria-label="Grid" data-tip="Grid" data-tip-align="end" onClick={() => homePrefs.set({ view: 'grid' })}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
            <path d="M2.75 2.75h4v4h-4zM9.25 2.75h4v4h-4zM2.75 9.25h4v4h-4zM9.25 9.25h4v4h-4z" />
          </svg>
        </button>
      </div>
    </>
  );
}

function useHomeView() {
  const prefs = useHomePrefs();
  return { view: prefs.view, favoritesOnly: prefs.favoritesOnly, favorites: prefs.favorites };
}

function ProjectListStates({ projects, error, filter, query, shownCount, onClearQuery }: { projects: Project[] | null; error: string | null; filter: { label: string } | null; query: string; shownCount: number; onClearQuery: () => void }) {
  return (
    <>
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}
      {projects === null && !error && (
        <div className="project-grid" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="project-card skeleton" />
          ))}
        </div>
      )}
      {filter && projects?.length === 0 && (
        <div className="home-empty">
          <Icon name="folder" size={16} />
          <span>No projects in {filter.label} yet. Use New project here or Open folder here.</span>
        </div>
      )}
      {!filter && projects?.length === 0 && (
        <div className="home-empty">
          <Icon name="folder" size={16} />
          <span>No projects yet. Describe a design above, pick a starter, or open a folder that already holds one.</span>
        </div>
      )}
      {projects && projects.length > 0 && shownCount === 0 && (
        <div className="home-empty" role="status">
          <Icon name="search" size={16} />
          <span>No projects match “{query.trim()}”.</span>
          <button type="button" className="link" onClick={() => onClearQuery()}>
            Clear search
          </button>
        </div>
      )}
    </>
  );
}

function useGridFocus(shown: Project[]) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = shown.some((project) => project.id === activeId) ? activeId : (shown[0]?.id ?? null);
  const focusAt = (index: number) => {
    const target = shown[index];
    if (!target) return;
    setActiveId(target.id);
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-project-id="${CSS.escape(target.id)}"] .project-open`)?.focus();
  };
  const onGridKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!(event.target instanceof HTMLElement) || !event.target.classList.contains('project-open')) return;
    const next = nextGridIndex(event.key, shown.findIndex((project) => project.id === active), shown.length, gridColumns(gridRef.current));
    if (next === null) return;
    event.preventDefault();
    focusAt(next);
  };
  return { gridRef, active, setActiveId, focusAt, onGridKey };
}

export function ProjectGrid({ projects, packs, error, actions, query, onQuery, searchRef, filter = null, tabs }: Props) {
  const { homeSort } = useUi();
  const { view, favoritesOnly, favorites } = useHomeView();
  const matched = sortProjects(filterProjects(projects ?? [], query), homeSort);
  const shown = favoritesOnly ? matched.filter((project) => favorites.includes(project.id)) : matched;
  const { gridRef, active, setActiveId, focusAt, onGridKey } = useGridFocus(shown);
  const total = projects?.length ?? 0;
  const first = shown[0];
  const gridActions: CardActions = {
    ...actions,
    onDelete: (project) => {
      const index = shown.findIndex((item) => item.id === project.id);
      const hadFocus = gridRef.current?.contains(document.activeElement) ?? false;
      actions.onDelete(project);
      if (!hadFocus) return;
      window.requestAnimationFrame(() => {
        const buttons = gridRef.current?.querySelectorAll<HTMLButtonElement>('.project-open');
        if (buttons && buttons.length > 0) buttons[Math.min(index, buttons.length - 1)]?.focus();
        else searchRef.current?.focus();
      });
    },
  };

  return (
    <section className="home-list" aria-label="Projects">
      <div className="home-list-head">
        {tabs}
        <div className="spacer" />
        {total > 0 && <ProjectListTools query={query} onQuery={onQuery} searchRef={searchRef} onFirst={() => focusAt(0)} onOpenFirst={() => first && actions.onOpen(first)} canOpen={first !== undefined} />}
      </div>
      {filter && (
        <p className="home-filter-note">
          Projects in {filter.label}
          <button type="button" className="link" onClick={filter.onClear}>
            Show all
          </button>
        </p>
      )}
      <ProjectListStates projects={projects} error={error} filter={filter} query={query} shownCount={matched.length} onClearQuery={() => onQuery('')} />
      {favoritesOnly && matched.length > 0 && shown.length === 0 && (
        <div className="home-empty" role="status">
          <Star filled={false} size={16} />
          <span>No favorites yet. Use the star on a project to add it.</span>
        </div>
      )}
      {shown.length > 0 && (
        <div className={`project-grid ${view}`} ref={gridRef} onKeyDown={onGridKey}>
          {shown.map((project) => (
            <ProjectCard key={project.id} project={project} pack={findPack(packs, project.packId)} active={project.id === active} favorite={favorites.includes(project.id)} actions={gridActions} onFocusCard={() => setActiveId(project.id)} />
          ))}
        </div>
      )}
    </section>
  );
}
