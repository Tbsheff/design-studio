import type { DesignComment } from "@design-studio/actions/_core/contracts";

interface CommentPage {
  readonly items: readonly DesignComment[];
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

const toCommentPage = (
  list: readonly DesignComment[],
  cursor: string | null,
  limit: number
): CommentPage => {
  const start = toStart(cursor);
  const end = start + limit;
  const items = list.slice(start, end);

  if (end >= list.length) {
    return { items, next: null };
  }

  return { items, next: String(end) };
};

export { toCommentPage };

export type { CommentPage };
