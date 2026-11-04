interface Page<Item> {
  readonly items: readonly Item[];
  readonly next: string | null;
}

const toStart = (cursor: string | null): number => {
  const start = Math.trunc(Number(cursor ?? "0"));

  if (Number.isNaN(start) || start < 0) {
    return 0;
  }

  return start;
};

const toPage = <Item>(
  list: readonly Item[],
  cursor: string | null,
  limit: number
): Page<Item> => {
  const start = toStart(cursor);
  const end = start + limit;
  const items = list.slice(start, end);

  if (end >= list.length) {
    return { items, next: null };
  }

  return { items, next: String(end) };
};

export { toPage };

export type { Page };
