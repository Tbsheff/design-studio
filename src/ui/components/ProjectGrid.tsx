import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import type { PackSummary, Project } from '../../shared/contracts';
import { api } from '../api';
import { findPack, keySwatches } from '../packs';
import { filterProjects, gridColumns, nextGridIndex, sortProjects } from '../projectList';
import { HOME_SORTS, uiStore, useUi, type HomeSort } from '../storage';
import { Swatches } from './Swatches';
import { formatRelative, formatTime } from '../format';
import { Icon } from './Icon';

const SORT_LABELS: Record<HomeSort, string> = { recent: 'Recent', name: 'Name', created: 'Created' };

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

export interface CardActions {
  onOpen: (project: Project) => void;
  onRename: (project: Project, name: string) => Promise<void>;
  onDuplicate: (project: Project) => void;
  onDelete: (project: Project) => void;
}

type MenuAt = { x: number; y: number } | 'button' | 'keys' | null;

function CardMenu({ project, at, onClose, onPick }: { project: Project; at: Exclude<MenuAt, null>; onClose: (refocus: boolean) => void; onPick: (action: 'open' | 'rename' | 'duplicate' | 'delete') => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    const onDown = (event: globalThis.MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [onClose]);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = [...(ref.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])];
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === 'Escape' || event.key === 'Tab') {
      event.preventDefault();
      event.stopPropagation();
      onClose(true);
      return;
    }
    const next = event.key === 'ArrowDown' ? index + 1 : event.key === 'ArrowUp' ? index - 1 : event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    items[(next + items.length) % items.length]?.focus();
  };
  const style = typeof at === 'string' ? undefined : { left: at.x, top: at.y, right: 'auto' };
  const mode = typeof at === 'string' ? (at === 'keys' ? ' instant' : '') : ' at-pointer';
  const item = (action: 'open' | 'rename' | 'duplicate' | 'delete', label: string, icon: Parameters<typeof Icon>[0]['name'], keys: string, danger = false) => (
    <button type="button" role="menuitem" className={danger ? 'danger' : undefined} onClick={() => onPick(action)}>
      <Icon name={icon} size={14} />
      <span>{label}</span>
      <kbd aria-hidden="true">{keys}</kbd>
    </button>
  );
  return (
    <div ref={ref} className={`project-menu${mode}`} role="menu" aria-label={`Actions for ${project.name}`} style={style} onKeyDown={onKeyDown} onContextMenu={(event) => event.preventDefault()}>
      {item('open', 'Open', 'chevronRight', '↩')}
      {item('rename', 'Rename', 'pencil', 'F2')}
      {item('duplicate', 'Duplicate', 'copy', '⌘D')}
      <div className="project-menu-sep" role="separator" />
      {item('delete', 'Delete', 'trash', '⌘⌫', true)}
    </div>
  );
}

function RenameField({ project, onDone }: { project: Project; onDone: (name: string | null) => void }) {
  const [value, setValue] = useState(project.name);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onDone(value.trim() && value.trim() !== project.name ? value.trim() : null);
  };
  return (
    <form className="project-rename" onSubmit={submit}>
      <input
        ref={ref}
        aria-label="Project name"
        value={value}
        maxLength={120}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => onDone(value.trim() && value.trim() !== project.name ? value.trim() : null)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            onDone(null);
          }
        }}
      />
    </form>
  );
}

interface CardProps {
  project: Project;
  pack: PackSummary | null;
  active: boolean;
  actions: CardActions;
  onFocusCard: () => void;
}

