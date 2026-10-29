import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type * as t from '@babel/types';
import { z } from 'zod';
import type { Direction, SourceLoc, VersionMeta } from '../../shared/contracts.js';
import { JSX_IMPORTS_MAX, JSX_INSERT_POSITIONS, JSX_SNIPPET_MAX, type ClearTextRequest, type InsertJsxRequest, type InsertJsxResult } from '../../shared/insert.js';
import { OWNERS_MAX, OWNER_STACK_MAX } from '../../shared/props.js';
import { resolveTarget, seenImports, type InsertScope, type ResolvedTarget } from '../components/insert.js';
import { loadLibrary, type LibraryEntry } from '../components/insert-list.js';
import { loadTypeScript, parseModuleFile } from '../components/props-schema.js';
import { writeAndCommitAll } from './batch.js';
import { DirectEditError } from './errors.js';
import { planImports, type ImportItem, type ImportNeed } from './imports.js';
import { assertCanEdit, publishVersion, resolveSource, type DirectEditDeps, type ResolvedSource } from './index.js';
import { parseHtmlSnippet, parseJsxSnippet, type Snippet } from './jsx-snippet.js';
import { parseSource } from './jsx.js';
import { jsxElementAt } from './structure.js';
import { structureDoc, type DocNode, type NodeRole } from './structure-docs.js';
import { indentUnit, planInsert, planStructure, positionAt, refuse, type Placement, type StructNode } from './structure-ops.js';

export interface JsxInsertPlan {
  target: ResolvedSource;
  original: string;
  code: string;
  select: InsertJsxResult['select'];
  imports: ImportItem[];
  usedAt: SourceLoc | null;
  title: string;
  request: InsertJsxRequest;
}

const loc = z.object({ file: z.string().min(1).max(1000), line: z.number().int().min(1), col: z.number().int().min(1) }).strict();
const targetSchema = z.object({ source: loc.nullable(), tag: z.string().max(100).optional(), selector: z.string().max(2000).optional(), owners: z.array(z.object({ name: z.string().max(64), stack: z.string().max(OWNER_STACK_MAX) })).max(OWNERS_MAX).optional() }).strict();
const clearSchema = z.object({ target: targetSchema }).strict();
const requestSchema = z
  .object({
    target: targetSchema,
    position: z.enum(JSX_INSERT_POSITIONS as [string, ...string[]]),
    jsx: z.string().trim().min(1, 'jsx is empty').max(JSX_SNIPPET_MAX),
    imports: z
      .record(z.string().regex(/^[A-Z][A-Za-z0-9_$]{0,63}$/), z.string().trim().min(1).max(1000))
      .refine((value) => Object.keys(value).length <= JSX_IMPORTS_MAX, `at most ${JSX_IMPORTS_MAX} imports`)
      .optional(),
  })
  .strict();

const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr', 'textarea', 'select']);
const ROLE: Record<InsertJsxRequest['position'], NodeRole> = { inside: 'into', before: 'insert', after: 'insert', replace: 'insert' };
const GLOBALS = new Set(['undefined', 'Infinity', 'NaN', 'Math', 'Number', 'String', 'Date', 'JSON', 'window', 'document']);

export function parseInsertJsxRequest(raw: unknown): InsertJsxRequest {
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new DirectEditError('invalid_request', issue ? `${issue.path.join('.') || 'request'}: ${issue.message}` : 'The insert request is not valid');
  }
  return parsed.data as InsertJsxRequest;
}

function isHtml(file: string): boolean {
  return /\.html?$/i.test(file);
}

async function plainTarget(scope: InsertScope, request: Pick<InsertJsxRequest, 'target'>): Promise<ResolvedTarget> {
  const source = request.target.source;
  if (!source) throw refuse('This element has no source location; pass targetSource');
  const target = await resolveSource(scope.workTree, source.file);
  return { target, code: await readFile(target.file, 'utf8'), at: source, tag: request.target.tag, usedAt: null };
}

