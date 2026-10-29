import type { DiffHunk, DiffLine } from './contracts.js';

const CONTEXT = 3;
const MAX_CELLS = 4_000_000;
const MAX_LINES_SHOWN = 400;

export interface LineDiff {
  added: number;
  removed: number;
  hunks: DiffHunk[];
  truncated: boolean;
}

function splitLines(text: string): string[] {
  if (text === '') return [];
  const lines = text.split('\n');
  if (lines.at(-1) === '') lines.pop();
  return lines;
}

function lcsTable(a: string[], b: string[]): Uint32Array {
  const width = b.length + 1;
  const table = new Uint32Array((a.length + 1) * width);
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      const diagonal = (table[(i + 1) * width + j + 1] ?? 0) + 1;
      table[i * width + j] = a[i] === b[j] ? diagonal : Math.max(table[(i + 1) * width + j] ?? 0, table[i * width + j + 1] ?? 0);
    }
  }
  return table;
}

function middleOps(a: string[], b: string[]): DiffLine[] | null {
  if (a.length * b.length > MAX_CELLS) return null;
  const table = lcsTable(a, b);
  const width = b.length + 1;
  const at = (i: number, j: number): number => table[i * width + j] ?? 0;
  const ops: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      ops.push({ kind: 'same', text: a[i] ?? '' });
      i += 1;
      j += 1;
    } else if (at(i + 1, j) >= at(i, j + 1)) {
      ops.push({ kind: 'del', text: a[i] ?? '' });
      i += 1;
    } else {
      ops.push({ kind: 'add', text: b[j] ?? '' });
      j += 1;
    }
  }
  return [...ops, ...a.slice(i).map((text): DiffLine => ({ kind: 'del', text })), ...b.slice(j).map((text): DiffLine => ({ kind: 'add', text }))];
}

function toHunks(ops: DiffLine[]): DiffHunk[] {
  const hunks: DiffHunk[] = [];
  let oldLine = 1;
  let newLine = 1;
  let current: DiffHunk | null = null;
  let trailingSame = 0;
  ops.forEach((op, index) => {
    const changed = op.kind !== 'same';
    const nearChange = changed || ops.slice(index + 1, index + 1 + CONTEXT).some((next) => next.kind !== 'same');
    if (!current && nearChange) {
      current = { oldStart: oldLine, newStart: newLine, lines: [] };
      hunks.push(current);
      trailingSame = 0;
    }
    if (current) {
      if (changed) trailingSame = 0;
      else trailingSame += 1;
      if (!changed && trailingSame > CONTEXT && !nearChange) current = null;
      else current.lines.push(op);
    }
    if (op.kind !== 'add') oldLine += 1;
    if (op.kind !== 'del') newLine += 1;
  });
  return hunks;
}

function capLines(hunks: DiffHunk[]): { hunks: DiffHunk[]; truncated: boolean } {
  let left = MAX_LINES_SHOWN;
  const out: DiffHunk[] = [];
  for (const hunk of hunks) {
    if (left <= 0) return { hunks: out, truncated: true };
    out.push(hunk.lines.length <= left ? hunk : { ...hunk, lines: hunk.lines.slice(0, left) });
    left -= hunk.lines.length;
  }
  return { hunks: out, truncated: left < 0 };
}

function sameEnds(a: string[], b: string[]): { start: number; endA: number; endB: number } {
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start += 1;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA -= 1;
    endB -= 1;
  }
  return { start, endA, endB };
}

function addRange(ranges: [number, number][], from: number, to: number): void {
  const last = ranges.at(-1);
  if (last && last[1] >= from - 1) last[1] = Math.max(last[1], to);
  else ranges.push([from, to]);
}

export function changedLineRanges(before: string, after: string): [number, number][] | null {
  const a = splitLines(before);
  const b = splitLines(after);
  const { start, endA, endB } = sameEnds(a, b);
  const middle = middleOps(a.slice(start, endA), b.slice(start, endB));
  if (!middle) return null;
  const ranges: [number, number][] = [];
  let line = start + 1;
  for (const op of middle) {
    if (op.kind === 'add') addRange(ranges, line, line);
    else if (op.kind === 'del') addRange(ranges, Math.max(1, line - 1), line);
    if (op.kind !== 'del') line += 1;
  }
  return ranges;
}

export function diffLines(before: string, after: string): LineDiff {
  const a = splitLines(before);
  const b = splitLines(after);
  const { start, endA, endB } = sameEnds(a, b);
  const middle = middleOps(a.slice(start, endA), b.slice(start, endB));
  if (!middle) {
    return { added: endB - start, removed: endA - start, hunks: [], truncated: true };
  }
  const ops: DiffLine[] = [
    ...a.slice(0, start).map((text): DiffLine => ({ kind: 'same', text })),
    ...middle,
    ...a.slice(endA).map((text): DiffLine => ({ kind: 'same', text })),
  ];
  const added = middle.filter((op) => op.kind === 'add').length;
  const removed = middle.filter((op) => op.kind === 'del').length;
  const capped = capLines(toHunks(ops));
  return { added, removed, ...capped };
}
