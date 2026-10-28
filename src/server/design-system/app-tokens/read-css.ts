export type CssTokenScope = 'theme' | 'root' | 'dark';

export interface CssDeclaration {
  name: string;
  value: string;
  scope: CssTokenScope;
  block: string;
  line: number;
  start: number;
  end: number;
  declStart: number;
  declEnd: number;
}

export interface CssTokenBlock {
  prelude: string;
  scope: CssTokenScope;
  open: number;
  close: number;
}

export interface CssTokenSheet {
  declarations: CssDeclaration[];
  blocks: CssTokenBlock[];
  tailwind: boolean;
  themeBlocks: number;
}

interface Frame {
  prelude: string;
  open: number;
  scope: CssTokenScope | null;
  allowsChildren: boolean;
}

const NAME_RE = /^(\s*)(--[A-Za-z0-9_-]+)\s*:/;
const THEME_ROOT = /^(:root|html|:host)$/;
const DARK_PART = /^(?::root|html|:host)?(?:\.dark|\.theme-dark|\[data-(?:theme|mode|color-scheme)=["']?dark["']?\])$/;
const LIGHT_PART = /^(?::root|html|:host)?(?:\.light|\.theme-light|\[data-(?:theme|mode|color-scheme)=["']?light["']?\])$/;
const TAILWIND_IMPORT = /@import\s+(?:url\()?["']tailwindcss(?:\/[^"']*)?["']/;

export function maskComments(text: string): string {
  let out = '';
  let index = 0;
  while (index < text.length) {
    const char = text[index]!;
    if (char === '"' || char === "'") {
      const end = quotedEnd(text, index);
      out += text.slice(index, end);
      index = end;
      continue;
    }
    if (char === '/' && text[index + 1] === '*') {
      const close = text.indexOf('*/', index + 2);
      const end = close === -1 ? text.length : close + 2;
      out += text.slice(index, end).replace(/[^\n]/g, ' ');
      index = end;
      continue;
    }
    out += char;
    index += 1;
  }
  return out;
}

function quotedEnd(text: string, start: number): number {
  const quote = text[start];
  let index = start + 1;
  while (index < text.length && text[index] !== quote && text[index] !== '\n') index += text[index] === '\\' ? 2 : 1;
  return Math.min(text.length, index + 1);
}

function lineStarts(text: string): number[] {
  const starts = [0];
  for (let index = 0; index < text.length; index += 1) if (text[index] === '\n') starts.push(index + 1);
  return starts;
}

function lineAt(starts: number[], offset: number): number {
  let low = 0;
  let high = starts.length - 1;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if ((starts[mid] ?? 0) <= offset) low = mid;
    else high = mid - 1;
  }
  return low + 1;
}

function selectorScope(selector: string, darkMedia: boolean): CssTokenScope | null {
  const parts = selector.split(',').map((part) => part.trim().toLowerCase());
  if (parts.length === 0 || parts.some((part) => part === '')) return null;
  if (parts.every((part) => DARK_PART.test(part))) return 'dark';
  if (parts.every((part) => THEME_ROOT.test(part) || LIGHT_PART.test(part))) return darkMedia ? 'dark' : 'root';
  return null;
}

function classify(prelude: string, parents: Frame[]): Pick<Frame, 'scope' | 'allowsChildren'> {
  const inToken = parents.some((frame) => frame.scope !== null);
  if (inToken) return { scope: null, allowsChildren: false };
  if (parents.some((frame) => !frame.allowsChildren)) return { scope: null, allowsChildren: false };
  const lower = prelude.toLowerCase();
  if (/^@theme\b/.test(lower)) return { scope: parents.length === 0 ? 'theme' : null, allowsChildren: false };
  if (/^@layer\b/.test(lower) || /^@media\s*\(\s*prefers-color-scheme\s*:\s*(dark|light)\s*\)$/.test(lower)) return { scope: null, allowsChildren: true };
  if (lower.startsWith('@')) return { scope: null, allowsChildren: false };
  const darkMedia = parents.some((frame) => /prefers-color-scheme\s*:\s*dark/.test(frame.prelude.toLowerCase()));
  return { scope: selectorScope(prelude, darkMedia), allowsChildren: false };
}

function clean(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

interface Scan {
  source: string;
  masked: string;
  starts: number[];
  stack: Frame[];
  out: CssTokenSheet;
}

function declaration(scan: Scan, from: number, to: number): void {
  const frame = scan.stack.at(-1);
  if (!frame || frame.scope === null) return;
  const segment = scan.masked.slice(from, to);
  const match = NAME_RE.exec(segment);
  if (!match) return;
  const nameStart = from + (match[1]?.length ?? 0);
  let start = from + match[0].length;
  let end = to;
  while (start < end && /\s/.test(scan.masked[start]!)) start += 1;
  while (end > start && /\s/.test(scan.masked[end - 1]!)) end -= 1;
  if (end <= start) return;
  const declEnd = scan.source[to] === ';' ? to + 1 : end;
  scan.out.declarations.push({
    name: match[2]!,
    value: clean(scan.source.slice(start, end)),
    scope: frame.scope,
    block: frame.prelude,
    line: lineAt(scan.starts, nameStart),
    start,
    end,
    declStart: nameStart,
    declEnd,
  });
}

function parenEnd(text: string, start: number): number {
  let depth = 0;
  let index = start;
  while (index < text.length) {
    const char = text[index]!;
    if (char === '"' || char === "'") {
      index = quotedEnd(text, index);
      continue;
    }
    if (char === '(') depth += 1;
    else if (char === ')') depth -= 1;
    else if (char === '{' || char === '}') return index;
    index += 1;
    if (depth === 0) return index;
  }
  return index;
}

export function readCssTokens(source: string): CssTokenSheet {
  const masked = maskComments(source);
  const scan: Scan = { source, masked, starts: lineStarts(source), stack: [], out: { declarations: [], blocks: [], tailwind: TAILWIND_IMPORT.test(masked), themeBlocks: 0 } };
  let statement = 0;
  let index = 0;
  while (index < masked.length) {
    const char = masked[index]!;
    if (char === '"' || char === "'") {
      index = quotedEnd(masked, index);
      continue;
    }
    if (char === '(') {
      index = parenEnd(masked, index);
      continue;
    }
    if (char === '{') {
      const prelude = clean(masked.slice(statement, index));
      const kind = classify(prelude, scan.stack);
      scan.stack.push({ prelude, open: index, ...kind });
      if (kind.scope === 'theme') scan.out.themeBlocks += 1;
      statement = index + 1;
    } else if (char === ';') {
      declaration(scan, statement, index);
      statement = index + 1;
    } else if (char === '}') {
      declaration(scan, statement, index);
      const frame = scan.stack.pop();
      if (frame?.scope) scan.out.blocks.push({ prelude: frame.prelude, scope: frame.scope, open: frame.open, close: index });
      statement = index + 1;
    }
    index += 1;
  }
  scan.out.blocks.sort((a, b) => a.open - b.open);
  return scan.out;
}
