import type { PackSummary, Project } from "@design-studio/contracts";
import { useCallback } from "react";
import type { ReactElement, ReactNode, RefObject } from "react";

import { findPack, keySwatches } from "../design-system/packs.js";
import { Swatches } from "../inspector/swatches.js";
import { copy } from "./copy.js";
import type { AppHealth } from "./deps.js";
import type { CardActions, ListFilter } from "./project-card-model.js";
import { ProjectGridCards } from "./project-grid-cards.js";
import { ProjectGridHead } from "./project-grid-head.js";
import { ProjectListStates } from "./project-list-states.js";
import { Star } from "./star-icon.js";
import { useProjectGridState } from "./use-project-grid-state.js";

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
  const grid = useProjectGridState(projects, query, actions, searchRef);
  const { matched, shown, first, onGridKey } = grid;
  const { setActiveId: onFocusCard, registerOpen: onRegisterOpen } = grid;

  const toPack = useCallback(
    (packId: string | null): PackSummary | null => findPack(packs, packId),
    [packs]
  );

  const clearQuery = useCallback((): void => {
    onQuery("");
  }, [onQuery]);

  return (
    <section className="home-list" aria-label={copy.projects}>
      <ProjectGridHead
        tabs={tabs}
        headActions={headActions}
        hasProjects={(projects?.length ?? 0) > 0}
        first={first}
        shownCount={shown.length}
        query={query}
        searchRef={searchRef}
        actions={actions}
        onQuery={onQuery}
        focusAt={grid.focusAt}
      />
      <ProjectListStates
        projects={projects}
        error={error}
        filter={filter}
        query={query}
        shownCount={matched.length}
        onClearQuery={clearQuery}
      />
      {grid.isFavoritesOnly && matched.length > 0 && shown.length === 0 && (
        <output className="home-empty">
          <Star isFilled={false} size={EMPTY_STAR_SIZE} />
          <span>{copy.noFavoritesYet}</span>
        </output>
      )}
      {shown.length > 0 && (
        <ProjectGridCards
          shown={shown}
          view={grid.view}
          gridRef={grid.gridRef}
          onGridKey={onGridKey}
          toPack={toPack}
          toSwatches={toPackSwatches}
          health={health}
          homeDir={homeDir}
          active={grid.active}
          favoriteIds={grid.favoriteIds}
          actions={grid.gridActions}
          onFocusCard={onFocusCard}
          onRegisterOpen={onRegisterOpen}
        />
      )}
    </section>
  );
};

export { ProjectGrid };
