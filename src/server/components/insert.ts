import { readFile } from 'node:fs/promises';
import type * as t from '@babel/types';
import { z } from 'zod';
import type { Direction, Project, SourceLoc, VersionMeta } from '../../shared/contracts.js';
import { INSERT_POSITIONS, INSERT_TEXT_MAX, type InsertComponentRequest, type InsertComponentResult } from '../../shared/insert.js';
import { OWNERS_MAX, OWNER_STACK_MAX, PROP_NAME, PROP_TEXT_MAX, PROPS_MAX, type ComponentSchema, type PropSpec, type PropValue } from '../../shared/props.js';
import { writeAndCommitAll } from '../direct-edit/batch.js';
import { DirectEditError } from '../direct-edit/errors.js';
import { planImport, type ImportNeed, type SeenImport } from '../direct-edit/imports.js';
import { assertCanEdit, publishVersion, resolveSource, type DirectEditDeps, type ResolvedSource } from '../direct-edit/index.js';
import { structureDoc } from '../direct-edit/structure-docs.js';
import { planInsert, positionAt, refuse } from '../direct-edit/structure-ops.js';
import { loadLibrary, type LibraryEntry } from './insert-list.js';
import { componentSchema, declaredComponents, loadTypeScript, parseModuleFile } from './props-schema.js';
import { ownerUseSite } from './use-site.js';

export interface InsertScope {
  project: Project;
  workTree: string;
  previewOrigin: string | null;
}

export interface InsertPlan {
  target: ResolvedSource;
  original: string;
  code: string;
  select: InsertComponentResult['select'];
  title: string;
  jsx: string;
  importFrom: string | null;
  importAdded: boolean;
  usedAt: SourceLoc | null;
  request: InsertComponentRequest;
}

const loc = z.object({ file: z.string().min(1).max(1000), line: z.number().int().min(1), col: z.number().int().min(1) }).strict();
const propValue = z.union([z.string().max(PROP_TEXT_MAX), z.number(), z.boolean()]);
const requestSchema = z
  .object({
    component: z.object({ name: z.string().regex(/^[A-Z][A-Za-z0-9_$]{0,63}$/, 'must be a component name such as Button'), file: z.string().min(1).max(1000).optional() }).strict(),
    target: z.object({ source: loc.nullable(), tag: z.string().max(100).optional(), selector: z.string().max(2000).optional(), owners: z.array(z.object({ name: z.string().max(64), stack: z.string().max(OWNER_STACK_MAX) })).max(OWNERS_MAX).optional() }).strict(),
    position: z.enum(INSERT_POSITIONS as [string, ...string[]]),
    props: z.record(z.string().regex(PROP_NAME), propValue).refine((value) => Object.keys(value).length <= PROPS_MAX, `at most ${PROPS_MAX} props`).optional(),
    text: z.string().max(INSERT_TEXT_MAX).optional(),
  })
  .strict();

const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr', 'textarea', 'select']);
const SAFE_ATTR = /^[^"\\{}<>\n]*$/;

export function parseInsertRequest(raw: unknown): InsertComponentRequest {
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new DirectEditError('invalid_request', issue ? `${issue.path.join('.') || 'request'}: ${issue.message}` : 'The insert request is not valid');
  }
  return parsed.data as InsertComponentRequest;
}

function pickEntry(entries: LibraryEntry[], component: InsertComponentRequest['component']): LibraryEntry {
  const matches = entries.filter((entry) => entry.name === component.name && (!component.file || entry.file === component.file));
  if (matches.length === 1) return matches[0] as LibraryEntry;
  if (matches.length === 0) throw refuse(`The project has no exported component named ${component.name}${component.file ? ` in ${component.file}` : ''}. List the components to see the names`);
  throw refuse(`More than one component is named ${component.name} (${matches.map((entry) => entry.file).join(', ')}). Pass its file too`);
}

function humanize(name: string): string {
  const words = name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(' ');
  return words.map((word, index) => (index === 0 ? word : word.toLowerCase())).join(' ');
}

function attribute(name: string, value: PropValue): string {
  if (value === true) return ` ${name}`;
  if (typeof value === 'string' && SAFE_ATTR.test(value)) return ` ${name}="${value}"`;
  return ` ${name}={${JSON.stringify(value)}}`;
}

function requiredValue(spec: PropSpec): PropValue {
  if (spec.default !== undefined) return spec.default;
  if (spec.control === 'select') return spec.options?.[0] ?? '';
  if (spec.control === 'boolean') return false;
  if (spec.control === 'number') return 0;
  return humanize(spec.name.charAt(0).toUpperCase() + spec.name.slice(1));
}

function propsFor(schema: ComponentSchema | null, given: Record<string, PropValue>): Record<string, PropValue> {
  const out: Record<string, PropValue> = {};
  for (const spec of schema?.props ?? []) {
    if (spec.optional || spec.name === 'asChild' || spec.from === 'variant' || spec.name in given) continue;
    out[spec.name] = requiredValue(spec);
  }
  for (const [name, value] of Object.entries(given)) if (name !== 'children') out[name] = value;
  return out;
}

