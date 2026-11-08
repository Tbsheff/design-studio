import type { Version } from "@design-studio/contracts";

interface VersionPage {
  readonly items: readonly Version[];
  readonly next: string | null;
}

const toStart = (cursor: string | null): number => {
  if (cursor === null) {
    return 0;
  }

  const start = Math.trunc(Number(cursor));

  if (Number.isNaN(start) || start < 0) {
    return 0;
  }

  return start;
};

const toVersionPage = (
  list: readonly Version[],
  cursor: string | null,
  limit: number
): VersionPage => {
  const start = toStart(cursor);
  const end = start + limit;
  const items = list.slice(start, end);

  if (end >= list.length) {
    return { items, next: null };
  }

  return { items, next: String(end) };
};

export { toVersionPage };

export type { VersionPage };
