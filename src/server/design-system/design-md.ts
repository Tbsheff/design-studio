import { DESIGN_MD_TOKENS_END, DESIGN_MD_TOKENS_START, TOKENS_FILE } from '../../shared/contracts.js';
import type { CompiledTokenEntry } from '../../shared/contracts.js';

const EMPTY_CELL = '-';

function cell(value: string | null | undefined): string {
  const text = (value ?? '').replace(/\s+/g, ' ').trim();
  return text === '' ? EMPTY_CELL : text.replace(/\|/g, '\\|');
}

function tokenTable(entries: CompiledTokenEntry[]): string {
  const rows = entries.map((entry) => `| \`${entry.cssVar}\` | ${cell(entry.value)} | ${cell(entry.darkValue)} | ${cell(entry.description)} |`);
  return ['| token | value | dark | use |', '|---|---|---|---|', ...rows].join('\n');
}

function tokenBlock(entries: CompiledTokenEntry[]): string {
  return [
    DESIGN_MD_TOKENS_START,
    `Generated from \`${TOKENS_FILE}\`. Edit that file; the studio rewrites this table.`,
    '',
    tokenTable(entries),
    DESIGN_MD_TOKENS_END,
  ].join('\n');
}

function firstHeadingLine(lines: string[]): number {
  let inFence = false;
  for (const [index, line] of lines.entries()) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    else if (!inFence && /^#\s/.test(line)) return index;
  }
  return -1;
}

function insertBlock(markdown: string, block: string): string {
  const lines = markdown.split('\n');
  const heading = firstHeadingLine(lines);
  if (heading < 0) return `${block}\n\n${markdown}`;
  const before = lines.slice(0, heading + 1);
  const after = lines.slice(heading + 1);
  while (after.length > 0 && after[0]?.trim() === '') after.shift();
  return [...before, '', block, '', ...after].join('\n');
}

export function upsertTokenBlock(markdown: string, entries: CompiledTokenEntry[]): string {
  const block = tokenBlock(entries);
  const start = markdown.indexOf(DESIGN_MD_TOKENS_START);
  const end = start < 0 ? -1 : markdown.indexOf(DESIGN_MD_TOKENS_END, start);
  if (start >= 0 && end >= 0) {
    return markdown.slice(0, start) + block + markdown.slice(end + DESIGN_MD_TOKENS_END.length);
  }
  return insertBlock(markdown, block);
}
