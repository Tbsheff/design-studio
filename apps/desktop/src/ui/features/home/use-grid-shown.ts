import type { Project } from "@design-studio/contracts";
import { useMemo } from "react";

import { useUi } from "../../platform/storage.js";
import { toFilteredProjects, toSortedProjects } from "./project-list-model.js";
import { useHomeView } from "./use-home-view.js";

interface GridShown {
  readonly matched: readonly Project[];
  readonly shown: readonly Project[];
  readonly favoriteIds: ReadonlySet<string>;
  readonly isFavoritesOnly: boolean;
  readonly view: "list" | "grid";
}

const useGridShown = (
  projects: readonly Project[] | null,
  query: string
): GridShown => {
  const { homeSort } = useUi();
  const { view, isFavoritesOnly, favorites } = useHomeView();
  const favoriteIds = useMemo(() => new Set(favorites), [favorites]);

  const matched = useMemo(
    () => toSortedProjects(toFilteredProjects(projects ?? [], query), homeSort),
    [projects, query, homeSort]
  );

  const shown = useMemo(() => {
    if (isFavoritesOnly) {
      return matched.filter((project) => favoriteIds.has(project.id));
    }

    return matched;
  }, [favoriteIds, isFavoritesOnly, matched]);

  return { favoriteIds, isFavoritesOnly, matched, shown, view };
};

export { useGridShown };

export type { GridShown };
