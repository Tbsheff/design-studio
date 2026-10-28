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

function pairHunk(mapping: Int32Array, fromOld: number, toOld: number, fromNew: number, toNew: number): void {
  const count = Math.min(toOld - fromOld, toNew - fromNew);
  for (let k = 0; k < count; k += 1) mapping[fromOld + k] = fromNew + k;
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
    pairHunk(mapping, head + lastOld, head + i, head + lastNew, head + j);
    if (i < midOld.length) mapping[head + i] = head + j;
    lastOld = i + 1;
    lastNew = j + 1;
  }
  return mapping;
}

function shiftedCol(oldText: string, newText: string, col: number): number {
  if (oldText === newText) return col;
  const at = col - 1;
  if (oldText.slice(0, at) === newText.slice(0, at)) return col;
  const tail = oldText.slice(at);
  const delta = newText.length - oldText.length;
  if (tail.length > 0 && newText.slice(at + delta) === tail) return col + delta;
  return col;
}

export function lineMapOf(before: string, after: string): LineMap {
  const oldLines = before.split('\n');
  const newLines = after.split('\n');
  const mapping = lineMapping(oldLines, newLines);
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
