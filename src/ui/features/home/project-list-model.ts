import type { HomeSort, Project } from "./deps.js";

const collator = new Intl.Collator([], {
  numeric: true,
  sensitivity: "base",
});

const toSortedProjects = (
  list: readonly Project[],
  sort: HomeSort
): readonly Project[] => {
  if (sort === "name") {
    return list.toSorted(
      (left, right) =>
        collator.compare(left.name, right.name) ||
        right.updatedAt - left.updatedAt
    );
  }

  if (sort === "created") {
    return list.toSorted((left, right) => right.createdAt - left.createdAt);
  }

  return list.toSorted((left, right) => right.updatedAt - left.updatedAt);
};

const toFolded = (text: string): string =>
  text
    .normalize("NFD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .toLowerCase();

const toFilteredProjects = (
  list: readonly Project[],
  query: string
): readonly Project[] => {
  const terms = toFolded(query).split(/\s+/u).filter(Boolean);

  if (terms.length === 0) {
    return list;
  }

  return list.filter((project) => {
    const haystack = toFolded(
      `${project.name} ${project.imported?.sourcePath ?? ""}`
    );

    return terms.every((term) => haystack.includes(term));
  });
};

const isThumbnailPending = (project: Project): boolean => {
  const main =
    project.directions.find((direction) => direction.id === "main") ??
    project.directions[0];

  const head = main?.headVersionId ?? null;

  return head !== null && project.thumbnail?.versionId !== head;
};

const toGridColumns = (grid: HTMLElement | null): number => {
  if (!grid) {
    return 1;
  }

  const columns = getComputedStyle(grid)
    .gridTemplateColumns.split(" ")
    .filter((part) => part.trim() !== "").length;

  return Math.max(1, columns);
};

const toClampedIndex = (value: number, count: number): number =>
  Math.min(count - 1, Math.max(0, value));

const toNextGridIndex = (
  key: string,
  index: number,
  count: number,
  columns: number
): number | null => {
  if (count === 0) {
    return null;
  }

  if (key === "ArrowRight") {
    return toClampedIndex(index + 1, count);
  }

  if (key === "ArrowLeft") {
    return toClampedIndex(index - 1, count);
  }

  if (key === "ArrowDown") {
    if (index + columns < count) {
      return index + columns;
    }

    return index;
  }

  if (key === "ArrowUp") {
    if (index - columns >= 0) {
      return index - columns;
    }

    return index;
  }

  if (key === "Home") {
    return 0;
  }

  if (key === "End") {
    return count - 1;
  }

  return null;
};

export {
  toFilteredProjects,
  toGridColumns,
  toNextGridIndex,
  toSortedProjects,
  isThumbnailPending,
};
