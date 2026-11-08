interface CodePosition {
  readonly col: number;
  readonly line: number;
}

const toPosition = (code: string, offset: number): CodePosition => {
  const before = code.slice(0, offset);
  const lines = before.split("\n");

  return { col: (lines.at(-1)?.length ?? 0) + 1, line: lines.length };
};

export { toPosition };

export type { CodePosition };
