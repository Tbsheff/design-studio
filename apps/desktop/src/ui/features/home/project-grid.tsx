import type { PackSummary, Project } from "@design-studio/contracts";
import { shortenHome } from "@design-studio/contracts/folders";
import { Icon, LazySelect } from "@design-studio/ui";
import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";

import type { AppHealth } from "../../../shared/found-apps.js";
import {
  projectTypeOf,
  TYPE_LABELS,
  type ProjectType,
} from "../../../shared/project-search.js";
import { api, warmProject } from "../../api.js";
import { prefetchStudio } from "../../app/screen-preload.js";
import { formatRelative, formatTime } from "../../domain/format.js";
import {
  HOME_SORTS,
  uiStore,
  useUi,
  type HomeSort,
} from "../../platform/storage.js";
import { findPack, keySwatches } from "../design-system/packs.js";
import { Swatches } from "../inspector/swatches.js";
import { copy } from "./copy.js";
import type { KeyedFlag, KeyedUrl, Point, StarProps } from "./home-model.js";
import { homePrefs, useHomePrefs } from "./home-prefs-model.js";
import {
  toFilteredProjects,
  toGridColumns,
  toNextGridIndex,
  toSortedProjects,
} from "./index.js";
import { listRecentRuns } from "./use-last-runs.js";

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

  const [failed, setFailed] = useState<KeyedFlag | null>(null);

  useEffect(() => {
    let live = true;
    let pending = runCache.get(key);

    if (!pending) {
      pending = listRecentRuns(project.id, 1).then(
        (items) => items[0]?.status === "failed"
      );
      pending.catch(() => runCache.delete(key));
      runCache.set(key, pending);
    }

    pending.then(
      (on) => live && setFailed({ isOn: on, key }),
      () => undefined
    );

    return () => {
      live = false;
    };
  }, [key, project.id]);

  return failed?.key === key && failed.isOn;
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
  const [url, setUrl] = useState<KeyedUrl | null>(null);
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

