import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";

import type {
  PackSummary,
  Project,
  RunSummary,
} from "../../../shared/contracts.js";
import { shortenHome } from "../../../shared/folders.js";
import type { AppHealth } from "../../../shared/found-apps.js";
import {
  projectTypeOf,
  TYPE_LABELS,
  type ProjectType,
} from "../../../shared/project-search.js";
import { api, json, warmProject } from "../../api.js";
import { prefetchStudio } from "../../app/screen-preload.js";
import { formatRelative, formatTime } from "../../domain/format.js";
import { Icon } from "../../kit/Icon.js";
import { LazySelect } from "../../kit/lazy-select.js";
import {
  HOME_SORTS,
  uiStore,
  useUi,
  type HomeSort,
} from "../../platform/storage.js";
import { findPack, keySwatches } from "../design-system/packs.js";
import { Swatches } from "../inspector/swatches.js";
import { homePrefs, useHomePrefs } from "./home-prefs-model.js";
import {
  toFilteredProjects,
  toGridColumns,
  toNextGridIndex,
  toSortedProjects,
} from "./index.js";

const SORT_LABELS: Record<HomeSort, string> = {
  recent: "Recent",
  name: "Name",
  created: "Created",
};

const SORT_OPTIONS = HOME_SORTS.map((sort) => ({
  value: sort,
  label: SORT_LABELS[sort],
}));

const thumbCache = new Map<string, Promise<string>>();
const runCache = new Map<string, Promise<boolean>>();

export function useLastRunFailed(project: Project): boolean {
  const key = `${project.id}/${project.updatedAt}`;

  const [failed, setFailed] = useState<{ key: string; on: boolean } | null>(
    null
  );

  useEffect(() => {
    let live = true;
    let pending = runCache.get(key);

    if (!pending) {
      pending = json<{ runs: RunSummary[] }>(
        "GET",
        `/api/projects/${encodeURIComponent(project.id)}/runs?limit=1&light=1`
      ).then(({ runs }) => runs[0]?.status === "failed");
      pending.catch(() => runCache.delete(key));
      runCache.set(key, pending);
    }

    pending.then(
      (on) => live && setFailed({ key, on }),
      () => undefined
    );

    return () => {
      live = false;
    };
  }, [key, project.id]);

  return failed?.key === key && failed.on;
}

function warmOpen(project: Project, withPreview: boolean): void {
  void prefetchStudio();

  const did =
    uiStore.get().directionByProject[project.id] ??
    project.directions[0]?.id ??
    null;

  warmProject(project.id, withPreview ? did : null);
}

export function useThumbnail(project: Project): string | null {
  const thumb = project.thumbnail ?? null;
  const key = thumb ? `${project.id}/${thumb.versionId}` : null;
  const [url, setUrl] = useState<{ key: string; url: string } | null>(null);
  useEffect(() => {
    if (!key || !thumb) {
      return;
    }

    let live = true;
    let pending = thumbCache.get(key);

    if (!pending) {
      pending = api
        .thumbnail(project.id, thumb.versionId)
        .then((blob) => URL.createObjectURL(blob));
      pending.catch(() => thumbCache.delete(key));
      thumbCache.set(key, pending);
    }

    pending.then(
      (next) => live && setUrl({ key, url: next }),
      () => undefined
    );

    return () => {
      live = false;
    };
  }, [key, project.id, thumb]);

  if (url) {
    return url.url;
  }

  return null;
}

function Star({ filled, size = 14 }: { filled: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-hidden="true"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinejoin="round"
    >
      <path d="M8 1.9l1.8 3.8 4.1.5-3 2.9.8 4.1L8 11.2l-3.7 2 .8-4.1-3-2.9 4.1-.5z" />
    </svg>
  );
}

export interface CardActions {
  onOpen: (project: Project) => void;
  onRename: (project: Project, name: string) => Promise<void>;
  onDuplicate: (project: Project) => void;
  onReveal: (project: Project) => void;
  onDelete: (project: Project) => void;
}

export type CardAction = "open" | "rename" | "duplicate" | "reveal" | "delete";

export type MenuAt = { x: number; y: number } | "button" | "keys" | null;

const menusChunk = import("./project-card-menus.js");
const CardMenu = lazy(() => menusChunk.then((m) => ({ default: m.CardMenu })));

