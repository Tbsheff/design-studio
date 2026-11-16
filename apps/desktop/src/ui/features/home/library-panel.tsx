import type { PackSummary, Project } from "@design-studio/contracts";
import type { ReactElement, RefObject } from "react";

import { pickable } from "../design-system/packs.js";
import type { PacksState } from "../design-system/packs.js";
import type { AppHealth } from "./deps.js";
import { useHomePrefs } from "./home-prefs-model.js";
import type { LibraryModule } from "./lazy-parts-model.js";
import { LibraryBody } from "./library-body.js";
import type { CardActions } from "./project-card-model.js";

interface LibraryProps {
  readonly lib: LibraryModule | null;
  readonly projects: Project[];
  readonly health: Map<string, AppHealth>;
  readonly homeDir: string | null;
  readonly actions: CardActions;
  readonly packs: PacksState;
  readonly pack: PackSummary | null;
  readonly query: string;
  readonly onQuery: (queryArg: string) => void;
  readonly searchRef: RefObject<HTMLInputElement | null>;
  readonly listError: string | null;
  readonly onPickPack: (id: string | null) => void;
  readonly hasPrototypesTab: boolean;
}

const NO_PACKS: PackSummary[] = [];

const Library = ({
  lib,
  projects,
  health,
  homeDir,
  actions,
  packs,
  pack,
  query,
  onQuery,
  searchRef,
  listError,
  onPickPack,
  hasPrototypesTab,
}: LibraryProps): ReactElement | null => {
  const { filter } = useHomePrefs();

  if (!lib) {
    return null;
  }

  return (
    <LibraryBody
      lib={lib}
      filter={filter}
      hasPrototypesTab={hasPrototypesTab}
      projects={projects}
      health={health}
      homeDir={homeDir}
      actions={actions}
      packs={packs.packs}
      pickablePacks={pickable(packs).packs ?? NO_PACKS}
      pack={pack}
      query={query}
      onQuery={onQuery}
      searchRef={searchRef}
      listError={listError}
      onPickPack={onPickPack}
    />
  );
};

export { Library };
