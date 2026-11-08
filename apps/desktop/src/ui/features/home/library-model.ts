import type { Project } from "@design-studio/contracts";

import { copy } from "./copy.js";
import type { AppHealth } from "./deps.js";
import type { HomeFilter } from "./home-prefs-model.js";
import { isFolderProject } from "./project-card-model.js";

interface FilterTab {
  readonly id: HomeFilter;
  readonly label: string;
}

interface LastRun {
  readonly prompt: string;
  readonly route: string | null;
  readonly at: number;
}

const FILTERS: readonly FilterTab[] = [
  { id: "all", label: copy.filterAll },
  { id: "prototypes", label: copy.filterPrototypes },
  { id: "apps", label: copy.filterApps },
  { id: "systems", label: copy.filterSystems },
];

const FILTER_EMPTY: Record<HomeFilter, string> = {
  all: "projects",
  apps: "apps",
  prototypes: "prototypes",
  systems: "design systems",
};

const SERVER_TEXT: Record<AppHealth["state"], string | null> = {
  building: copy.devServerStarting,
  failed: copy.devServerFailed,
  install: copy.needsInstall,
  ready: copy.devServerReady,
  static: null,
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

const toRouteLine = (project: Project, last: LastRun | null): string => {
  let dir: string | null = null;

  if (project.app?.appDir && project.app.appDir !== ".") {
    dir = project.app.appDir;
  }

  let fallback: string | null = null;

  if (!project.app) {
    fallback = project.entry;
  }

  return [dir, last?.route ?? fallback].filter(Boolean).join(" · ");
};

const toServerText = (
  project: Project,
  health: AppHealth | null
): string | null => {
  if (project.app && health) {
    return SERVER_TEXT[health.state];
  }

  return null;
};

export {
  FILTERS,
  FILTER_EMPTY,
  listFilteredLibrary,
  toRouteLine,
  toServerText,
};

export type { FilterTab, LastRun };