const Star = ({ isFilled, size = 14 }: StarProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    aria-hidden="true"
    fill={isFilled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth={1.4}
    strokeLinejoin="round"
  >
    <path d="M8 1.9l1.8 3.8 4.1.5-3 2.9.8 4.1L8 11.2l-3.7 2 .8-4.1-3-2.9 4.1-.5z" />
  </svg>
);

export interface CardActions {
  readonly onOpen: (project: Project) => void;
  readonly onRename: (project: Project, name: string) => Promise<void>;
  readonly onDuplicate: (project: Project) => void;
  readonly onReveal: (project: Project) => void;
  readonly onDelete: (project: Project) => void;
}

export type CardAction = "open" | "rename" | "duplicate" | "reveal" | "delete";

export type MenuAt = Point | "button" | "keys" | null;

const menusChunk = import("./project-card-menus.js");
const CardMenu = lazy(() => menusChunk.then((m) => ({ default: m.CardMenu })));

const RenameField = lazy(() =>
  menusChunk.then((m) => ({ default: m.RenameField }))
);

interface CardProps {
  readonly project: Project;
  readonly pack: PackSummary | null;
  readonly health: AppHealth | null;
  readonly homeDir: string | null;
  readonly isActive: boolean;
  readonly isFavorite: boolean;
  readonly actions: CardActions;
  readonly onFocusCard: () => void;
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
  readonly label: string;
  readonly tone: string;
} {
  const type = projectTypeOf(project);

  const tone =
    type === "html" && isFolderProject(project) ? "html" : TYPE_TONE[type];

  return { label: TYPE_LABELS[type], tone };
}

export function projectPlace(project: Project, homeDir: string | null): string {
  return isFolderProject(project) && project.imported
    ? shortenHome(
        project.imported.sourcePath.replace(/^\/private(?=\/)/, ""),
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

export const HealthCell = ({
  health,
  hasRunFailed = false,
}: {
  readonly health: AppHealth | null;
  readonly hasRunFailed: boolean;
}) => {
  const state = health?.state ?? "static";

  if (hasRunFailed && state !== "install" && state !== "failed") {
    return (
      <span
        className="project-health run-failed"
        data-tip={copy.theLastAiRunFailed}
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
};

const ProjectCard = ({
  project,
  pack,
  health,
  homeDir,
  isActive,
  isFavorite,
  actions,
  onFocusCard,
}: CardProps) => {
  const html = project.kind === "html";
  const count = project.directions.length;
  const thumb = useThumbnail(project);
  const runFailed = useLastRunFailed(project);
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

    if (action === "rename") {
      setRenaming(true);
    } else if (action === "open") {
      actions.onOpen(project);
    } else if (action === "duplicate") {
      actions.onDuplicate(project);
    } else if (action === "reveal") {
      actions.onReveal(project);
    } else {
      actions.onDelete(project);
    }
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
    } else if (
      event.key === "ContextMenu" ||
      (event.shiftKey && event.key === "F10")
    ) {
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

  const badge = projectBadge(project);

  const meta = (
    <span className="project-meta">
      <span className={`home-badge ${badge.tone}`}>{badge.label}</span>
      <HealthCell
        health={project.imported ? health : null}
        hasRunFailed={runFailed}
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

  const preview: ReactNode = (
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

  return (
    <div
      ref={cardRef}
      className={`project-card${menu ? " menu-open" : ""}${isFavorite ? " favorite" : ""}`}
      data-project-id={project.id}
      onContextMenu={onContextMenu}
    >
      {renaming ? (
        <div className="project-open renaming">
          {preview}
          <span className="project-body">
            <Suspense
              fallback={<span className="project-name">{project.name}</span>}
            >
              <RenameField project={project} onDone={finishRename} />
            </Suspense>
            {meta}
          </span>
        </div>
      ) : (
        <button
          ref={openRef}
          type="button"
          className="project-open"
          tabIndex={isActive ? 0 : -1}
          onClick={() => actions.onOpen(project)}
          onPointerEnter={() => warmOpen(project, false)}
          onPointerDown={() => warmOpen(project, true)}
          onFocus={() => {
            warmOpen(project, false);
            onFocusCard();
          }}
          onKeyDown={onKeyDown}
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
      )}
      <button
        type="button"
        className="project-star icon-btn small"
        tabIndex={isActive ? 0 : -1}
        aria-label={
          isFavorite
            ? `Remove ${project.name} from favorites`
            : `Add ${project.name} to favorites`
        }
        aria-pressed={isFavorite}
        data-tip={isFavorite ? "Remove from favorites" : "Add to favorites"}
        data-tip-align="end"
        onClick={() => homePrefs.toggleFavorite(project.id)}
      >
        <Star isFilled={isFavorite} />
      </button>
      <button
        ref={moreRef}
        type="button"
        className="project-more icon-btn"
        tabIndex={isActive ? 0 : -1}
        aria-label={`More actions for ${project.name}`}
        aria-haspopup="menu"
        aria-expanded={menu !== null}
        data-tip={copy.moreActions}
        data-tip-align="end"
        onClick={() => setMenu((current) => (current ? null : "button"))}
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
            onClose={closeMenu}
            onPick={pick}
          />
        </Suspense>
      )}
    </div>
  );
};

interface Props {
  readonly projects: Project[] | null;
  readonly packs: PackSummary[] | null;
  readonly health: Map<string, AppHealth>;
  readonly homeDir: string | null;
  readonly error: string | null;
  readonly actions: CardActions;
  readonly query: string;
  readonly onQuery: (query: string) => void;
  readonly searchRef: React.RefObject<HTMLInputElement | null>;
  readonly filter?: ListFilter | null;
  readonly tabs: ReactNode;
  readonly headActions?: ReactNode;
}

const ProjectListTools = ({
  query,
  onQuery,
  searchRef,
  onFirst,
  onOpenFirst,
  canOpen,
}: {
  readonly query: string;
  readonly onQuery: (query: string) => void;
  readonly searchRef: React.RefObject<HTMLInputElement | null>;
  readonly onFirst: () => void;
  readonly onOpenFirst: () => void;
  readonly canOpen: boolean;
}) => {
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
          aria-label={copy.searchProjects}
          placeholder={copy.search}
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
        aria-label={copy.sortProjects}
        value={homeSort}
        options={SORT_OPTIONS}
        onChange={(sort) => uiStore.set({ homeSort: sort })}
      />
    </div>
  );
};

const ViewTools = () => {
  const { view, favoritesOnly } = useHomeView();

  return (
    <>
      <button
        type="button"
        className="icon-btn home-fav-filter"
        aria-pressed={favoritesOnly}
        aria-label={copy.showFavoritesOnly}
        data-tip={copy.favorites}
        onClick={() => homePrefs.set({ isFavoritesOnly: !favoritesOnly })}
      >
        <Star isFilled={favoritesOnly} />
      </button>
      <div
        className="ui-tools home-view-toggle"
        role="group"
        aria-label={copy.layout}
      >
        <button
          type="button"
          aria-pressed={view === "list"}
          aria-label={copy.list}
          data-tip={copy.list}
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
          aria-label={copy.grid}
          data-tip={copy.grid}
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
};

function useHomeView() {
  const prefs = useHomePrefs();

  return {
    view: prefs.view,
    favoritesOnly: prefs.isFavoritesOnly,
    favorites: prefs.favorites,
  };
}

export interface ListFilter {
  readonly label: string;
  readonly onClear: () => void;
  readonly empty?: string;
}

const ProjectListStates = ({
  projects,
  error,
  filter,
  query,
  shownCount,
  onClearQuery,
}: {
  readonly projects: Project[] | null;
  readonly error: string | null;
  readonly filter: ListFilter | null;
  readonly query: string;
  readonly shownCount: number;
  readonly onClearQuery: () => void;
}) => (
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

export const ProjectGrid = ({
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
}: Props) => {
  const { homeSort } = useUi();
  const { view, favoritesOnly, favorites } = useHomeView();
  const matched = toSortedProjects(
    toFilteredProjects(projects ?? [], query),
    homeSort
  );

  const shown = favoritesOnly
    ? matched.filter((project) => favorites.includes(project.id))
    : matched;

  const { gridRef, active, setActiveId, focusAt, onGridKey } =
    useGridFocus(shown);

  const total = projects?.length ?? 0;
  const first = shown[0];

  const gridActions: CardActions = {
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

  return (
    <section className="home-list" aria-label={copy.projects}>
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
          <Star isFilled={false} size={16} />
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
              isActive={project.id === active}
              isFavorite={favorites.includes(project.id)}
              actions={gridActions}
              onFocusCard={() => setActiveId(project.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
};
