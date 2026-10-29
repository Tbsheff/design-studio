import type { Version } from './contracts.js';

export interface HunkLine {
  sign: '+' | '-' | ' ';
  text: string;
  noEol: boolean;
}

export interface PatchHunk {
  index: number;
  header: string;
  oldStart: number;
  newStart: number;
  lines: HunkLine[];
  complete: boolean;
}

export interface HunkRevertRequest {
  from?: string;
  to: string;
  file: string;
  hunk: number;
}

export interface HunkRevertResult {
  version: Version;
  file: string;
  hunk: number;
  from: string;
  to: string;
}

const HEADER = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;

function lineOf(raw: string): HunkLine | null {
  const sign = raw.charAt(0);
  if (sign !== '+' && sign !== '-' && sign !== ' ') return null;
  return { sign, text: raw.slice(1), noEol: false };
}

function counts(lines: HunkLine[]): { old: number; new: number } {
  return { old: lines.filter((line) => line.sign !== '+').length, new: lines.filter((line) => line.sign !== '-').length };
}

function sealed(hunk: PatchHunk, want: { old: number; new: number }): PatchHunk {
  const have = counts(hunk.lines);
  return { ...hunk, complete: have.old === want.old && have.new === want.new };
}

export function splitHunks(patch: string): PatchHunk[] {
  const hunks: PatchHunk[] = [];
  let current: PatchHunk | null = null;
  let want = { old: 0, new: 0 };
  for (const raw of patch.split('\n')) {
    const head = HEADER.exec(raw);
    if (head) {
      if (current) hunks.push(sealed(current, want));
      want = { old: Number(head[2] ?? 1), new: Number(head[4] ?? 1) };
      current = { index: hunks.length + 1, header: raw, oldStart: Number(head[1]), newStart: Number(head[3]), lines: [], complete: false };
      continue;
    }
    if (!current) continue;
    const last = current.lines[current.lines.length - 1];
    if (raw.startsWith('\\') && last) last.noEol = true;
    const line = lineOf(raw);
    if (line) current.lines.push(line);
  }
  if (current) hunks.push(sealed(current, want));
  return hunks;
}

function sideText(lines: HunkLine[], skip: '+' | '-'): string {
  return lines
    .filter((line) => line.sign !== skip)
    .map((line) => line.text + (line.noEol ? '' : '\n'))
    .join('');
}

export function hunkSides(hunk: PatchHunk): { before: string; after: string } {
  return { before: sideText(hunk.lines, '+'), after: sideText(hunk.lines, '-') };
}
