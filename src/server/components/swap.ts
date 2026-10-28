import { readFile } from 'node:fs/promises';
import type * as t from '@babel/types';
import { z } from 'zod';
import type { SwapCandidate, SwapCandidateList, SwapRequest, SwapResult } from '../../shared/component-create.js';
import type { Direction, Project, SourceLoc, VersionMeta } from '../../shared/contracts.js';
import type { ComponentSchema, PropValue } from '../../shared/props.js';
import { writeAndCommitAll } from '../direct-edit/batch.js';
import { DirectEditError } from '../direct-edit/errors.js';
import { planImport } from '../direct-edit/imports.js';
import { assertCanEdit, publishVersion, resolveSource, type DirectEditDeps, type ResolvedSource } from '../direct-edit/index.js';
import { leadingWhitespaceStart } from '../direct-edit/splice.js';
import { positionAt, refuse } from '../direct-edit/structure-ops.js';
import { propsFor, seenImports, type InsertScope } from './insert.js';
import { loadLibrary, type LibraryEntry } from './insert-list.js';
import { componentSchemas, loadTypeScript, parseModuleFile } from './props-schema.js';
import { elementAt } from './use-site.js';
import { removeImport } from './import-cleanup.js';

type Library = Awaited<ReturnType<typeof loadLibrary>>;
type Splice = { start: number; end: number; text: string };

const loc = z.object({ file: z.string().min(1).max(1000), line: z.number().int().min(1), col: z.number().int().min(1) }).strict();
const requestSchema = z.object({ use: loc, component: z.object({ name: z.string().regex(/^[A-Z][A-Za-z0-9_$]{0,63}$/), file: z.string().min(1).max(1000).optional() }).strict() }).strict();
const PASS_THROUGH = /^(className|style|id|key|ref|role|title|data-.+|aria-.+|on[A-Z].*)$/;
const CANDIDATES_MAX = 12;
const SCHEMA_BUDGET = 60;
const SAFE_ATTR = /^[^"\\{}<>\n]*$/;

interface UseSite {
  target: ResolvedSource;
  code: string;
  ast: t.File;
  element: t.JSXElement;
  name: string;
  attrs: { name: string; node: t.JSXAttribute; value: string | null }[];
  spread: boolean;
  children: boolean;
}

interface Fit {
  keep: string[];
  drop: string[];
  add: Record<string, PropValue>;
}

export interface SwapPlan {
  target: ResolvedSource;
  original: string;
  code: string;
  title: string;
  dropped: string[];
  added: string[];
  importFrom: string;
  select: SwapResult['select'];
}

export function parseSwapRequest(raw: unknown): SwapRequest {
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new DirectEditError('invalid_request', issue ? `${issue.path.join('.') || 'request'}: ${issue.message}` : 'The swap request is not valid');
  }
  return parsed.data as SwapRequest;
}

function attrName(attr: t.JSXAttribute): string {
  return attr.name.type === 'JSXIdentifier' ? attr.name.name : `${attr.name.namespace.name}:${attr.name.name.name}`;
}

function attrText(attr: t.JSXAttribute): string | null {
  if (attr.value?.type === 'StringLiteral') return attr.value.value;
  if (attr.value?.type === 'JSXExpressionContainer' && attr.value.expression.type === 'StringLiteral') return attr.value.expression.value;
  return null;
}

function hasChildren(element: t.JSXElement): boolean {
  return element.children.some((child) => !(child.type === 'JSXText' && child.value.trim() === '') && !(child.type === 'JSXExpressionContainer' && child.expression.type === 'JSXEmptyExpression'));
}

async function readUseSite(workTree: string, use: SourceLoc): Promise<UseSite> {
  const target = await resolveSource(workTree, use.file);
  const code = await readFile(target.file, 'utf8');
  const ast = parseModuleFile(code, target.file);
  if (!ast) throw new DirectEditError('parse_failed', `${target.relative} could not be parsed`);
  const element = elementAt(ast, use.line, use.col);
  if (!element) throw refuse(`No component starts at ${target.relative}:${use.line}:${use.col}. Select a component use such as <Badge>`);
  const name = element.openingElement.name;
  if (name.type !== 'JSXIdentifier') throw refuse('Only a plain component tag such as <Badge> can be swapped, not <Menu.Item>');
  const attrs: UseSite['attrs'] = [];
  let spread = false;
  for (const attr of element.openingElement.attributes) {
    if (attr.type === 'JSXSpreadAttribute') spread = true;
    else attrs.push({ name: attrName(attr), node: attr, value: attrText(attr) });
  }
  return { target, code, ast, element, name: name.name, attrs, spread, children: hasChildren(element) };
}