function childText(text: string): string {
  return /[{}<>]/.test(text) ? `{${JSON.stringify(text)}}` : text;
}

export function jsxFor(entry: LibraryEntry, schema: ComponentSchema | null, request: InsertComponentRequest): string {
  const given = request.props ?? {};
  const attrs = Object.entries(propsFor(schema, given))
    .map(([name, value]) => attribute(name, value))
    .join('');
  if (!entry.children) return `<${entry.name}${attrs} />`;
  const fromProps = typeof given.children === 'string' ? given.children : null;
  const text = (request.text ?? fromProps ?? humanize(entry.name)).replace(/\s+/g, ' ').trim();
  return text ? `<${entry.name}${attrs}>${childText(text)}</${entry.name}>` : `<${entry.name}${attrs} />`;
}

function isNode(value: unknown): value is t.Node {
  return typeof value === 'object' && value !== null && typeof (value as { type?: unknown }).type === 'string';
}

function childNodes(node: t.Node): t.Node[] {
  const out: t.Node[] = [];
  for (const [key, value] of Object.entries(node)) {
    if (key === 'loc' || key.endsWith('Comments') || key === 'extra') continue;
    if (Array.isArray(value)) out.push(...value.filter(isNode));
    else if (isNode(value)) out.push(value);
  }
  return out;
}

function rootJsx(ast: t.File, start: number, end: number): t.JSXElement | null {
  let found: t.JSXElement | null = null;
  const stack: t.Node[] = [ast.program];
  while (stack.length > 0) {
    const node = stack.pop() as t.Node;
    const at = node.start ?? 0;
    if ((node.end ?? 0) < start || at > end) continue;
    if (node.type === 'JSXElement' && at >= start && (!found || at < (found.start ?? 0))) found = node;
    stack.push(...childNodes(node));
  }
  return found;
}

function sameStart(root: t.JSXElement | null, at: SourceLoc, tag: string | undefined): boolean {
  const start = root?.openingElement.loc?.start;
  if (!root || !start || start.line !== at.line) return false;
  const name = root.openingElement.name;
  return start.column + 1 === at.col || (name.type === 'JSXIdentifier' && name.name === tag);
}

function rootOwner(code: string, file: string, at: SourceLoc, tag: string | undefined, entries: LibraryEntry[]): LibraryEntry | null {
  const ast = parseModuleFile(code, file);
  if (!ast) return null;
  for (const declared of declaredComponents(ast)) {
    if (!sameStart(rootJsx(ast, declared.start, declared.end), at, tag)) continue;
    const entry = entries.find((item) => item.absolute === file && item.local === declared.name);
    return entry?.children ? entry : null;
  }
  return null;
}

async function useSiteTarget(scope: InsertScope, root: string, request: InsertComponentRequest, owner: LibraryEntry): Promise<SourceLoc> {
  const found = (request.target.owners ?? []).find((item) => item.name === owner.local || item.name === owner.name);
  const use = found ? await ownerUseSite({ workTree: scope.workTree, previewOrigin: scope.previewOrigin }, root, found).catch(() => null) : null;
  if (use) return use;
  throw refuse(`This is the top element of <${owner.name}> in ${owner.file}, so the insert would change every ${owner.name}. Select the ${owner.name} on the page, or pass the file:line:col of the <${owner.name}> tag where the page uses it`);
}

interface ResolvedTarget {
  target: ResolvedSource;
  code: string;
  at: SourceLoc;
  tag: string | undefined;
  usedAt: SourceLoc | null;
}

function tagMatches(relative: string, code: string, at: SourceLoc, tag: string | undefined): boolean {
  try {
    structureDoc(relative, code).node(at, 'into', tag);
    return true;
  } catch (error) {
    return !(error instanceof DirectEditError && error.code === 'stale_selection');
  }
}

async function nearestUseSite(scope: InsertScope, root: string, request: InsertComponentRequest): Promise<SourceLoc | null> {
  const owner = request.target.owners?.find((item) => /^[A-Z]/.test(item.name));
  return owner ? ownerUseSite({ workTree: scope.workTree, previewOrigin: scope.previewOrigin }, root, owner).catch(() => null) : null;
}

async function retargeted(scope: InsertScope, use: SourceLoc): Promise<ResolvedTarget> {
  const target = await resolveSource(scope.workTree, use.file);
  return { target, code: await readFile(target.file, 'utf8'), at: use, tag: undefined, usedAt: use };
}

