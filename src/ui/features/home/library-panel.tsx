import type { RefObject } from "react";

import type { PackSummary, Project } from "../../../shared/contracts.js";
import type { AppHealth } from "../../../shared/found-apps.js";
import { uiStore } from "../../platform/storage.js";
import { type PacksState, pickable } from "../design-system/packs.js";
import { homePrefs, useHomePrefs } from "./home-prefs-model.js";
import { useProjectActions } from "./home-sections.js";
import type { LibraryModule } from "./lazy-parts.js";

function Library({
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
  lib: LibraryModule | null;
  projects: Project[];
  health: Map<string, AppHealth>;
  homeDir: string | null;
  actions: ReturnType<typeof useProjectActions>;
  packs: PacksState;
  pack: PackSummary | null;
  query: string;
  onQuery: (q: string) => void;
  searchRef: RefObject<HTMLInputElement | null>;
  listError: string | null;
  onPickPack: (id: string | null) => void;
}) {
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
          uiStore.set({ screen: "new-design-system", returnTo: "home" })
        }
      >
        New design system
      </button>
      <button
        type="button"
        className="btn small"
        onClick={() =>
          uiStore.set({ screen: "design-systems", libraryFrom: null })
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
        <section className="home-list" aria-label="Pick a design system">
          <p className="home-section-hint">
            Pick one for your next project. Edit, import and export them in the
            library.
          </p>
          <lib.PackCards
            packs={pickable(packs).packs ?? []}
            value={pack?.id ?? null}
            includeNone={false}
            onPick={(picked) => onPickPack(picked?.id ?? null)}
          />
        </section>
      )}
    </>
  );
}

export { Library };
