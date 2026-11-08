interface Position {
  readonly line: number;
  readonly col: number;
}

const toLineStartsOf = (source: string): number[] => {
  const starts = [0];

  for (let at = 0; at < source.length; at += 1) {
    if (source.charAt(at) === "\n") {
      starts.push(at + 1);
    }
  }

  return starts;
};

const toPositionAt = (starts: readonly number[], offset: number): Position => {
  let low = 0;
  let high = starts.length - 1;

  while (low < high) {
    const middle = Math.ceil((low + high) / 2);

    if ((starts[middle] ?? 0) <= offset) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }

  return { col: offset - (starts[low] ?? 0) + 1, line: low + 1 };
};

export { toLineStartsOf as lineStartsOf, toPositionAt as positionAt };

export type { Position };