async function resolveTarget(scope: InsertScope, root: string, request: InsertComponentRequest, entries: LibraryEntry[]): Promise<ResolvedTarget> {
  const source = request.target.source;
  if (!source) {
    const use = await nearestUseSite(scope, root, request);
    if (!use) throw refuse('This element has no source location and no component use site the studio can find; pass targetSource');
    return retargeted(scope, use);
  }
  const first = await resolveSource(scope.workTree, source.file);
  const code = await readFile(first.file, 'utf8');
  const plain = { target: first, code, at: source, tag: request.target.tag, usedAt: null };
  const owner = rootOwner(code, first.file, source, request.target.tag, entries);
  if (owner) return retargeted(scope, await useSiteTarget(scope, root, request, owner));
  if (tagMatches(first.relative, code, source, request.target.tag)) return plain;
  const use = await nearestUseSite(scope, root, request);
  return use ? retargeted(scope, use) : plain;
}

const ALIAS_LIKE = /^(@\/|~\/|#|@[\w.-]+\/[\w.-]+\/)/;

function seenImports(specifiers: Map<string, string[]>): SeenImport[] {
  const out: SeenImport[] = [];
  const done = new Set<string>();
  for (const [from, list] of specifiers) {
    for (const specifier of list) {
      if (done.has(specifier) || !ALIAS_LIKE.test(specifier) || out.length >= 200) continue;
      done.add(specifier);
      out.push({ specifier, from });
    }
  }
  return out;
}

function insertTitle(name: string, position: InsertComponentRequest['position'], tag: string): string {
  return position === 'inside' ? `Insert ${name} into ${tag}` : `Insert ${name} after ${tag}`;
}

export async function planInsertComponent(scope: InsertScope, raw: unknown): Promise<InsertPlan> {
  const request = parseInsertRequest(raw);
  if (scope.project.kind !== 'react') throw refuse('This is an HTML project. It has no component kit to insert from; ask the agent to add the markup');
  const library = await loadLibrary(scope.project, scope.workTree);
  const entry = pickEntry(library.entries, request.component);
  const resolved = await resolveTarget(scope, library.root, request, library.entries);
  if (resolved.target.file === entry.absolute) throw refuse(`${entry.name} cannot be placed inside its own file, ${entry.file}`);
  const doc = structureDoc(resolved.target.relative, resolved.code);
  const node = doc.node(resolved.at, request.position === 'inside' ? 'into' : 'ref', resolved.tag);
  if (request.position === 'inside' && VOID_TAGS.has(node.tag)) throw refuse(`<${node.tag}> cannot hold other elements; insert after it instead`);
  const ts = await loadTypeScript();
  const schema = await componentSchema(scope.workTree, { file: entry.absolute, name: entry.local });
  const jsx = jsxFor(entry, schema, request);
  const ast = parseModuleFile(resolved.code, resolved.target.file);
  if (!ast) throw new DirectEditError('parse_failed', 'The target file could not be parsed');
  const need: ImportNeed = { name: entry.name, kind: entry.kind, componentFile: entry.absolute, targetFile: resolved.target.file, root: library.root, seen: seenImports(library.specifiers), allowPaths: scope.project.app?.framework === 'next' };
  const importPlan = planImport(ts, resolved.code, ast, need);
  const place = request.position === 'inside' ? { into: node } : { after: node };
  const plan = planInsert(resolved.code, { text: jsx, place, closeTag: doc.closeTag, ...(importPlan.splice ? { extra: importPlan.splice } : {}) });
  const positions = plan.select.map((offset) => positionAt(plan.code, offset));
  doc.verify(plan.code, positions);
  const select = positions.map((position) => ({ file: resolved.target.relative, ...position, tag: entry.name }));
  return { target: resolved.target, original: resolved.code, code: plan.code, select, title: insertTitle(entry.name, request.position, node.tag), jsx, importFrom: importPlan.specifier, importAdded: importPlan.added, usedAt: resolved.usedAt, request };
}

export async function applyInsertComponent(deps: DirectEditDeps, scope: InsertScope & { direction: Direction }, raw: unknown): Promise<InsertComponentResult> {
  const { project, direction } = scope;
  parseInsertRequest(raw);
  assertCanEdit(deps, project, direction);
  const plan = await planInsertComponent(scope, raw);
  const at = plan.select[0];
  const where = at ? `${at.file}:${at.line}:${at.col}` : plan.target.relative;
  const meta: VersionMeta = { kind: 'manual', prompt: `Insert component: ${plan.request.component.name} ${plan.request.position} ${where}` };
  const version = await writeAndCommitAll(deps, project, direction, [plan], plan.title, meta);
  deps.history?.record({ projectId: project.id, directionId: direction.id, label: version.title, versionId: version.id, files: [{ file: plan.target.file, relative: plan.target.relative, before: plan.original, after: plan.code }] });
  await publishVersion(deps, project, direction, version);
  return { file: plan.target.relative, version, select: plan.select, jsx: plan.jsx, importFrom: plan.importFrom, importAdded: plan.importAdded, usedAt: plan.usedAt };
}