const RenameField = lazy(() =>
  menusChunk.then((m) => ({ default: m.RenameField }))
);

interface CardProps {
  project: Project;
  pack: PackSummary | null;
  health: AppHealth | null;
  homeDir: string | null;
  active: boolean;
  favorite: boolean;
  actions: CardActions;
  onFocusCard: () => void;
}

const TYPE_TONE: Record<ProjectType, string> = {
  next: "next",
  vite: "vite",
  html: "proto",
  react: "proto",
  "design-system": "dsb",
};

export function isFolderProject(project: Project): boolean {
  return Boolean(project.imported && !project.imported.created);
}

export function projectBadge(project: Project): {
  label: string;
  tone: string;
} {
  const type = projectTypeOf(project);

  const tone =
    type === "html" && isFolderProject(project) ? "html" : TYPE_TONE[type];

  return { label: TYPE_LABELS[type], tone };
}

export function projectPlace(project: Project, homeDir: string | null): string {
  return isFolderProject(project) && project.imported
    ? shortenHome(
        project.imported.sourcePath.replace(/^\/private(?=\/)/u, ""),
        homeDir
      )
    : "Design Studio";
}

const HEALTH_TEXT: Record<AppHealth["state"], string> = {
  ready: "Ready",
  install: "Needs install",
  building: "Building…",
  failed: "Failed",
  static: "Static",
};

export function HealthCell({
  health,
  runFailed = false,
}: {
  health: AppHealth | null;
  runFailed?: boolean;
}) {
  const state = health?.state ?? "static";

  if (runFailed && state !== "install" && state !== "failed") {
    return (
      <span
        className="project-health run-failed"
        data-tip="The last AI run failed. Open the project to see why."
      >
        <span className="project-dot" aria-hidden="true" />
        Last run failed
      </span>
    );
  }

  if (state === "static") {
    return null;
  }

  return (
    <span
      className={`project-health ${state}`}
      data-tip={health?.title ?? undefined}
    >
      <span className="project-dot" aria-hidden="true" />
      {HEALTH_TEXT[state]}
    </span>
  );
}

function toProjectAction(
  actions: CardActions,
  project: Project,
  action: CardAction,
  startRename: () => void
): void {
  if (action === "rename") {
    startRename();
  } else if (action === "open") {
    actions.onOpen(project);
  } else if (action === "duplicate") {
    actions.onDuplicate(project);
  } else if (action === "reveal") {
    actions.onReveal(project);
  } else {
    actions.onDelete(project);
  }
}

function isMenuKey(event: KeyboardEvent<HTMLButtonElement>): boolean {
  return event.key === "ContextMenu" || (event.shiftKey && event.key === "F10");
}

function useProjectCard(project: Project, actions: CardActions) {
  const [menu, setMenu] = useState<MenuAt>(null);
  const [renaming, setRenaming] = useState(false);
  const openRef = useRef<HTMLButtonElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const closeMenu = (refocus: boolean) => {
    setMenu(null);

    if (refocus) {
      openRef.current?.focus();
    }
  };

  const pick = (action: CardAction) => {
    closeMenu(action === "duplicate" || action === "reveal");
    toProjectAction(actions, project, action, () => setRenaming(true));
  };

  const onContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const box = cardRef.current?.getBoundingClientRect();
    setMenu(
      box
        ? { x: event.clientX - box.left, y: event.clientY - box.top }
        : "button"
    );
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const mod = event.metaKey || event.ctrlKey;

    if (event.key === "F2") {
      event.preventDefault();
      setRenaming(true);
    } else if (isMenuKey(event)) {
      event.preventDefault();
      setMenu("keys");
    } else if (mod && event.key.toLowerCase() === "d") {
      event.preventDefault();
      actions.onDuplicate(project);
    } else if (mod && (event.key === "Backspace" || event.key === "Delete")) {
      event.preventDefault();
      actions.onDelete(project);
    }
  };

  const finishRename = (name: string | null) => {
    setRenaming(false);
    window.requestAnimationFrame(() => openRef.current?.focus());

    if (name) {
      void actions.onRename(project, name);
    }
  };

  return {
    menu,
    renaming,
    openRef,
    moreRef,
    cardRef,
    toggleMenu: () => setMenu((current) => (current ? null : "button")),
    closeMenu,
    pick,
    onContextMenu,
    onKeyDown,
    finishRename,
  };
}

