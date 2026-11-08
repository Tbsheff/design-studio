interface LineMap {
  readonly line: (oldLine: number) => number | null;
  readonly col: (oldLine: number, oldCol: number) => number;
}

interface Span {
  readonly from: number;
  readonly to: number;
}

interface Hunk {
  readonly after: string[];
  readonly before: string[];
}

const CELL_MAX = 9_000_000;
const TRIVIAL_LINE = /^(?:<\/[\w.:-]*>|\/?>|[\s{}()[\];,]*)$/u;

const toCell = (
  table: Uint32Array,
  width: number,
  position: { oldIndex: number; newIndex: number },
  isEqual: boolean
): number => {
  const { oldIndex, newIndex } = position;

  if (isEqual) {
    return (table[(oldIndex + 1) * width + newIndex + 1] as number) + 1;
  }

  return Math.max(
    table[(oldIndex + 1) * width + newIndex] as number,
    table[oldIndex * width + newIndex + 1] as number
  );
};

const lcsPairs = (
  oldLines: string[],
  newLines: string[]
): [number, number][] => {
  const oldCount = oldLines.length;
  const newCount = newLines.length;

  if (oldCount === 0 || newCount === 0 || oldCount * newCount > CELL_MAX) {
    return [];
  }

  const width = newCount + 1;
  const table = new Uint32Array((oldCount + 1) * width);

  for (let oldIndex = oldCount - 1; oldIndex >= 0; oldIndex -= 1) {
    for (let newIndex = newCount - 1; newIndex >= 0; newIndex -= 1) {
      table[oldIndex * width + newIndex] = toCell(
        table,
        width,
        { newIndex, oldIndex },
        oldLines[oldIndex] === newLines[newIndex]
      );
    }
  }

  const pairs: [number, number][] = [];
  let oldIndex = 0;
  let newIndex = 0;

  while (oldIndex < oldCount && newIndex < newCount) {
    if (oldLines[oldIndex] === newLines[newIndex]) {
      pairs.push([oldIndex, newIndex]);
      oldIndex += 1;
      newIndex += 1;
    } else if (
      (table[(oldIndex + 1) * width + newIndex] as number) >=
      (table[oldIndex * width + newIndex + 1] as number)
    ) {
      oldIndex += 1;
    } else {
      newIndex += 1;
    }
  }

  return pairs;
};

const pairByIndex = (
  mapping: Int32Array,
  oldSpan: Span,
  newSpan: Span
): void => {
  const count = Math.min(oldSpan.to - oldSpan.from, newSpan.to - newSpan.from);

  for (let step = 0; step < count; step += 1) {
    mapping[oldSpan.from + step] = newSpan.from + step;
  }
};

const pairHunk = (
  mapping: Int32Array,
  hunk: Hunk,
  oldSpan: Span,
  newSpan: Span
): void => {
  if (oldSpan.to <= oldSpan.from || newSpan.to <= newSpan.from) {
    return;
  }

  const oldText = hunk.before
    .slice(oldSpan.from, oldSpan.to)
    .map((line) => line.trim());

  const newText = hunk.after
    .slice(newSpan.from, newSpan.to)
    .map((line) => line.trim());

  const pairs = lcsPairs(oldText, newText).filter(
    ([oldIndex]) => !TRIVIAL_LINE.test(oldText[oldIndex] as string)
  );

  let lastOld = 0;
  let lastNew = 0;

  for (const [oldIndex, newIndex] of [
    ...pairs,
    [oldText.length, newText.length] as [number, number],
  ]) {
    pairByIndex(
      mapping,
      { from: oldSpan.from + lastOld, to: oldSpan.from + oldIndex },
      { from: newSpan.from + lastNew, to: newSpan.from + newIndex }
    );

    if (oldIndex < oldText.length) {
      mapping[oldSpan.from + oldIndex] = newSpan.from + newIndex;
    }

    lastOld = oldIndex + 1;
    lastNew = newIndex + 1;
  }
};