function fitOf(site: UseSite, entry: LibraryEntry, schema: ComponentSchema | null): Fit | string {
  if (site.children && !entry.children) return `${entry.name} takes no children, and this ${site.name} has some`;
  const specs = new Map((schema?.props ?? []).map((spec) => [spec.name, spec]));
  const keep: string[] = [];
  const drop: string[] = [];
  for (const attr of site.attrs) {
    const spec = specs.get(attr.name);
    const known = schema === null || spec !== undefined || PASS_THROUGH.test(attr.name);
    const badOption = spec?.control === 'select' && attr.value !== null && spec.options !== undefined && spec.options.length > 0 && !spec.options.includes(attr.value);
    (known && !badOption ? keep : drop).push(attr.name);
  }
  const given = new Set(site.attrs.map((attr) => attr.name));
  const add = Object.fromEntries(Object.entries(propsFor(schema, {})).filter(([name]) => !given.has(name) && name !== 'children'));
  return { keep, drop, add };
}

function attribute(name: string, value: PropValue): string {
  if (value === true) return ` ${name}`;
  if (typeof value === 'string' && SAFE_ATTR.test(value)) return ` ${name}="${value}"`;
  return ` ${name}={${JSON.stringify(value)}}`;
}

function swapSplices(site: UseSite, to: string, fit: Fit): Splice[] {
  const opening = site.element.openingElement;
  const splices: Splice[] = [{ start: opening.name.start ?? 0, end: opening.name.end ?? 0, text: to }];
  const closing = site.element.closingElement?.name;
  if (closing) splices.push({ start: closing.start ?? 0, end: closing.end ?? 0, text: to });
  for (const attr of site.attrs) if (fit.drop.includes(attr.name)) splices.push({ start: leadingWhitespaceStart(site.code, attr.node.start ?? 0), end: attr.node.end ?? 0, text: '' });
  const added = Object.entries(fit.add).map(([name, value]) => attribute(name, value)).join('');
  if (added) {
    const at = opening.attributes.at(-1)?.end ?? opening.name.end ?? 0;
    splices.push({ start: at, end: at, text: added });
  }
  return splices;
}

function applyAll(code: string, splices: Splice[]): string {
  let next = code;
  for (const splice of [...splices].sort((a, b) => b.start - a.start || b.end - a.end)) next = next.slice(0, splice.start) + splice.text + next.slice(splice.end);
  return next;
}

function shift(offset: number, splices: Splice[]): number {
  return offset + splices.filter((splice) => splice.end <= offset && splice.start < offset).reduce((sum, splice) => sum + splice.text.length - (splice.end - splice.start), 0);
}

function pickEntry(library: Library, component: SwapRequest['component']): LibraryEntry {
  const matches = library.entries.filter((entry) => entry.name === component.name && (!component.file || entry.file === component.file));
  if (matches.length === 1) return matches[0] as LibraryEntry;
  if (matches.length === 0) throw refuse(`The project has no exported component named ${component.name}${component.file ? ` in ${component.file}` : ''}`);
  throw refuse(`More than one component is named ${component.name} (${matches.map((entry) => entry.file).join(', ')}). Pass its file too`);
}

