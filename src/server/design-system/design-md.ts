import { DESIGN_MD_TOKENS_END, DESIGN_MD_TOKENS_START, TOKENS_FILE } from '../../shared/contracts.js';
import type { CompiledTokenEntry } from '../../shared/contracts.js';

const EMPTY_CELL = '-';

function cell(value: string | null | undefined): string {
  const text = (value ?? '').replace(/\s+/g, ' ').trim();
  return text === '' ? EMPTY_CELL : text.replace(/\|/g, '\\|');
}

export function tokenTable(entries: CompiledTokenEntry[]): string {
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

export const TOKEN_TABLE_POINTER = 'The token table is in the <design_tokens> block.';

export function stripTokenBlock(markdown: string): string {
  const start = markdown.indexOf(DESIGN_MD_TOKENS_START);
  if (start < 0) return markdown;
  const end = markdown.indexOf(DESIGN_MD_TOKENS_END, start);
  const after = end < 0 ? '' : markdown.slice(end + DESIGN_MD_TOKENS_END.length);
  return `${markdown.slice(0, start)}${TOKEN_TABLE_POINTER}${after}`;
}

export const PROJECT_NOTES_HEADING = '## Project notes';

export function composeDesignMd(packDesignMd: string, entries: CompiledTokenEntry[], userNotes?: string): string {
  const base = upsertTokenBlock(packDesignMd, entries).trimEnd();
  const notes = userNotes?.trim();
  return notes ? `${base}\n\n${PROJECT_NOTES_HEADING}\n\n${notes}\n` : `${base}\n`;
}

export function removeTokenBlock(markdown: string): string {
  const start = markdown.indexOf(DESIGN_MD_TOKENS_START);
  if (start < 0) return markdown;
  const end = markdown.indexOf(DESIGN_MD_TOKENS_END, start);
  const tail = end < 0 ? '' : markdown.slice(end + DESIGN_MD_TOKENS_END.length);
  const head = markdown.slice(0, start).replace(/\n*$/, '');
  const rest = tail.replace(/^\n*/, '');
  if (head === '') return rest;
  if (rest === '') return `${head}\n`;
  return `${head}\n\n${rest}`;
}

function notesRange(lines: string[]): { from: number; to: number } | null {
  let inFence = false;
  let from = -1;
  for (const [index, line] of lines.entries()) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (from < 0 && line.trim() === PROJECT_NOTES_HEADING) from = index;
    else if (from >= 0 && /^#{1,2}\s/.test(line)) return { from, to: index };
  }
  return from < 0 ? null : { from, to: lines.length };
}

export interface DesignMdParts {
  prose: string;
  notes: string;
}

export function splitDesignMd(markdown: string): DesignMdParts {
  const lines = removeTokenBlock(markdown.replace(/\r\n/g, '\n')).split('\n');
  const range = notesRange(lines);
  if (!range) return { prose: `${lines.join('\n').trimEnd()}\n`, notes: '' };
  const notes = lines.slice(range.from + 1, range.to).join('\n').trim();
  const prose = [...lines.slice(0, range.from), ...lines.slice(range.to)].join('\n').trimEnd();
  return { prose: `${prose}\n`, notes };
}
