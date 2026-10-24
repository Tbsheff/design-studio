import { DIRECT_STYLE_PROPERTIES, type AuthoredRule, type SelectionPathEntry } from '../shared/contracts';

export interface AuthoredCss {
  rules: AuthoredRule[];
  inline: string;
}

export interface AuthoredDeclaration {
  prop: string;
  value: string;
  source: string;
}

export const MAX_RULES = 60;
export const MAX_BYTES = 20_000;
const MAX_SELECTOR = 2000;
const MAX_SOURCE = 200;
const MAX_PATH = 20;
const MAX_LABEL = 60;
export const INLINE_SOURCE = 'inline';

const COVERED = new Set<string>([
  ...DIRECT_STYLE_PROPERTIES,
  'padding',
  'padding-block',
  'padding-inline',
  'padding-block-start',
  'padding-block-end',
  'padding-inline-start',
  'padding-inline-end',
  'margin',
  'margin-block',
  'margin-inline',
  'margin-block-start',
  'margin-block-end',
  'margin-inline-start',
  'margin-inline-end',
  'border',
  'font',
  'background-color',
  'row-gap',
  'column-gap',
  'grid-gap',
  'grid-row-gap',
  'grid-column-gap',
  'flex-grow',
  'flex-shrink',
  'flex-basis',
  'flex-flow',
]);
const NOT_BORDER_BOX = /^border-(collapse|spacing|image)/;
const IMAGE_VALUE = /(url|gradient|image|image-set|element|cross-fade|paint)\s*\(/i;

function splitTopLevel(text: string, separator: string, limit = Infinity): string[] {
  const parts: string[] = [];
  let quote: string | null = null;
  let depth = 0;
  let start = 0;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quote !== null) {
      if (char === '\\') index += 1;
      else if (char === quote) quote = null;
    } else if (char === '"' || char === "'") quote = char;
    else if (char === '(') depth += 1;
    else if (char === ')') depth = Math.max(0, depth - 1);
    else if (char === separator && depth === 0 && parts.length < limit) {
      parts.push(text.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(text.slice(start));
  return parts;
}

export function parseDeclarations(css: string): { prop: string; value: string }[] {
  const out: { prop: string; value: string }[] = [];
  for (const chunk of splitTopLevel(css.replace(/\/\*[\s\S]*?\*\//g, ''), ';')) {
    const [rawProp = '', rawValue] = splitTopLevel(chunk, ':', 1);
    const prop = rawProp.trim();
    const value = rawValue?.trim() ?? '';
    if (prop === '' || value === '') continue;
    out.push({ prop: prop.startsWith('--') ? prop : prop.toLowerCase(), value });
  }
  return out;
}

function isColorOnly(value: string): boolean {
  const plain = value.replace(/\s*!important\s*$/i, '').trim();
  return !IMAGE_VALUE.test(plain) && splitTopLevel(plain, ' ').filter((part) => part !== '').length === 1;
}

export function isCoveredDeclaration(prop: string, value: string): boolean {
  if (prop === 'background') return isColorOnly(value);
  if (COVERED.has(prop)) return true;
  return prop.startsWith('border-') && !NOT_BORDER_BOX.test(prop);
}

export function otherStyles(css: AuthoredCss): AuthoredDeclaration[] {
  const winners = new Map<string, AuthoredDeclaration>();
  const take = (text: string, source: string) => {
    for (const { prop, value } of parseDeclarations(text)) {
      if (isCoveredDeclaration(prop, value)) continue;
      winners.delete(prop);
      winners.set(prop, { prop, value, source });
    }
  };
  for (const rule of css.rules) take(rule.css, rule.source ?? rule.selector);
  take(css.inline, INLINE_SOURCE);
  return [...winners.values()];
}

function block(head: string, css: string): string {
  const lines = parseDeclarations(css).map(({ prop, value }) => `  ${prop}: ${value};`);
  return `${head} {\n${lines.join('\n')}\n}`;
}

export function formatCopyCss(css: AuthoredCss): string {
  const blocks = css.rules.map((rule) => block(rule.selector, rule.css));
  if (parseDeclarations(css.inline).length > 0) blocks.push(block('/* inline */', css.inline));
  return blocks.join('\n\n');
}

function cappedString(value: unknown, max: number): string | null {
  return typeof value === 'string' && value.length <= max ? value : null;
}

export function parseAuthoredReply(message: { rules?: unknown; inline?: unknown }): AuthoredCss | null {
  if (!Array.isArray(message.rules)) return null;
  const inline = cappedString(message.inline, MAX_BYTES);
  if (inline === null) return null;
  const rules: AuthoredRule[] = [];
  let bytes = 0;
  for (const raw of message.rules.slice(0, MAX_RULES)) {
    if (!raw || typeof raw !== 'object') continue;
    const entry = raw as Record<string, unknown>;
    const selector = cappedString(entry.selector, MAX_SELECTOR);
    const ruleCss = cappedString(entry.css, MAX_BYTES);
    const source = entry.source === null ? null : cappedString(entry.source, MAX_SOURCE);
    if (selector === null || ruleCss === null || (source === null && entry.source !== null)) continue;
    bytes += selector.length + ruleCss.length;
    if (bytes > MAX_BYTES) break;
    rules.push({ selector, css: ruleCss, source });
  }
  return { rules, inline };
}

export function parseSelectionPath(raw: unknown): SelectionPathEntry[] {
  if (!Array.isArray(raw)) return [];
  const path: SelectionPathEntry[] = [];
  for (const entry of raw.slice(-MAX_PATH)) {
    if (!entry || typeof entry !== 'object') return [];
    const { node, label } = entry as Record<string, unknown>;
    if (typeof node !== 'number' || !Number.isInteger(node) || node < 1) return [];
    if (typeof label !== 'string' || label === '') return [];
    path.push({ node, label: label.slice(0, MAX_LABEL) });
  }
  return path;
}

export type Crumb = { kind: 'node'; entry: SelectionPathEntry } | { kind: 'gap'; hidden: SelectionPathEntry[] };

export function collapseCrumbs(path: SelectionPathEntry[], max = 4): Crumb[] {
  const nodes = path.map((entry): Crumb => ({ kind: 'node', entry }));
  if (path.length <= max) return nodes;
  const keep = max - 1;
  return [nodes[0] as Crumb, { kind: 'gap', hidden: path.slice(1, path.length - keep) }, ...nodes.slice(path.length - keep)];
}
