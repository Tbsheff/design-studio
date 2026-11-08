import type { PackSummary, Project } from "@design-studio/contracts";
import { useCallback, useMemo } from "react";
import type { ReactElement, ReactNode, RefObject } from "react";

import { useUi } from "../../platform/storage.js";
import { findPack, keySwatches } from "../design-system/packs.js";
import { Swatches } from "../inspector/swatches.js";
import { copy } from "./copy.js";
import type { AppHealth } from "./deps.js";
import { toClassName } from "./project-card-model.js";
import type { CardActions, ListFilter } from "./project-card-model.js";
import { ProjectCard } from "./project-card.js";
import { toFilteredProjects, toSortedProjects } from "./project-list-model.js";
import { ProjectListStates } from "./project-list-states.js";
import { ProjectListTools } from "./project-list-tools.js";
import { Star } from "./star-icon.js";
import { useGridActions } from "./use-grid-actions.js";
import { useGridFocus } from "./use-grid-focus.js";
import { useHomeView } from "./use-home-view.js";

const EMPTY_STAR_SIZE = 16;

const SWATCH_MAX = 4;

const toPackSwatches = (pack: PackSummary): ReactNode => (
  <Swatches swatches={keySwatches(pack)} max={SWATCH_MAX} size="sm" />
);

interface ProjectGridProps {
  readonly projects: readonly Project[] | null;
  readonly packs: PackSummary[] | null;
  readonly health: ReadonlyMap<string, AppHealth>;
  readonly homeDir: string | null;
  readonly error: string | null;
  readonly actions: CardActions;
  readonly query: string;
  readonly onQuery: (query: string) => void;
  readonly searchRef: RefObject<HTMLInputElement | null>;
  readonly filter: ListFilter | null;
  readonly tabs: ReactNode;
  readonly headActions: ReactNode;
}

const ProjectGrid = ({
  projects,
  packs,
  health,
  homeDir,
  error,
  actions,
  query,
  onQuery,
  searchRef,
  filter,
  tabs,
  headActions,
}: ProjectGridProps): ReactElement => {
  const { homeSort } = useUi();
  const { view, isFavoritesOnly, favorites } = useHomeView();

  const matched = useMemo(
    () => toSortedProjects(toFilteredProjects(projects ?? [], query), homeSort),
    [projects, query, homeSort]
  );

  const shown = useMemo(() => {
    if (isFavoritesOnly) {
      return matched.filter((project) => favorites.includes(project.id));
    }

    return matched;
  }, [favorites, isFavoritesOnly, matched]);

  const {
    gridRef,
    active,
    setActiveId,
    focusAt,
    onGridKey,
    registerOpen,
    openButtons,
  } = useGridFocus(shown);

  const gridActions = useGridActions({
    actions,
    gridRef,
    openButtons,
    searchRef,
    shown,
  });

  const first = shown[0];

  const focusFirst = useCallback((): void => {
    focusAt(0);
  }, [focusAt]);

  const openFirst = useCallback((): void => {
    if (first) {
      actions.onOpen(first);
    }
  }, [actions, first]);

  const clearQuery = useCallback((): void => {
    onQuery("");
  }, [onQuery]);

  return (
    <section className="home-list" aria-label={copy.projects}>
      <div className="home-list-head">
        {tabs}
        <div className="spacer" />
        {headActions}
        {(projects?.length ?? 0) > 0 && (
          <ProjectListTools
            query={query}
            onQuery={onQuery}
            searchRef={searchRef}
            onFirst={focusFirst}
            onOpenFirst={openFirst}
            canOpen={shown.length > 0}
          />
        )}
      </div>
      <ProjectListStates
        projects={projects}
        error={error}
        filter={filter}
        query={query}
        shownCount={matched.length}
        onClearQuery={clearQuery}
      />
      {isFavoritesOnly && matched.length > 0 && shown.length === 0 && (
        <output className="home-empty">
          <Star isFilled={false} size={EMPTY_STAR_SIZE} />
          <span>{copy.noFavoritesYet}</span>
        </output>
      )}
      {shown.length > 0 && (
        <div
          className={toClassName("project-grid", view)}
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
              onFocusCard={setActiveId}
              onRegisterOpen={registerOpen}
              toSwatches={toPackSwatches}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export { ProjectGrid };
