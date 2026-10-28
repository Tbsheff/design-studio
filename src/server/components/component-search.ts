import path from 'node:path';
import type { Project } from '../../shared/contracts.js';
import { COMPONENT_LIST_MAX, type ComponentListItem, type ComponentListQuery, type ComponentSchemaList, type ComponentSource } from '../../shared/props.js';
import { importResolver, pickSpecifier, type ImportNeed } from '../direct-edit/imports.js';
import { jsxFor } from './insert.js';
import { loadLibrary, type Library, type LibraryEntry } from './insert-list.js';
import { componentSchemas, loadTypeScript } from './props-schema.js';

type Ts = NonNullable<Awaited<ReturnType<typeof loadTypeScript>>>;

interface Ranked {
  entry: LibraryEntry;
  source: ComponentSource;
  tier: number;
}

const DEFAULT_LIMIT = 40;
const SEEN_MAX = 40;
const ALIAS_LIKE = /^(@\/|~\/|#|@[\w.-]+\/[\w.-]+)/;

function sourceOf(library: Library, entry: LibraryEntry): ComponentSource {
  const index = library.scan.findIndex((dir) => entry.absolute.startsWith(dir + path.sep));
  return index >= 0 && index < library.scan.length - 1 ? 'package' : 'app';
}

function words(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function tierOf(entry: LibraryEntry, query: string, fileText: (file: string) => string): number {
  if (!query) return 0;
  const name = words(entry.name);
  if (name === query) return 0;
  if (name.startsWith(query)) return 1;
  if (name.includes(query)) return 2;
  if (words(entry.folder).includes(query) || words(path.posix.basename(entry.file)).includes(query)) return 3;
  return fileText(entry.absolute).includes(query) ? 4 : -1;
}

function textIndex(library: Library): (file: string) => string {
  const flat = new Map<string, string>();
  return (file) => {
    let text = flat.get(file);
    if (text === undefined) {
      text = words(library.texts.get(file) ?? '');
      flat.set(file, text);
    }
    return text;
  };
}

function rank(library: Library, request: ComponentListQuery): Ranked[] {
  const query = words(request.query ?? '');
  const fileText = textIndex(library);
  const wanted = request.source ?? 'all';
  const out: Ranked[] = [];
  for (const entry of library.entries) {
    const source = sourceOf(library, entry);
    if (wanted !== 'all' && source !== wanted) continue;
    const tier = tierOf(entry, query, fileText);
    if (tier >= 0) out.push({ entry, source, tier });
  }
  return out.sort((a, b) => Number(a.source === 'app') - Number(b.source === 'app') || a.tier - b.tier || b.entry.uses - a.entry.uses || a.entry.name.localeCompare(b.entry.name) || a.entry.file.localeCompare(b.entry.file));
}

function offsetOf(cursor: string | undefined): number {
  if (!cursor) return 0;
  const value = Number(cursor);
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

function appTarget(project: Project, library: Library): string {
  const appRoot = library.scan.at(-1) ?? library.root;
  return path.join(appRoot, project.app?.framework === 'next' ? 'app' : '', '__studio_example__.tsx');
}

function knownSpecifier(ts: Ts | null, library: Library, entry: LibraryEntry, need: ImportNeed): string | null {
  const byFile = library.imports.get(entry.kind === 'default' ? `default:${entry.local}` : entry.name);
  if (!byFile) return null;
  const counts = new Map<string, number>();
  for (const specifier of byFile.values()) counts.set(specifier, (counts.get(specifier) ?? 0) + 1);
  const resolves = importResolver(ts, need);
  for (const [specifier] of [...counts].sort((a, b) => b[1] - a[1])) if (resolves(specifier)) return specifier;
  return null;
}

function seenOf(library: Library & { specifiers: Map<string, string[]> }): ImportNeed['seen'] {
  const out: ImportNeed['seen'] = [];
  const done = new Set<string>();
  for (const [from, list] of library.specifiers) {
    for (const specifier of list) {
      if (out.length >= SEEN_MAX) return out;
      if (done.has(specifier) || !ALIAS_LIKE.test(specifier)) continue;
      done.add(specifier);
      out.push({ specifier, from });
    }
  }
  return out;
}

function importLine(ts: Ts | null, project: Project, library: Library & { specifiers: Map<string, string[]> }, entry: LibraryEntry): string {
  const need: ImportNeed = { name: entry.name, kind: entry.kind, componentFile: entry.absolute, targetFile: appTarget(project, library), root: library.root, seen: [], allowPaths: project.app?.framework === 'next' };
  const specifier = knownSpecifier(ts, library, entry, need) ?? pickSpecifier(ts, { ...need, seen: seenOf(library) }, importResolver(ts, need));
  return entry.kind === 'default' ? `import ${entry.name} from '${specifier}';` : `import { ${entry.name} } from '${specifier}';`;
}

function partsOf(library: Library, entry: LibraryEntry): string[] {
  return library.entries.filter((other) => other.absolute === entry.absolute && other.name !== entry.name).map((other) => other.name);
}

export async function searchComponents(project: Project, workTree: string, request: ComponentListQuery): Promise<ComponentSchemaList> {
  const library = await loadLibrary(project, workTree);
  const ranked = rank(library, request);
  const offset = offsetOf(request.cursor);
  const limit = Math.min(Math.max(request.limit ?? DEFAULT_LIMIT, 1), COMPONENT_LIST_MAX);
  const page = ranked.slice(offset, offset + limit);
  const [ts, schemas] = await Promise.all([loadTypeScript(), componentSchemas(workTree, page.map(({ entry }) => ({ file: entry.absolute, name: entry.local })))]);
  const components: ComponentListItem[] = page.map(({ entry, source }, index) => {
    const schema = schemas[index] ?? null;
    const base = schema ?? { name: entry.name, file: entry.file, line: entry.line, props: [], cva: null, asChild: false, note: null };
    const example = jsxFor(entry, schema, { component: { name: entry.name }, target: { source: null }, position: 'inside' });
    return { ...base, name: entry.name, file: entry.file, line: entry.line, uses: entry.uses, source, folder: entry.folder, parts: partsOf(library, entry), import: importLine(ts, project, library, entry), example };
  });
  const next = offset + page.length;
  return { components, total: ranked.length, truncated: next < ranked.length, nextCursor: next < ranked.length ? String(next) : null };
}