function statementNames(statement: t.Statement, names: Set<string>): void {
  if (statement.type === 'ImportDeclaration') statement.specifiers.forEach((specifier) => names.add(specifier.local.name));
  const node = (statement.type === 'ExportNamedDeclaration' || statement.type === 'ExportDefaultDeclaration') && statement.declaration ? statement.declaration : statement;
  if ((node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration') && node.id) names.add(node.id.name);
  if (node.type !== 'VariableDeclaration') return;
  for (const decl of node.declarations) if (decl.id.type === 'Identifier') names.add(decl.id.name);
}

function localNames(ast: t.File): Set<string> {
  const names = new Set<string>();
  for (const statement of ast.program.body) statementNames(statement, names);
  return names;
}

function similar(name: string, entries: LibraryEntry[]): string {
  const stem = name.replace(/(Header|Title|Content|Footer|Description|Item|Trigger|Group)$/, '').toLowerCase();
  const near = [...new Set(entries.map((entry) => entry.name))].filter((other) => other.toLowerCase().includes(stem) || stem.includes(other.toLowerCase())).slice(0, 12);
  return near.length > 0 ? ` Close names: ${near.join(', ')}.` : ' Call list_components to see the names.';
}

function pickEntry(name: string, entries: LibraryEntry[], file: string | undefined): LibraryEntry {
  const matches = entries.filter((entry) => entry.name === name && (!file || entry.file === file));
  if (matches.length === 1) return matches[0] as LibraryEntry;
  if (matches.length === 0) throw refuse(`The snippet uses <${name}>, but the project has no exported component named ${name}${file ? ` in ${file}` : ''} and the target file does not import it.${similar(name, entries)}`);
  throw refuse(`More than one component is named ${name} (${matches.map((entry) => entry.file).join(', ')}). Pass imports: {"${name}": "<file>"}`);
}

function assertReferences(snippet: Snippet, bound: Set<string>, code: string, relative: string): void {
  for (const ref of snippet.references) {
    if (GLOBALS.has(ref) || bound.has(ref) || new RegExp(`\\b${ref.replace(/\$/g, '\\$')}\\b`).test(code)) continue;
    throw refuse(`The snippet refers to ${ref}, which ${relative} does not have. Pass a value, or a name the file already has`);
  }
}

type Library = Awaited<ReturnType<typeof loadLibrary>>;

interface ImportResult {
  splices: { start: number; end: number; text: string }[];
  items: ImportItem[];
}

async function importsFor(scope: InsertScope, library: Library, resolved: ResolvedTarget, snippet: Snippet, request: InsertJsxRequest): Promise<ImportResult> {
  const ast = parseModuleFile(resolved.code, resolved.target.file);
  if (!ast) throw new DirectEditError('parse_failed', 'The target file could not be parsed');
  const bound = localNames(ast);
  assertReferences(snippet, bound, resolved.code, resolved.target.relative);
  const missing = snippet.components.filter((name) => !bound.has(name));
  if (missing.length === 0) return { splices: [], items: [] };
  const seen = seenImports(library.specifiers);
  const needs: ImportNeed[] = missing.map((name) => {
    const entry = pickEntry(name, library.entries, request.imports?.[name]);
    if (entry.absolute === resolved.target.file) throw refuse(`${name} is defined in ${entry.file}, the file you insert into; it is in scope only if the file declares it at the top level`);
    return { name: entry.name, kind: entry.kind, componentFile: entry.absolute, targetFile: resolved.target.file, root: library.root, seen, allowPaths: scope.project.app?.framework === 'next' };
  });
  return planImports(await loadTypeScript(), resolved.code, ast, needs);
}

function placement(position: InsertJsxRequest['position'], node: StructNode): Placement {
  if (position === 'inside') return { into: node };
  if (position === 'before') return { before: node };
  if (position === 'after') return { after: node };
  return { replace: node };
}

function wrapFragment(pieces: string[], unit: string): string {
  const body = pieces.map((piece) => piece.split('\n').map((line) => (line === '' ? line : `${unit}${line}`)).join('\n')).join('\n');
  return `<>\n${body}\n</>`;
}

function lineLead(source: string, offset: number): string {
  const start = source.lastIndexOf('\n', offset - 1) + 1;
  return /^[ \t]*/.exec(source.slice(start, offset))?.[0] ?? '';
}

function ownLine(source: string, node: StructNode): boolean {
  const start = source.lastIndexOf('\n', node.start - 1) + 1;
  const next = source.indexOf('\n', node.end);
  return /^[ \t]*$/.test(source.slice(start, node.start)) && /^[ \t\r]*$/.test(source.slice(node.end, next < 0 ? source.length : next));
}

function branchPieces(source: string, snippet: Snippet, position: InsertJsxRequest['position'], node: StructNode, unit: string): string[] {
  const lead = lineLead(source, node.start);
  const own = source.slice(node.start, node.end).split('\n').map((line, index) => (index > 0 && line.startsWith(lead) ? line.slice(lead.length) : line)).join('\n');
  const fragment = wrapFragment(position === 'after' ? [own, ...snippet.pieces] : [...snippet.pieces, own], unit);
  return [ownLine(source, node) ? fragment : fragment.split('\n').join(`\n${lead}`)];
}

function piecesFor(source: string, snippet: Snippet, position: InsertJsxRequest['position'], node: DocNode, html: boolean, unit: string): string[] {
  if (node.branch && position !== 'replace') return branchPieces(source, snippet, position, node, unit);
  if (position !== 'replace' || !node.root || snippet.pieces.length < 2 || html) return snippet.pieces;
  return [wrapFragment(snippet.pieces, unit)];
}

function placementFor(position: InsertJsxRequest['position'], node: DocNode): Placement {
  return node.branch ? { replace: node } : placement(position, node);
}

function fragmentChildren(code: string, ast: t.File, offset: number): number[] {
  const out: number[] = [];
  let at = offset + 2;
  for (;;) {
    while (/\s/.test(code[at] ?? '')) at += 1;
    const child = code[at] === '<' && code[at + 1] !== '/' ? jsxElementAt(ast.program, at) : null;
    if (!child || child.end == null) return out;
    out.push(at);
    at = child.end;
  }
}

function insertedOffsets(code: string, select: number[], position: InsertJsxRequest['position'], node: DocNode, typescript: boolean): number[] {
  if (!select.some((offset) => code.startsWith('<>', offset))) return select;
  const ast = parseSource(code, typescript);
  return select.flatMap((offset) => {
    if (!code.startsWith('<>', offset)) return [offset];
    const children = fragmentChildren(code, ast, offset);
    if (!node.branch || position === 'replace') return children;
    return position === 'after' ? children.slice(1) : children.slice(0, -1);
  });
}

function subject(snippet: Snippet): string {
  return snippet.tags.length === 1 ? (snippet.tags[0] ?? 'element') : `${snippet.tags.length} elements`;
}

function titleOf(snippet: Snippet, position: InsertJsxRequest['position'], tag: string): string {
  const what = subject(snippet);
  if (position === 'inside') return `Insert ${what} into ${tag}`;
  if (position === 'replace') return `Replace ${tag} with ${what}`;
  return `Insert ${what} ${position} ${tag}`;
}

async function resolveFor(scope: InsertScope, request: Pick<InsertJsxRequest, 'target'>): Promise<{ resolved: ResolvedTarget; library: Library | null }> {
  if (scope.project.kind !== 'react') return { resolved: await plainTarget(scope, request), library: null };
  const library = await loadLibrary(scope.project, scope.workTree);
  return { resolved: await resolveTarget(scope, library.root, request, library.entries), library };
}

function isTypeScript(relative: string): boolean {
  const extension = path.extname(relative).toLowerCase();
  return extension !== '.js' && extension !== '.jsx';
}

function snippetFor(request: InsertJsxRequest, relative: string, unit: string): Snippet {
  if (isHtml(relative)) return parseHtmlSnippet(request.jsx, unit);
  return parseJsxSnippet(request.jsx, isTypeScript(relative), unit);
}

export async function planInsertJsx(scope: InsertScope, raw: unknown): Promise<JsxInsertPlan> {
  const request = parseInsertJsxRequest(raw);
  const { resolved, library } = await resolveFor(scope, request);
  const relative = resolved.target.relative;
  const html = isHtml(relative);
  if (!html && scope.project.kind !== 'react') throw refuse(`${relative} is not an HTML or JSX file`);
  const unit = indentUnit(resolved.code);
  const snippet = snippetFor(request, relative, unit);
  const doc = structureDoc(relative, resolved.code);
  const node = doc.node(resolved.at, ROLE[request.position], resolved.tag);
  if (request.position === 'inside' && VOID_TAGS.has(node.tag)) throw refuse(`<${node.tag}> cannot hold other elements; insert after it instead`);
  const imported = library && !html ? await importsFor(scope, library, resolved, snippet, request) : { splices: [], items: [] };
  const plan = planInsert(resolved.code, { pieces: piecesFor(resolved.code, snippet, request.position, node, html, unit), place: placementFor(request.position, node), closeTag: doc.closeTag, extras: imported.splices });
  const offsets = html ? plan.select : insertedOffsets(plan.code, plan.select, request.position, node, isTypeScript(relative));
  const positions = offsets.map((offset) => positionAt(plan.code, offset));
  doc.verify(plan.code, positions);
  const select = positions.map((position, index) => ({ file: relative, ...position, tag: snippet.tags[index] ?? snippet.tags[0] ?? 'element' }));
  return { target: resolved.target, original: resolved.code, code: plan.code, select, imports: imported.items, usedAt: resolved.usedAt, title: titleOf(snippet, request.position, node.tag), request };
}

export async function applyInsertJsx(deps: DirectEditDeps, scope: InsertScope & { direction: Direction }, raw: unknown): Promise<InsertJsxResult> {
  const { project, direction } = scope;
  parseInsertJsxRequest(raw);
  assertCanEdit(deps, project, direction);
  const plan = await planInsertJsx(scope, raw);
  const at = plan.select[0];
  const where = at ? `${at.file}:${at.line}:${at.col}` : plan.target.relative;
  const meta: VersionMeta = { kind: 'manual', prompt: `Insert JSX: ${plan.request.position} ${where}` };
  const version = await writeAndCommitAll(deps, project, direction, [plan], plan.title, meta);
  deps.history?.record({ projectId: project.id, directionId: direction.id, label: version.title, versionId: version.id, files: [{ file: plan.target.file, relative: plan.target.relative, before: plan.original, after: plan.code }] });
  await publishVersion(deps, project, direction, version);
  return { file: plan.target.relative, version, select: plan.select, imports: plan.imports, usedAt: plan.usedAt, title: plan.title };
}

export interface ClearTextPlan extends Omit<JsxInsertPlan, 'request' | 'imports'> {
  request: ClearTextRequest;
}

export function parseClearTextRequest(raw: unknown): ClearTextRequest {
  const parsed = clearSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new DirectEditError('invalid_request', issue ? `${issue.path.join('.') || 'request'}: ${issue.message}` : 'The clear request is not valid');
  }
  return parsed.data as ClearTextRequest;
}

export async function planClearText(scope: InsertScope, raw: unknown): Promise<ClearTextPlan> {
  const request = parseClearTextRequest(raw);
  const { resolved } = await resolveFor(scope, request);
  const relative = resolved.target.relative;
  const doc = structureDoc(relative, resolved.code);
  const node = doc.node(resolved.at, 'target', resolved.tag);
  const plan = planStructure(resolved.code, { op: 'clear', nodes: [node], place: {}, frame: doc.frame('0'), closeTag: doc.closeTag });
  const positions = plan.select.map((offset) => positionAt(plan.code, offset));
  doc.verify(plan.code, positions);
  const select = positions.map((position) => ({ file: relative, ...position, tag: node.tag }));
  return { target: resolved.target, original: resolved.code, code: plan.code, select, usedAt: resolved.usedAt, title: `Clear text in ${node.tag}`, request };
}

export async function applyClearText(deps: DirectEditDeps, scope: InsertScope & { direction: Direction }, raw: unknown): Promise<InsertJsxResult> {
  const { project, direction } = scope;
  parseClearTextRequest(raw);
  assertCanEdit(deps, project, direction);
  const plan = await planClearText(scope, raw);
  const at = plan.select[0];
  const meta: VersionMeta = { kind: 'manual', prompt: `Clear text: ${at ? `${at.file}:${at.line}:${at.col}` : plan.target.relative}` };
  const version = await writeAndCommitAll(deps, project, direction, [plan], plan.title, meta);
  deps.history?.record({ projectId: project.id, directionId: direction.id, label: version.title, versionId: version.id, files: [{ file: plan.target.file, relative: plan.target.relative, before: plan.original, after: plan.code }] });
  await publishVersion(deps, project, direction, version);
  return { file: plan.target.relative, version, select: plan.select, imports: [], usedAt: plan.usedAt, title: plan.title };
}