export async function planSwap(scope: InsertScope, raw: unknown): Promise<SwapPlan> {
  const request = parseSwapRequest(raw);
  if (scope.project.kind !== 'react') throw refuse('This is an HTML project. It has no components to swap');
  const site = await readUseSite(scope.workTree, request.use);
  const library = await loadLibrary(scope.project, scope.workTree);
  const entry = pickEntry(library, request.component);
  if (entry.name === site.name) throw refuse(`This element is already a ${site.name}`);
  if (entry.absolute === site.target.file) throw refuse(`${entry.name} is defined in ${entry.file}, the file of this use; pick a component from another file`);
  const [schema] = await componentSchemas(scope.workTree, [{ file: entry.absolute, name: entry.local }]);
  const fit = fitOf(site, entry, schema ?? null);
  if (typeof fit === 'string') throw refuse(fit);
  const need = { name: entry.name, kind: entry.kind, componentFile: entry.absolute, targetFile: site.target.file, root: library.root, seen: seenImports(library.specifiers), allowPaths: scope.project.app?.framework === 'next' };
  const imported = planImport(await loadTypeScript(), site.code, site.ast, need);
  const splices = [...swapSplices(site, entry.name, fit), ...(imported.splice ? [imported.splice] : [])];
  const swapped = applyAll(site.code, splices);
  const start = shift(site.element.start ?? 0, splices);
  const code = removeImport(swapped, site.name, site.target.file);
  if (!parseModuleFile(code, site.target.file)) throw new DirectEditError('parse_failed', `The new ${site.target.relative} could not be parsed, so nothing was written`);
  const at = positionAt(code, start - (swapped.length - code.length));
  return { target: site.target, original: site.code, code, title: `Swap ${site.name} for ${entry.name}`, dropped: fit.drop, added: Object.keys(fit.add), importFrom: imported.specifier, select: [{ file: site.target.relative, ...at, tag: entry.name }] };
}

export async function applySwap(deps: DirectEditDeps, scope: InsertScope & { direction: Direction }, raw: unknown): Promise<SwapResult> {
  const { project, direction } = scope;
  const request = parseSwapRequest(raw);
  assertCanEdit(deps, project, direction);
  const plan = await planSwap(scope, raw);
  const meta: VersionMeta = { kind: 'manual', prompt: `Swap instance: ${request.use.file}:${request.use.line}:${request.use.col} to ${request.component.name}` };
  const version = await writeAndCommitAll(deps, project, direction, [plan], plan.title, meta);
  deps.history?.record({ projectId: project.id, directionId: direction.id, label: version.title, versionId: version.id, files: [{ file: plan.target.file, relative: plan.target.relative, before: plan.original, after: plan.code }] });
  await publishVersion(deps, project, direction, version);
  return { file: plan.target.relative, version, title: plan.title, dropped: plan.dropped, added: plan.added, importFrom: plan.importFrom, select: plan.select };
}

function rankFor(from: LibraryEntry | undefined): (entry: LibraryEntry) => number {
  return (entry) => (from && entry.folder === from.folder ? 0 : 2) + (entry.uses > 0 ? 0 : 1);
}

export async function swapCandidates(project: Project, workTree: string, use: SourceLoc): Promise<SwapCandidateList> {
  if (project.kind !== 'react') return { from: '', candidates: [], note: 'This is an HTML project. It has no components to swap.' };
  const site = await readUseSite(workTree, use);
  const library = await loadLibrary(project, workTree);
  const from = library.entries.find((entry) => entry.name === site.name);
  const rank = rankFor(from);
  const pool = library.entries.filter((entry) => entry.name !== site.name && entry.absolute !== site.target.file && (!site.children || entry.children));
  const picked = [...pool].sort((a, b) => rank(a) - rank(b) || b.uses - a.uses || a.name.localeCompare(b.name)).slice(0, SCHEMA_BUDGET);
  const schemas = await componentSchemas(workTree, picked.map((entry) => ({ file: entry.absolute, name: entry.local })));
  const fits: (SwapCandidate & { rank: number })[] = [];
  picked.forEach((entry, index) => {
    const fit = fitOf(site, entry, schemas[index] ?? null);
    if (typeof fit === 'string' || fit.drop.length > 2) return;
    fits.push({ name: entry.name, file: entry.file, keep: fit.keep, drop: fit.drop, add: Object.keys(fit.add), rank: fit.drop.length * 10 + Object.keys(fit.add).length + rank(entry) });
  });
  const candidates = fits.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name)).slice(0, CANDIDATES_MAX).map(({ rank: _rank, ...item }) => item);
  const note = site.spread ? `This ${site.name} also spreads props, so some props may not fit the new component.` : candidates.length === 0 ? `No other component fits the props of this ${site.name}.` : null;
  return { from: site.name, candidates, note };
}
