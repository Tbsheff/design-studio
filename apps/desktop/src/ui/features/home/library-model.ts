import type { Project } from "@design-studio/contracts";

import { copy } from "./copy.js";
import type { HomeFilter } from "./home-prefs-model.js";
import { isFolderProject } from "./project-card-model.js";

interface FilterTab {
  readonly id: HomeFilter;
  readonly label: string;
}

const FILTERS: readonly FilterTab[] = [
  { id: "all", label: copy.filterAll },
  { id: "prototypes", label: copy.filterPrototypes },
  { id: "apps", label: copy.filterApps },
  { id: "systems", label: copy.filterSystems },
];

const toFilterTabs = (hasPrototypesTab: boolean): readonly FilterTab[] => {
  if (hasPrototypesTab) {
    return FILTERS;
  }

  return FILTERS.filter((item) => item.id !== "prototypes");
};

const FILTER_EMPTY: Record<HomeFilter, string> = {
  all: "projects",
  apps: "apps",
  prototypes: "prototypes",
  systems: "design systems",
};

const toFilterMatcher = (
  filter: HomeFilter
): ((project: Project) => boolean) => {
  if (filter === "systems") {
    return (project) => Boolean(project.designSystemFor);
  }

  if (filter === "all") {
    return () => true;
  }

  return (project) =>
    !project.designSystemFor &&
    isFolderProject(project) === (filter === "apps");
};

const listFilteredLibrary = (
  projects: Project[] | null,
  filter: HomeFilter
): Project[] | null => {
  if (!projects) {
    return projects;
  }

  const test = toFilterMatcher(filter);

  return projects.filter(
    (project) => !project.designSystemDeleted && test(project)
  );
};

export { FILTER_EMPTY, listFilteredLibrary, toFilterTabs };

export type { FilterTab };
