interface StampedFile {
  readonly hash: string;
  readonly path: string;
}

const toChangedFiles = (
  stamped: readonly StampedFile[],
  current: ReadonlyMap<string, string | null>
): string[] =>
  stamped.flatMap((file) => {
    if ((current.get(file.path) ?? null) === file.hash) {
      return [];
    }

    return [file.path];
  });

const toPageOffset = (cursor: string | null): number => {
  const offset = Math.trunc(Number(cursor ?? "0"));

  if (Number.isNaN(offset) || offset < 0) {
    return 0;
  }

  return offset;
};

const toNextCursor = (
  offset: number,
  limit: number,
  total: number
): string | null => {
  if (offset + limit >= total) {
    return null;
  }

  return String(offset + limit);
};

export { toChangedFiles, toNextCursor, toPageOffset };

export type { StampedFile };