const lineMapping = (before: string[], after: string[]): Int32Array => {
  const mapping = new Int32Array(before.length).fill(-1);
  let head = 0;

  while (
    head < before.length &&
    head < after.length &&
    before[head] === after[head]
  ) {
    mapping[head] = head;
    head += 1;
  }

  let tail = 0;

  while (
    tail < before.length - head &&
    tail < after.length - head &&
    before[before.length - 1 - tail] === after[after.length - 1 - tail]
  ) {
    mapping[before.length - 1 - tail] = after.length - 1 - tail;
    tail += 1;
  }

  const midOld = before.slice(head, before.length - tail);
  const midNew = after.slice(head, after.length - tail);
  const pairs = lcsPairs(midOld, midNew);
  let lastOld = 0;
  let lastNew = 0;

  for (const [oldIndex, newIndex] of [
    ...pairs,
    [midOld.length, midNew.length] as [number, number],
  ]) {
    pairHunk(
      mapping,
      { after, before },
      { from: head + lastOld, to: head + oldIndex },
      { from: head + lastNew, to: head + newIndex }
    );

    if (oldIndex < midOld.length) {
      mapping[head + oldIndex] = head + newIndex;
    }

    lastOld = oldIndex + 1;
    lastNew = newIndex + 1;
  }

  return mapping;
};

const unclaimedByText = (
  after: string[],
  mapping: Int32Array
): Map<string, number[]> => {
  const claimed = new Set(mapping);
  const byText = new Map<string, number[]>();

  for (const [index, line] of after.entries()) {
    if (!claimed.has(index)) {
      const text = line.trim();

      byText.set(text, [...(byText.get(text) ?? []), index]);
    }
  }

  return byText;
};

const movedTo = (
  text: string,
  candidates: number[] | undefined,
  prev: number
): number | null => {
  if (!candidates || candidates.length === 0) {
    return null;
  }

  if (prev >= 0 && candidates.includes(prev + 1)) {
    return prev + 1;
  }

  if (text === "" || TRIVIAL_LINE.test(text)) {
    return null;
  }

  if (candidates.length === 1) {
    return candidates[0] as number;
  }

  return null;
};

const applyMovedLine = (
  before: string[],
  mapping: Int32Array,
  byText: Map<string, number[]>,
  oldIndex: number
): void => {
  const text = (before[oldIndex] as string).trim();
  const candidates = byText.get(text);
  let prev = -1;

  if (oldIndex > 0) {
    prev = mapping[oldIndex - 1] as number;
  }

  const to = movedTo(text, candidates, prev);

  if (to !== null && candidates) {
    mapping[oldIndex] = to;
    candidates.splice(candidates.indexOf(to), 1);
  }
};

const matchMovedLines = (
  before: string[],
  after: string[],
  mapping: Int32Array
): void => {
  const byText = unclaimedByText(after, mapping);

  for (let oldIndex = 0; oldIndex < before.length; oldIndex += 1) {
    if ((mapping[oldIndex] as number) < 0) {
      applyMovedLine(before, mapping, byText, oldIndex);
    }
  }
};

const shiftedCol = (oldText: string, newText: string, col: number): number => {
  if (oldText === newText) {
    return col;
  }

  const at = col - 1;
  const tail = oldText.slice(at);
  const delta = newText.length - oldText.length;

  if (
    tail.length > 0 &&
    at + delta >= 0 &&
    newText.slice(at + delta) === tail
  ) {
    return col + delta;
  }

  return col;
};

const lineMapOf = (before: string, after: string): LineMap => {
  const oldLines = before.split("\n");
  const newLines = after.split("\n");
  const mapping = lineMapping(oldLines, newLines);
  matchMovedLines(oldLines, newLines, mapping);

  return {
    col: (oldLine, oldCol) => {
      const mapped = mapping[oldLine - 1] ?? -1;

      if (mapped < 0) {
        return oldCol;
      }

      return shiftedCol(
        oldLines[oldLine - 1] ?? "",
        newLines[mapped] ?? "",
        oldCol
      );
    },
    line: (oldLine) => {
      const mapped = mapping[oldLine - 1] ?? -1;

      if (mapped < 0) {
        return null;
      }

      return mapped + 1;
    },
  };
};

export { lineMapOf };

export type { LineMap };
