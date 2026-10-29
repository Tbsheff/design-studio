export interface AliasLink {
  path: string;
  alias?: string;
  darkAlias?: string;
}

interface Node {
  $value?: unknown;
  $type?: unknown;
  $extensions?: Record<string, unknown>;
}

const WHOLE_ALIAS = /^\{([^{}]+)\}$/;
const GROUP_TYPES: Record<string, string> = { color: 'color', font: 'fontFamily', text: 'dimension', space: 'dimension', radius: 'dimension', shadow: 'shadow' };

function nodeAt(tokens: Record<string, unknown>, path: string): Node | null {
  const [group, ...rest] = path.split('.');
  const groupNode = tokens[group ?? ''];
  if (typeof groupNode !== 'object' || groupNode === null || rest.length !== 1) return null;
  const node = (groupNode as Record<string, unknown>)[rest[0] ?? ''];
  return typeof node === 'object' && node !== null && '$value' in node ? (node as Node) : null;
}

function darkOf(node: Node): unknown {
  const modes = node.$extensions?.['studio.modes'];
  return typeof modes === 'object' && modes !== null ? (modes as Record<string, unknown>).dark : undefined;
}

function typeOf(tokens: Record<string, unknown>, path: string): unknown {
  const node = nodeAt(tokens, path);
  const group = tokens[path.split('.')[0] ?? ''] as Node | undefined;
  return node?.$type ?? group?.$type ?? GROUP_TYPES[path.split('.')[0] ?? ''];
}

function valueAt(tokens: Record<string, unknown>, path: string, dark: boolean, avoid: string): unknown {
  const seen = new Set([avoid]);
  for (let current = path; !seen.has(current); ) {
    seen.add(current);
    const node = nodeAt(tokens, current);
    if (!node) return undefined;
    const raw = dark ? (darkOf(node) ?? node.$value) : node.$value;
    const next = typeof raw === 'string' ? WHOLE_ALIAS.exec(raw.trim())?.[1] : undefined;
    if (!next) return raw;
    current = next;
  }
  return undefined;
}

function usable(tokens: Record<string, unknown>, link: AliasLink, target: string | undefined, literal: unknown, dark: boolean): boolean {
  if (!target || target === link.path || typeof literal !== 'string') return false;
  if (typeOf(tokens, target) !== typeOf(tokens, link.path)) return false;
  return valueAt(tokens, target, dark, link.path) === literal;
}

export function applyAliases(tokens: Record<string, unknown>, links: AliasLink[], mode: 'light' | 'dark'): number {
  let kept = 0;
  for (const link of links) {
    const node = nodeAt(tokens, link.path);
    if (!node) continue;
    const valueAlias = mode === 'dark' ? (link.darkAlias ?? link.alias) : link.alias;
    if (usable(tokens, link, valueAlias, node.$value, mode === 'dark')) {
      node.$value = `{${valueAlias}}`;
      kept += 1;
    }
    const dark = darkOf(node);
    if (mode === 'light' && link.darkAlias && usable(tokens, link, link.darkAlias, dark, true)) {
      (node.$extensions!['studio.modes'] as Record<string, unknown>).dark = `{${link.darkAlias}}`;
      kept += 1;
    }
  }
  return kept;
}
