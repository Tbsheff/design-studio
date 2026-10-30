export interface LineMap {
  line(oldLine: number): number | null;
  col(oldLine: number, oldCol: number): number;
}

const CELL_MAX = 9_000_000;

function lcsPairs(a: string[], b: string[]): [number, number][] {
  const n = a.length;
  const m = b.length;
  if (n === 0 || m === 0 || n * m > CELL_MAX) return [];
  const width = m + 1;
  const table = new Uint32Array((n + 1) * width);
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      table[i * width + j] = a[i] === b[j] ? (table[(i + 1) * width + j + 1] as number) + 1 : Math.max(table[(i + 1) * width + j] as number, table[i * width + j + 1] as number);
    }
  }
  const pairs: [number, number][] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      pairs.push([i, j]);
      i += 1;
      j += 1;
    } else if ((table[(i + 1) * width + j] as number) >= (table[i * width + j + 1] as number)) i += 1;
    else j += 1;
  }
  return pairs;
}

function pairByIndex(mapping: Int32Array, fromOld: number, toOld: number, fromNew: number, toNew: number): void {
  const count = Math.min(toOld - fromOld, toNew - fromNew);
  for (let k = 0; k < count; k += 1) mapping[fromOld + k] = fromNew + k;
}

function pairHunk(mapping: Int32Array, before: string[], after: string[], fromOld: number, toOld: number, fromNew: number, toNew: number): void {
  if (toOld <= fromOld || toNew <= fromNew) return;
  const oldText = before.slice(fromOld, toOld).map((line) => line.trim());
  const newText = after.slice(fromNew, toNew).map((line) => line.trim());
  const pairs = lcsPairs(oldText, newText).filter(([i]) => !TRIVIAL_LINE.test(oldText[i] as string));
  let lastOld = 0;
  let lastNew = 0;
  for (const [i, j] of [...pairs, [oldText.length, newText.length] as [number, number]]) {
    pairByIndex(mapping, fromOld + lastOld, fromOld + i, fromNew + lastNew, fromNew + j);
    if (i < oldText.length) mapping[fromOld + i] = fromNew + j;
    lastOld = i + 1;
    lastNew = j + 1;
  }
}

function lineMapping(before: string[], after: string[]): Int32Array {
  const mapping = new Int32Array(before.length).fill(-1);
  let head = 0;
  while (head < before.length && head < after.length && before[head] === after[head]) {
    mapping[head] = head;
    head += 1;
  }
  let tail = 0;
  while (tail < before.length - head && tail < after.length - head && before[before.length - 1 - tail] === after[after.length - 1 - tail]) {
    mapping[before.length - 1 - tail] = after.length - 1 - tail;
    tail += 1;
  }
  const midOld = before.slice(head, before.length - tail);
  const midNew = after.slice(head, after.length - tail);
  const pairs = lcsPairs(midOld, midNew);
  let lastOld = 0;
  let lastNew = 0;
  for (const [i, j] of [...pairs, [midOld.length, midNew.length] as [number, number]]) {
    pairHunk(mapping, before, after, head + lastOld, head + i, head + lastNew, head + j);
    if (i < midOld.length) mapping[head + i] = head + j;
    lastOld = i + 1;
    lastNew = j + 1;
  }
  return mapping;
}

const TRIVIAL_LINE = /^(?:<\/[\w.:-]*>|\/?>|[\s{}()[\];,]*)$/;

function unclaimedByText(after: string[], mapping: Int32Array): Map<string, number[]> {
  const claimed = new Set(mapping);
  const byText = new Map<string, number[]>();
  after.forEach((line, index) => {
    if (claimed.has(index)) return;
    const text = line.trim();
    byText.set(text, [...(byText.get(text) ?? []), index]);
  });
  return byText;
}

function movedTo(text: string, candidates: number[] | undefined, prev: number): number | null {
  if (!candidates || candidates.length === 0) return null;
  if (prev >= 0 && candidates.includes(prev + 1)) return prev + 1;
  if (text === '' || TRIVIAL_LINE.test(text)) return null;
  return candidates.length === 1 ? (candidates[0] as number) : null;
}

function matchMovedLines(before: string[], after: string[], mapping: Int32Array): void {
  const byText = unclaimedByText(after, mapping);
  for (let i = 0; i < before.length; i += 1) {
    if ((mapping[i] as number) >= 0) continue;
    const text = (before[i] as string).trim();
    const candidates = byText.get(text);
    const to = movedTo(text, candidates, i > 0 ? (mapping[i - 1] as number) : -1);
    if (to === null || !candidates) continue;
    mapping[i] = to;
    candidates.splice(candidates.indexOf(to), 1);
  }
}

function shiftedCol(oldText: string, newText: string, col: number): number {
  if (oldText === newText) return col;
  const at = col - 1;
  const tail = oldText.slice(at);
  const delta = newText.length - oldText.length;
  if (tail.length > 0 && at + delta >= 0 && newText.slice(at + delta) === tail) return col + delta;
  return col;
}

export function lineMapOf(before: string, after: string): LineMap {
  const oldLines = before.split('\n');
  const newLines = after.split('\n');
  const mapping = lineMapping(oldLines, newLines);
  matchMovedLines(oldLines, newLines, mapping);
  return {
    line: (oldLine) => {
      const mapped = mapping[oldLine - 1];
      return mapped === undefined || mapped < 0 ? null : mapped + 1;
    },
    col: (oldLine, oldCol) => {
      const mapped = mapping[oldLine - 1];
      if (mapped === undefined || mapped < 0) return oldCol;
      return shiftedCol(oldLines[oldLine - 1] ?? '', newLines[mapped] ?? '', oldCol);
    },
  };
}
