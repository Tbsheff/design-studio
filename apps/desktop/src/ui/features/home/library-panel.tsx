import type { PackSummary, Project } from "@design-studio/contracts";
import type { ReactElement, RefObject } from "react";

import { uiStore } from "../../platform/storage.js";
import { pickable } from "../design-system/packs.js";
import type { PacksState } from "../design-system/packs.js";
import { copy } from "./copy.js";
import type { AppHealth } from "./deps.js";
import { homePrefs, useHomePrefs } from "./home-prefs-model.js";
import type { useProjectActions } from "./home-sections.js";
import type { LibraryModule } from "./lazy-parts.js";

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
}: {
  readonly lib: LibraryModule | null;
  readonly projects: Project[];
  readonly health: Map<string, AppHealth>;
  readonly homeDir: string | null;
  readonly actions: ReturnType<typeof useProjectActions>;
  readonly packs: PacksState;
  readonly pack: PackSummary | null;
  readonly query: string;
  readonly onQuery: (q: string) => void;
  readonly searchRef: RefObject<HTMLInputElement | null>;
  readonly listError: string | null;
  readonly onPickPack: (id: string | null) => void;
}): ReactElement => {
  const { filter } = useHomePrefs();

  if (!lib) {
    return <div className="home-continue placeholder" aria-hidden="true" />;
  }

  const latest = [...projects]
    .filter((project) => !project.designSystemFor)
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];

  const systems = filter === "systems";

  const systemActions = systems && (
    <>
      <button
        type="button"
        className="btn small"
        onClick={() =>
          uiStore.set({ returnTo: "home", screen: "new-design-system" })
        }
      >
        New design system
      </button>
      <button
        type="button"
        className="btn small"
        onClick={() =>
          uiStore.set({ libraryFrom: null, screen: "design-systems" })
        }
      >
        Open library
      </button>
    </>
  );

  return (
    <>
      {latest && (
        <lib.ContinueCard
          project={latest}
          health={health.get(latest.id) ?? null}
          onOpen={actions.onOpen}
        />
      )}
      <lib.ProjectGrid
        projects={lib.filterLibrary(projects, filter)}
        packs={packs.packs}
        health={health}
        homeDir={homeDir}
        error={listError}
        actions={actions}
        query={query}
        onQuery={onQuery}
        searchRef={searchRef}
        filter={
          filter === "all"
            ? null
            : {
                label: lib.FILTER_EMPTY[filter],
                onClear: () => homePrefs.set({ filter: "all" }),
                ...(systems
                  ? {
                      empty:
                        "Your design systems show here. Start from one below, or make a new one.",
                    }
                  : {}),
              }
        }
        tabs={<lib.FilterChips filter={filter} />}
        headActions={systemActions}
      />
      {systems && (
        <section className="home-list" aria-label={copy.pickADesignSystem}>
          <p className="home-section-hint">
            Pick one for your next project. Edit, import and export them in the
            library.
          </p>
          <lib.PackCards
            packs={pickable(packs).packs ?? []}
            value={pack?.id ?? null}
            shouldIncludeNone={false}
            onPick={(picked) => onPickPack(picked?.id ?? null)}
          />
        </section>
      )}
    </>
  );
};

export { Library };
