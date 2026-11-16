import { toKindBadge } from "../../../shared/project-search.js";
import { copy } from "./copy.js";
import type { ProjectHit } from "./deps.js";

interface RailGroup {
  readonly title: string;
  readonly test: (hit: ProjectHit) => boolean;
}

interface RailSection {
  readonly title: string;
  readonly items: readonly ProjectHit[];
}

const MINI_MAX = 8;

const GROUPS: readonly RailGroup[] = [
  {
    test: (hit) => hit.type === "next" || hit.type === "vite",
    title: copy.apps,
  },
  {
    test: (hit) => hit.type === "html" || hit.type === "react",
    title: copy.prototypes,
  },
  {
    test: (hit) => hit.type === "design-system",
    title: copy.designSystems,
  },
];

const toRailTip = (hit: ProjectHit, isCurrent: boolean): string => {
  const parts = [hit.name, toKindBadge(hit.type), hit.health?.note].filter(
    Boolean
  );

  if (isCurrent) {
    return `${parts.join(" · ")} ${copy.openSuffix}`;
  }

  return parts.join(" · ");
};

const toRowTip = (hit: ProjectHit): string | null => {
  const parts = [toKindBadge(hit.type), hit.health?.note].filter(Boolean);

  if (parts.length === 0) {
    return null;
  }

  return parts.join(" · ");
};

const toMiniHits = (
  hits: readonly ProjectHit[],
  projectId: string
): readonly ProjectHit[] => {
  const top = hits.slice(0, MINI_MAX);
  const current = hits.find((hit) => hit.id === projectId);

  if (current && !top.includes(current)) {
    return [...top.slice(0, MINI_MAX - 1), current];
  }

  return top;
};

const toFilteredHits = (
  hits: readonly ProjectHit[],
  filter: string
): readonly ProjectHit[] => {
  const needle = filter.trim().toLowerCase();

  if (!needle) {
    return hits;
  }

  return hits.filter((hit) =>
    `${hit.name} ${hit.place ?? ""}`.toLowerCase().includes(needle)
  );
};

const toRailSections = (hits: readonly ProjectHit[]): readonly RailSection[] =>
  GROUPS.flatMap((group) => {
    const items = hits.filter((hit) => group.test(hit));

    if (items.length === 0) {
      return [];
    }

    return [{ items, title: group.title }];
  });

const toEmptyText = (filter: string): string => {
  if (filter) {
    return copy.noProjectMatches;
  }

  return copy.loadingProjects;
};

export {
  toEmptyText,
  toFilteredHits,
  toMiniHits,
  toRailSections,
  toRailTip,
  toRowTip,
};

export type { RailSection };