function ProjectCardMeta({
  project,
  pack,
  health,
}: {
  project: Project;
  pack: PackSummary | null;
  health: AppHealth | null;
}) {
  const runFailed = useLastRunFailed(project);
  const count = project.directions.length;
  const badge = projectBadge(project);

  return (
    <span className="project-meta">
      <span className={`home-badge ${badge.tone}`}>{badge.label}</span>
      <HealthCell
        health={project.imported ? health : null}
        runFailed={runFailed}
      />
      <time
        className="project-time"
        dateTime={new Date(project.updatedAt).toISOString()}
        data-tip={formatTime(project.updatedAt)}
      >
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
}

function ProjectCardPreview({ project }: { project: Project }) {
  const thumb = useThumbnail(project);
  const html = project.kind === "html";

  return (
    <span
      className={`project-thumb${thumb ? " has-image" : ""}`}
      aria-hidden="true"
    >
      {thumb ? (
        <img
          src={thumb}
          alt=""
          draggable={false}
          data-version={project.thumbnail?.versionId}
        />
      ) : (
        <span className={`project-glyph ${project.kind}`}>
          <Icon name={html ? "code" : "react"} size={18} />
        </span>
      )}
    </span>
  );
}

function ProjectCardOpen({
  project,
  pack,
  health,
  homeDir,
  active,
  card,
  onOpen,
  onFocusCard,
}: {
  project: Project;
  pack: PackSummary | null;
  health: AppHealth | null;
  homeDir: string | null;
  active: boolean;
  card: ReturnType<typeof useProjectCard>;
  onOpen: () => void;
  onFocusCard: () => void;
}) {
  const meta = (
    <ProjectCardMeta project={project} pack={pack} health={health} />
  );

  const preview = <ProjectCardPreview project={project} />;

  if (card.renaming) {
    return (
      <div className="project-open renaming">
        {preview}
        <span className="project-body">
          <Suspense
            fallback={<span className="project-name">{project.name}</span>}
          >
            <RenameField project={project} onDone={card.finishRename} />
          </Suspense>
          {meta}
        </span>
      </div>
    );
  }

  return (
    <button
      ref={card.openRef}
      type="button"
      className="project-open"
      tabIndex={active ? 0 : -1}
      onClick={onOpen}
      onPointerEnter={() => warmOpen(project, false)}
      onPointerDown={() => warmOpen(project, true)}
      onFocus={() => {
        warmOpen(project, false);
        onFocusCard();
      }}
      onKeyDown={card.onKeyDown}
    >
      {preview}
      <span className="project-body">
        <span className="project-name" data-tip={project.name}>
          {project.name}
        </span>
        <span className="project-place mono truncate">
          {projectPlace(project, homeDir)}
        </span>
        {meta}
      </span>
    </button>
  );
}

function ProjectCard({
  project,
  pack,
  health,
  homeDir,
  active,
  favorite,
  actions,
  onFocusCard,
}: CardProps) {
  const card = useProjectCard(project, actions);
  const { menu } = card;

  return (
    <div
      ref={card.cardRef}
      className={`project-card${menu ? " menu-open" : ""}${favorite ? " favorite" : ""}`}
      data-project-id={project.id}
      onContextMenu={card.onContextMenu}
    >
      <ProjectCardOpen
        project={project}
        pack={pack}
        health={health}
        homeDir={homeDir}
        active={active}
        card={card}
        onOpen={() => actions.onOpen(project)}
        onFocusCard={onFocusCard}
      />
      <button
        type="button"
        className="project-star icon-btn small"
        tabIndex={active ? 0 : -1}
        aria-label={
          favorite
            ? `Remove ${project.name} from favorites`
            : `Add ${project.name} to favorites`
        }
        aria-pressed={favorite}
        data-tip={favorite ? "Remove from favorites" : "Add to favorites"}
        data-tip-align="end"
        onClick={() => homePrefs.toggleFavorite(project.id)}
      >
        <Star filled={favorite} />
      </button>
      <button
        ref={card.moreRef}
        type="button"
        className="project-more icon-btn"
        tabIndex={active ? 0 : -1}
        aria-label={`More actions for ${project.name}`}
        aria-haspopup="menu"
        aria-expanded={menu !== null}
        data-tip="More actions"
        data-tip-align="end"
        onClick={card.toggleMenu}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <Icon name="more" size={16} />
      </button>
      {menu && (
        <Suspense fallback={null}>
          <CardMenu
            project={project}
            place={
              isFolderProject(project) ? projectPlace(project, homeDir) : null
            }
            at={menu}
            onClose={card.closeMenu}
            onPick={card.pick}
          />
        </Suspense>
      )}
    </div>
  );
}

interface Props {
  projects: Project[] | null;
  packs: PackSummary[] | null;
  health: Map<string, AppHealth>;
  homeDir: string | null;
  error: string | null;
  actions: CardActions;
  query: string;
  onQuery: (query: string) => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
  filter?: ListFilter | null;
  tabs: ReactNode;
  headActions?: ReactNode;
}

function ProjectListTools({
  query,
  onQuery,
  searchRef,
  onFirst,
  onOpenFirst,
  canOpen,
}: {
  query: string;
  onQuery: (query: string) => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
  onFirst: () => void;
  onOpenFirst: () => void;
  canOpen: boolean;
}) {
  const { homeSort } = useUi();

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && canOpen) {
      event.preventDefault();
      onFirst();
    } else if (event.key === "Enter" && canOpen) {
      event.preventDefault();
      onOpenFirst();
    } else if (event.key === "Escape" && query) {
      event.preventDefault();
      event.stopPropagation();
      onQuery("");
    }
  };

  return (
    <div className="home-list-tools">
      <label className="home-search">
        <Icon name="search" size={14} />
        <input
          ref={searchRef}
          type="search"
          aria-label="Search projects"
          placeholder="Search"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          onKeyDown={onKeyDown}
        />
        {!query && (
          <kbd className="home-search-key" aria-hidden="true">
            /
          </kbd>
        )}
      </label>
      <ViewTools />
      <LazySelect
        className="home-sort"
        aria-label="Sort projects"
        value={homeSort}
        options={SORT_OPTIONS}
        onChange={(sort) => uiStore.set({ homeSort: sort })}
      />
    </div>
  );
}

