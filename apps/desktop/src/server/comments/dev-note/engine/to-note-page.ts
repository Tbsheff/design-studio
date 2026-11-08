interface PageSlice<Item> {
  readonly items: readonly Item[];
  readonly next: string | null;
}

const toPageOffset = (cursor: string | null): number => {
  const offset = Math.trunc(Number(cursor ?? "0"));

  if (Number.isNaN(offset) || offset < 0) {
    return 0;
  }

  return offset;
};

const toNotePage = <Item>(
  matching: readonly Item[],
  cursor: string | null,
  limit: number
): PageSlice<Item> => {
  const offset = toPageOffset(cursor);
  const items = matching.slice(offset, offset + limit);

  if (offset + limit >= matching.length) {
    return { items, next: null };
  }

  return { items, next: String(offset + limit) };
};

export { toNotePage };

export type { PageSlice };
