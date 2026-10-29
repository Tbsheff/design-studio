import { readFileSync } from 'node:fs';
import type { Project } from '../../shared/contracts.js';
import type { FigmaKitUse, FigmaNode } from '../../shared/figma-nodes.js';
import { loadLibrary, type LibraryEntry } from '../components/insert-list.js';
import type { FigmaDocument } from './nodes.js';

export interface KitMatch {
  name: string;
  file: string;
  props: Record<string, string>;
}

export interface KitMatcher {
  match(node: FigmaNode): KitMatch | null;
  imports(uses: FigmaKitUse[]): Record<string, string>;
}

const KIT_FOLDER = /(^|\/)(packages\/ui|components\/ui|ui\/src)\//;
const SKIP_VALUES = new Set(['default', 'false', 'true', 'none', 'off', 'on']);

function pascal(text: string): string {
  return text
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join('');
}

function kebab(text: string): string {
  return text
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

export function candidateNames(node: FigmaNode, doc: FigmaDocument): string[] {
  const meta = node.componentId ? doc.components.get(node.componentId) : undefined;
  const setName = meta?.componentSetId ? doc.componentSets.get(meta.componentSetId) : undefined;
  const raw = [setName, meta && !meta.name.includes('=') ? meta.name : undefined, node.name].filter((name): name is string => Boolean(name));
  const out: string[] = [];
  for (const name of raw) {
    const head = name.split('/')[0] ?? name;
    const words = head.split(/[^A-Za-z0-9]+/).filter(Boolean);
    for (const option of [pascal(head), pascal(words.at(-1) ?? '')]) if (/^[A-Z][A-Za-z0-9]*$/.test(option) && !out.includes(option)) out.push(option);
  }
  return out;
}

function rank(entry: LibraryEntry): number {
  return (KIT_FOLDER.test(entry.file) ? 0 : 2) + (entry.kind === 'default' ? 1 : 0);
}

function byName(entries: LibraryEntry[]): Map<string, LibraryEntry> {
  const map = new Map<string, LibraryEntry>();
  for (const entry of [...entries].sort((a, b) => rank(a) - rank(b) || b.uses - a.uses)) if (!map.has(entry.name)) map.set(entry.name, entry);
  return map;
}

function variantProps(node: FigmaNode, source: string): Record<string, string> {
  const props: Record<string, string> = {};
  for (const [key, property] of Object.entries(node.componentProperties ?? {})) {
    if (property.type !== 'VARIANT' || typeof property.value !== 'string') continue;
    const prop = kebab(key.split('#')[0] ?? key).replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
    const value = kebab(property.value);
    if (!prop || !value || SKIP_VALUES.has(value)) continue;
    const quoted = value.includes('-') ? `["']${value}["']` : `(?:["']${value}["']|\\b${value})`;
    if (new RegExp(`\\b${prop}\\s*:`).test(source) && new RegExp(`${quoted}\\s*:`).test(source)) props[prop] = value;
  }
  return props;
}

export async function loadKit(project: Project, workTree: string, doc: FigmaDocument): Promise<KitMatcher | null> {
  if (project.kind !== 'react') return null;
  const library = await loadLibrary(project, workTree).catch(() => null);
  if (!library || library.entries.length === 0) return null;
  const names = byName(library.entries);
  const texts = new Map<string, string>();
  const sourceOf = (entry: LibraryEntry) => {
    if (!texts.has(entry.absolute)) texts.set(entry.absolute, library.texts.get(entry.absolute) ?? safeRead(entry.absolute));
    return texts.get(entry.absolute) ?? '';
  };
  return {
    match(node) {
      for (const name of candidateNames(node, doc)) {
        const entry = names.get(name);
        if (entry) return { name: entry.name, file: entry.file, props: variantProps(node, sourceOf(entry)) };
      }
      return null;
    },
    imports(uses) {
      return Object.fromEntries(uses.map((use) => [use.component, use.file]));
    },
  };
}

function safeRead(file: string): string {
  try {
    return readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}
