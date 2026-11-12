import type { PackSummary, Project } from "@design-studio/contracts";
import type { ReactElement, RefObject } from "react";

import type { AppHealth } from "./deps.js";
import { homePrefs } from "./home-prefs-model.js";
import type { HomeFilter } from "./home-prefs-model.js";
import type { LibraryModule } from "./lazy-parts-model.js";
import { toGridFilter } from "./library-view-model.js";
import type { CardActions } from "./project-card-model.js";
import { SystemActions } from "./system-actions.js";
import { SystemPackSection } from "./system-pack-section.js";

interface LibraryBodyProps {
  readonly lib: LibraryModule;
  readonly filter: HomeFilter;
  readonly projects: Project[];
  readonly health: Map<string, AppHealth>;
  readonly homeDir: string | null;
  readonly actions: CardActions;
  readonly packs: PackSummary[] | null;
  readonly pickablePacks: PackSummary[];
  readonly pack: PackSummary | null;
  readonly query: string;
  readonly onQuery: (queryArg: string) => void;
  readonly searchRef: RefObject<HTMLInputElement | null>;
  readonly listError: string | null;
  readonly onPickPack: (id: string | null) => void;
}

const clearFilter = (): void => {
  homePrefs.set({ filter: "all" });
};

const toTabs = (lib: LibraryModule, filter: HomeFilter): ReactElement => (
  <lib.FilterChips filter={filter} />
);

const toHeadActions = (isSystems: boolean): ReactElement | null => {
  if (isSystems) {
    return <SystemActions />;
  }

  return null;
};

const LibraryBody = ({
  lib,
  filter,
  projects,
  health,
  homeDir,
  actions,
  packs,
  pickablePacks,
  pack,
  query,
  onQuery,
  searchRef,
  listError,
  onPickPack,
}: LibraryBodyProps): ReactElement => {
  const isSystems = filter === "systems";
  const gridFilter = toGridFilter(filter, lib.FILTER_EMPTY, clearFilter);

  return (
    <>
      <lib.ProjectGrid
        projects={lib.listFilteredLibrary(projects, filter)}
        packs={packs}
        health={health}
        homeDir={homeDir}
        error={listError}
        actions={actions}
        query={query}
        onQuery={onQuery}
        searchRef={searchRef}
        filter={gridFilter}
        tabs={toTabs(lib, filter)}
        headActions={toHeadActions(isSystems)}
      />
      {isSystems && (
        <SystemPackSection
          lib={lib}
          packs={pickablePacks}
          value={pack?.id ?? null}
          onPickPack={onPickPack}
        />
      )}
    </>
  );
};

export { LibraryBody };