function ViewTools() {
  const { view, favoritesOnly } = useHomeView();

  return (
    <>
      <button
        type="button"
        className="icon-btn home-fav-filter"
        aria-pressed={favoritesOnly}
        aria-label="Show favorites only"
        data-tip="Favorites"
        onClick={() => homePrefs.set({ favoritesOnly: !favoritesOnly })}
      >
        <Star filled={favoritesOnly} />
      </button>
      <div
        className="ui-tools home-view-toggle"
        role="group"
        aria-label="Layout"
      >
        <button
          type="button"
          aria-pressed={view === "list"}
          aria-label="List"
          data-tip="List"
          onClick={() => homePrefs.set({ view: "list" })}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M5.5 4h8M5.5 8h8M5.5 12h8M2.5 4h.01M2.5 8h.01M2.5 12h.01" />
          </svg>
        </button>
        <button
          type="button"
          aria-pressed={view === "grid"}
          aria-label="Grid"
          data-tip="Grid"
          data-tip-align="end"
          onClick={() => homePrefs.set({ view: "grid" })}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path d="M2.75 2.75h4v4h-4zM9.25 2.75h4v4h-4zM2.75 9.25h4v4h-4zM9.25 9.25h4v4h-4z" />
          </svg>
        </button>
      </div>
    </>
  );
}

function useHomeView() {
  const prefs = useHomePrefs();

  return {
    view: prefs.view,
    favoritesOnly: prefs.favoritesOnly,
    favorites: prefs.favorites,
  };
}

export interface ListFilter {
  label: string;
  onClear: () => void;
  empty?: string;
}

