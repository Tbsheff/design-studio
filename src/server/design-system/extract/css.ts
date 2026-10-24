export interface CssRule {
  selector: string;
  media: string[];
  decls: Array<[string, string]>;
}

interface Frame {
  prelude: string;
  decls: Array<[string, string]>;
}

const SKIPPED_AT_RULES = /^@(keyframes|-webkit-keyframes|font-face|counter-style|property|page|font-feature-values)\b/i;

function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '');
}

function pushDecl(frame: Frame | undefined, raw: string): void {
  if (!frame) return;
  const text = raw.trim();
  const colon = text.indexOf(':');
  if (colon <= 0) return;
  const prop = text.slice(0, colon).trim().toLowerCase();
  const value = text.slice(colon + 1).replace(/!important\s*$/i, '').trim();
  if (!/^(--[\w-]+|-?[a-z][a-z-]*)$/.test(prop) || value === '') return;
  frame.decls.push([prop, value]);
}

function emit(stack: Frame[], frame: Frame, out: CssRule[]): void {
  if (frame.decls.length === 0) return;
  const preludes = stack.map((item) => item.prelude);
  if (preludes.some((prelude) => SKIPPED_AT_RULES.test(prelude)) || SKIPPED_AT_RULES.test(frame.prelude)) return;
  const media = preludes.filter((prelude) => /^@(media|supports|container)\b/i.test(prelude));
  const own = frame.prelude;
  if (/^@theme\b/i.test(own)) {
    out.push({ selector: ':root', media, decls: frame.decls });
    return;
  }
  if (own.startsWith('@')) return;
  const parent = [...stack].reverse().find((item) => !item.prelude.startsWith('@'));
  const selector = parent ? own.replace(/&/g, parent.prelude) : own;
  out.push({ selector: selector.replace(/\s+/g, ' ').trim(), media, decls: frame.decls });
}

interface ScanState {
  stack: Frame[];
  buffer: string;
  out: CssRule[];
}

function quotedEnd(text: string, start: number): number {
  const quote = text[start];
  let index = start + 1;
  while (index < text.length && text[index] !== quote) index += text[index] === '\\' ? 2 : 1;
  return Math.min(text.length, index + 1);
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
    if (char === ')') depth -= 1;
    index += 1;
    if (depth === 0) return index;
  }
  return index;
}

function structural(char: string, state: ScanState): boolean {
  if (char === '{') {
    state.stack.push({ prelude: state.buffer.trim(), decls: [] });
  } else if (char === ';') {
    pushDecl(state.stack.at(-1), state.buffer);
  } else if (char === '}') {
    pushDecl(state.stack.at(-1), state.buffer);
    const frame = state.stack.pop();
    if (frame) emit(state.stack, frame, state.out);
  } else {
    return false;
  }
  state.buffer = '';
  return true;
}

export function parseCss(source: string): CssRule[] {
  const text = stripComments(source);
  const state: ScanState = { stack: [], buffer: '', out: [] };
  let index = 0;
  while (index < text.length) {
    const char = text[index]!;
    if (char === '"' || char === "'" || char === '(') {
      const end = char === '(' ? parenEnd(text, index) : quotedEnd(text, index);
      state.buffer += text.slice(index, end);
      index = end;
      continue;
    }
    if (!structural(char, state)) state.buffer += char;
    index += 1;
  }
  return state.out;
}

export function cssImports(source: string): string[] {
  const out: string[] = [];
  for (const match of stripComments(source).matchAll(/@import\s+(?:url\(\s*)?["']?([^"')\s;]+)["']?\s*\)?[^;]*;/gi)) {
    if (match[1]) out.push(match[1]);
  }
  return out;
}

export type VarContext = 'root' | 'dark' | 'light' | 'other';

export function contextOf(rule: CssRule): VarContext {
  const selector = rule.selector.toLowerCase();
  const media = rule.media.join(' ').toLowerCase();
  if (/prefers-color-scheme:\s*dark/.test(media)) return 'dark';
  if (/\.dark\b|\[data-(theme|mode|color-scheme)=["']?dark|\.theme-dark\b|\.dark-mode\b|\[data-bs-theme=["']?dark/.test(selector)) return 'dark';
  if (/\.light\b|\[data-(theme|mode|color-scheme)=["']?light|\.theme-light\b/.test(selector)) return 'light';
  if (/prefers-color-scheme:\s*light/.test(media)) return 'light';
  const parts = selector.split(',').map((part) => part.trim());
  if (parts.some((part) => /^(:root|html|body|:host|\*)$/.test(part) || /^:root\b/.test(part) || /^html\b/.test(part))) return 'root';
  return 'other';
}

export interface CustomProperties {
  root: Map<string, string>;
  dark: Map<string, string>;
}

export function customProperties(rules: CssRule[]): CustomProperties {
  const root = new Map<string, string>();
  const dark = new Map<string, string>();
  for (const rule of rules) {
    const context = contextOf(rule);
    if (context === 'other') continue;
    const target = context === 'dark' ? dark : root;
    for (const [prop, value] of rule.decls) {
      if (!prop.startsWith('--')) continue;
      if (context === 'light' && root.has(prop)) continue;
      target.set(prop, value);
    }
  }
  return { root, dark };
}

export function resolveVars(value: string, scopes: Array<Map<string, string>>, depth = 0): string {
  if (depth > 8 || !value.includes('var(')) return value;
  const next = value.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*(?:\([^()]*\)[^()]*)*))?\)/g, (whole, name: string, fallback: string | undefined) => {
    for (const scope of scopes) {
      const found = scope.get(name);
      if (found !== undefined) return found;
    }
    return fallback?.trim() ?? whole;
  });
  return next === value ? value : resolveVars(next, scopes, depth + 1);
}
