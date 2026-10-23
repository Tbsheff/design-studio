import type { DesignToken } from '../../shared/contracts.js';

const CHILD_INDENT = '  ';

export function endOfString(text: string, start: number): number {
  for (let index = start + 1; index < text.length; index++) {
    const char = text[index];
    if (char === '\\') index += 1;
    else if (char === '"') return index;
  }
  return text.length;
}

export function skipSpace(text: string, start: number): number {
  let index = start;
  while (index < text.length && /\s/.test(text[index] ?? '')) index += 1;
  return index;
}

export function valueStartAfterKey(text: string, keyEnd: number): number {
  const colon = skipSpace(text, keyEnd + 1);
  if (text[colon] !== ':') return -1;
  return skipSpace(text, colon + 1);
}

function keyEquals(text: string, start: number, end: number, key: string): boolean {
  try {
    return JSON.parse(text.slice(start, end + 1)) === key;
  } catch {
    return false;
  }
}

function depthStep(char: string | undefined): number {
  if (char === '{' || char === '[') return 1;
  if (char === '}' || char === ']') return -1;
  return 0;
}

function groupOpenBrace(text: string, group: string): number {
  let depth = 0;
  for (let index = 0; index < text.length; index++) {
    if (text[index] !== '"') {
      depth += depthStep(text[index]);
      continue;
    }
    const end = endOfString(text, index);
    if (depth === 1 && keyEquals(text, index, end, group)) {
      const value = valueStartAfterKey(text, end);
      if (value >= 0 && text[value] === '{') return value;
    }
    index = end;
  }
  return -1;
}

export function matchingBrace(text: string, open: number): number {
  let depth = 0;
  for (let index = open; index < text.length; index++) {
    if (text[index] === '"') {
      index = endOfString(text, index);
      continue;
    }
    depth += depthStep(text[index]);
    if (depth === 0) return index;
  }
  return -1;
}

function indentBefore(text: string, close: number): string {
  const line = text.slice(text.lastIndexOf('\n', close) + 1, close);
  return /^[ \t]*/.exec(line)?.[0] ?? '';
}

function lastContentIndex(text: string, open: number, close: number): number {
  let index = close - 1;
  while (index > open && /\s/.test(text[index] ?? '')) index -= 1;
  return index;
}

export function insertToken(text: string, group: string, name: string, token: DesignToken): string | null {
  const open = groupOpenBrace(text, group);
  return open < 0 ? null : insertMember(text, open, name, token);
}

export function insertMember(text: string, open: number, name: string, value: unknown): string | null {
  const close = matchingBrace(text, open);
  if (close < 0) return null;
  const closeIndent = indentBefore(text, close);
  const childIndent = closeIndent + CHILD_INDENT;
  const last = lastContentIndex(text, open, close);
  const body = JSON.stringify(value, null, 2).split('\n').join(`\n${childIndent}`);
  const member = `${last === open ? '' : ','}\n${childIndent}${JSON.stringify(name)}: ${body}\n${closeIndent}`;
  return text.slice(0, last + 1) + member + text.slice(close);
}