function ProjectCard({ project, pack, active, actions, onFocusCard }: CardProps) {
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
      <span className="badge">{html ? 'HTML' : 'React + Vite'}</span>
      <time className="project-time" dateTime={new Date(project.updatedAt).toISOString()} title={formatTime(project.updatedAt)}>
        {formatRelative(project.updatedAt)}
      </time>
      {count > 1 && <span className="truncate">{count} directions</span>}
      {pack && (
        <span className="project-pack" title={`Design system: ${pack.name}`}>
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
    <div ref={cardRef} className={`project-card${menu ? ' menu-open' : ''}`} data-project-id={project.id} onContextMenu={onContextMenu}>
      {renaming ? (
        <div className="project-open renaming">
          {preview}
          <span className="project-body">
            <RenameField project={project} onDone={finishRename} />
            {meta}
          </span>
        </div>
      ) : (
        <button ref={openRef} type="button" className="project-open" tabIndex={active ? 0 : -1} onClick={() => actions.onOpen(project)} onFocus={onFocusCard} onKeyDown={onKeyDown}>
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
        ref={moreRef}
        type="button"
        className="project-more icon-btn"
        tabIndex={active ? 0 : -1}
        aria-label={`More actions for ${project.name}`}
        aria-haspopup="menu"
        aria-expanded={menu !== null}
        title="More actions"
        onClick={() => setMenu((current) => (current ? null : 'button'))}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <Icon name="more" size={16} />
      </button>
      {menu && <CardMenu project={project} at={menu} onClose={closeMenu} onPick={pick} />}
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
      <label className="home-sort">
        <span className="sr-only">Sort projects</span>
        <select className="select small" value={homeSort} onChange={(event) => uiStore.set({ homeSort: event.target.value as HomeSort })}>
          {HOME_SORTS.map((sort) => (
            <option key={sort} value={sort}>
              {SORT_LABELS[sort]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
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
          <Icon name="folder" size={18} />
          <span>No projects in {filter.label} yet. Use New project here or Open folder here.</span>
        </div>
      )}
      {!filter && projects?.length === 0 && (
        <div className="home-empty">
          <Icon name="folder" size={18} />
          <span>No projects yet. Describe a design above, pick a starter, or open a folder that already holds one.</span>
        </div>
      )}
      {projects && projects.length > 0 && shownCount === 0 && (
        <div className="home-empty" role="status">
          <Icon name="search" size={18} />
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

function ListHeading({ filter, total, shownCount, searching, sort }: { filter: { label: string; onClear: () => void } | null; total: number; shownCount: number; searching: boolean; sort: HomeSort }) {
  return (
    <>
      <h2 id="projects-heading">{filter ? `Projects in ${filter.label}` : sort === 'recent' ? 'Recent projects' : 'Projects'}</h2>
      {total > 0 && <span className="count">{searching ? `${shownCount} of ${total}` : total}</span>}
      {filter && (
        <button type="button" className="link home-list-clear" onClick={filter.onClear}>
          Show all
        </button>
      )}
    </>
  );
}

export function ProjectGrid({ projects, packs, error, actions, query, onQuery, searchRef, filter = null }: Props) {
  const { homeSort } = useUi();
  const shown = sortProjects(filterProjects(projects ?? [], query), homeSort);
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
    <section className="home-list" aria-labelledby="projects-heading">
      <div className="home-list-head">
        <ListHeading filter={filter} total={total} shownCount={shown.length} searching={query.trim() !== ''} sort={homeSort} />
        <div className="spacer" />
        {total > 0 && <ProjectListTools query={query} onQuery={onQuery} searchRef={searchRef} onFirst={() => focusAt(0)} onOpenFirst={() => first && actions.onOpen(first)} canOpen={first !== undefined} />}
      </div>
      <ProjectListStates projects={projects} error={error} filter={filter} query={query} shownCount={shown.length} onClearQuery={() => onQuery('')} />
      {shown.length > 0 && (
        <div className="project-grid" ref={gridRef} onKeyDown={onGridKey}>
          {shown.map((project) => (
            <ProjectCard key={project.id} project={project} pack={findPack(packs, project.packId)} active={project.id === active} actions={gridActions} onFocusCard={() => setActiveId(project.id)} />
          ))}
        </div>
      )}
    </section>
  );
}
