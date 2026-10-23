export interface CssDecl {
  name: string;
  value: string;
  start: number;
  end: number;
}

export interface CssEdit {
  start: number;
  end: number;
  text: string;
}

function skipComment(text: string, at: number): number {
  const end = text.indexOf('*/', at + 2);
  return end === -1 ? text.length : end + 2;
}

function skipString(text: string, at: number): number {
  const quote = text[at];
  let i = at + 1;
  while (i < text.length) {
    const char = text[i];
    if (char === '\\') i += 2;
    else if (char === quote || char === '\n') return i + 1;
    else i += 1;
  }
  return text.length;
}

function skipInert(text: string, at: number): number | null {
  const char = text[at];
  if (char === '/' && text[at + 1] === '*') return skipComment(text, at);
  if (char === '"' || char === "'") return skipString(text, at);
  return null;
}

function blockEnd(text: string, open: number, limit: number): number {
  let depth = 0;
  let i = open;
  while (i < limit) {
    const skipped = skipInert(text, i);
    if (skipped !== null) {
      i = skipped;
      continue;
    }
    const char = text[i];
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
    i += 1;
  }
  return limit;
}

function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?(\*\/|$)/g, ' ');
}

function isRootPrelude(prelude: string): boolean {
  return stripComments(prelude)
    .split(',')
    .some((selector) => selector.trim() === ':root');
}

const IMPORTANT = /\s*!\s*important\s*$/i;

function declarationOf(text: string, from: number, to: number): CssDecl | null {
  let colon = -1;
  for (let i = from; i < to; ) {
    const skipped = skipInert(text, i);
    if (skipped !== null) {
      i = skipped;
      continue;
    }
    if (text[i] === ':') {
      colon = i;
      break;
    }
    i += 1;
  }
  if (colon === -1) return null;
  const name = stripComments(text.slice(from, colon)).trim();
  if (!name.startsWith('--')) return null;
  let start = colon + 1;
  let end = to;
  while (start < end && /\s/.test(text[start] ?? '')) start += 1;
  while (end > start && /\s/.test(text[end - 1] ?? '')) end -= 1;
  const important = IMPORTANT.exec(text.slice(start, end));
  if (important) end -= important[0].length;
  return { name, value: text.slice(start, end), start, end };
}

function declarationsIn(text: string, from: number, to: number): CssDecl[] {
  const out: CssDecl[] = [];
  let segment = from;
  let depth = 0;
  let i = from;
  const flush = (end: number) => {
    const decl = declarationOf(text, segment, end);
    if (decl) out.push(decl);
  };
  while (i < to) {
    const skipped = skipInert(text, i);
    if (skipped !== null) {
      i = skipped;
      continue;
    }
    const char = text[i];
    if (char === '(') depth += 1;
    else if (char === ')') depth = Math.max(0, depth - 1);
    else if (char === '{') {
      i = blockEnd(text, i, to) + 1;
      segment = i;
      continue;
    } else if (char === ';' && depth === 0) {
      flush(i);
      segment = i + 1;
    }
    i += 1;
  }
  flush(to);
  return out;
}

export function rootDeclarations(css: string, from = 0, to = css.length): CssDecl[] {
  const out: CssDecl[] = [];
  let prelude = from;
  let i = from;
  while (i < to) {
    const skipped = skipInert(css, i);
    if (skipped !== null) {
      i = skipped;
      continue;
    }
    const char = css[i];
    if (char === '{') {
      const end = blockEnd(css, i, to);
      const head = css.slice(prelude, i).trim();
      if (!head.startsWith('@') && isRootPrelude(head)) out.push(...declarationsIn(css, i + 1, end));
      i = end + 1;
      prelude = i;
      continue;
    }
    if (char === ';' || char === '}') prelude = i + 1;
    i += 1;
  }
  return out;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function usesVar(text: string, name: string): boolean {
  return new RegExp(`var\\(\\s*${escapeRegExp(name)}\\s*[,)]`).test(text);
}

export function lastDeclarationOf(decls: CssDecl[], name: string): CssDecl | null {
  for (let i = decls.length - 1; i >= 0; i -= 1) {
    const decl = decls[i];
    if (decl && decl.name === name) return decl;
  }
  return null;
}

export function applyEdits(text: string, edits: CssEdit[]): string {
  const sorted = [...edits].sort((a, b) => b.start - a.start);
  let out = text;
  for (const edit of sorted) out = `${out.slice(0, edit.start)}${edit.text}${out.slice(edit.end)}`;
  return out;
}