function ProjectListStates({
  projects,
  error,
  filter,
  query,
  shownCount,
  onClearQuery,
}: {
  projects: Project[] | null;
  error: string | null;
  filter: ListFilter | null;
  query: string;
  shownCount: number;
  onClearQuery: () => void;
}) {
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
          <span>{filter.empty ?? `No ${filter.label} yet.`}</span>
          {!filter.empty && (
            <button type="button" className="link" onClick={filter.onClear}>
              Show all
            </button>
          )}
        </div>
      )}
      {!filter && projects?.length === 0 && (
        <div className="home-empty">
          <Icon name="folder" size={16} />
          <span>
            No projects yet. Describe a design above, pick a starter, or open a
            folder that already holds one.
          </span>
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

function useGridFocus(shown: readonly Project[]) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const active = shown.some((project) => project.id === activeId)
    ? activeId
    : (shown[0]?.id ?? null);

  const focusAt = (index: number) => {
    const target = shown[index];

    if (!target) {
      return;
    }

    setActiveId(target.id);
    gridRef.current
      ?.querySelector<HTMLButtonElement>(
        `[data-project-id="${CSS.escape(target.id)}"] .project-open`
      )
      ?.focus();
  };

  const onGridKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (
      !(event.target instanceof HTMLElement) ||
      !event.target.classList.contains("project-open")
    ) {
      return;
    }

    const next = toNextGridIndex(
      event.key,
      shown.findIndex((project) => project.id === active),
      shown.length,
      toGridColumns(gridRef.current)
    );

    if (next === null) {
      return;
    }

    event.preventDefault();
    focusAt(next);
  };

  return { gridRef, active, setActiveId, focusAt, onGridKey };
}

function useShownProjects(projects: Project[] | null, query: string) {
  const { homeSort } = useUi();
  const { view, favoritesOnly, favorites } = useHomeView();
  const matched = toSortedProjects(
    toFilteredProjects(projects ?? [], query),
    homeSort
  );

  const shown = favoritesOnly
    ? matched.filter((project) => favorites.includes(project.id))
    : matched;

  return { view, favoritesOnly, favorites, matched, shown };
}

function useGridActions(
  shown: readonly Project[],
  actions: CardActions,
  gridRef: RefObject<HTMLDivElement | null>,
  searchRef: RefObject<HTMLInputElement | null>
): CardActions {
  return {
    ...actions,
    onDelete: (project) => {
      const index = shown.findIndex((item) => item.id === project.id);

      const hadFocus =
        gridRef.current?.contains(document.activeElement) ?? false;

      actions.onDelete(project);

      if (!hadFocus) {
        return;
      }

      window.requestAnimationFrame(() => {
        const buttons =
          gridRef.current?.querySelectorAll<HTMLButtonElement>(".project-open");

        if (buttons && buttons.length > 0) {
          buttons[Math.min(index, buttons.length - 1)]?.focus();
        } else {
          searchRef.current?.focus();
        }
      });
    },
  };
}

export function ProjectGrid({
  projects,
  packs,
  health,
  homeDir,
  error,
  actions,
  query,
  onQuery,
  searchRef,
  filter = null,
  tabs,
  headActions,
}: Props) {
  const { view, favoritesOnly, favorites, matched, shown } = useShownProjects(
    projects,
    query
  );

  const { gridRef, active, setActiveId, focusAt, onGridKey } =
    useGridFocus(shown);

  const total = projects?.length ?? 0;
  const first = shown[0];

  const gridActions = useGridActions(shown, actions, gridRef, searchRef);

  return (
    <section className="home-list" aria-label="Projects">
      <div className="home-list-head">
        {tabs}
        <div className="spacer" />
        {headActions}
        {total > 0 && (
          <ProjectListTools
            query={query}
            onQuery={onQuery}
            searchRef={searchRef}
            onFirst={() => focusAt(0)}
            onOpenFirst={() => first && actions.onOpen(first)}
            canOpen={first !== undefined}
          />
        )}
      </div>
      <ProjectListStates
        projects={projects}
        error={error}
        filter={filter}
        query={query}
        shownCount={matched.length}
        onClearQuery={() => onQuery("")}
      />
      {favoritesOnly && matched.length > 0 && shown.length === 0 && (
        <div className="home-empty" role="status">
          <Star filled={false} size={16} />
          <span>No favorites yet. Use the star on a project to add it.</span>
        </div>
      )}
      {shown.length > 0 && (
        <div
          className={`project-grid ${view}`}
          ref={gridRef}
          onKeyDown={onGridKey}
        >
          {shown.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              pack={findPack(packs, project.packId)}
              health={health.get(project.id) ?? null}
              homeDir={homeDir}
              active={project.id === active}
              favorite={favorites.includes(project.id)}
              actions={gridActions}
              onFocusCard={() => setActiveId(project.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
