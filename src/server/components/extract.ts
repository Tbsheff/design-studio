import { existsSync, readFileSync } from 'node:fs';
import { readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import type * as t from '@babel/types';
import { z } from 'zod';
import { COMPONENT_NAME, CREATE_TARGETS_MAX, type ComponentFolder, type ComponentFolderList, type CreateComponentRequest, type CreateComponentResult, type CreatedProp } from '../../shared/component-create.js';
import type { Direction, Project, VersionMeta } from '../../shared/contracts.js';
import { OWNERS_MAX, OWNER_STACK_MAX } from '../../shared/props.js';
import { writeAndCommitAll, type WrittenFile } from '../direct-edit/batch.js';
import { DirectEditError } from '../direct-edit/errors.js';
import { planImport } from '../direct-edit/imports.js';
import { assertCanEdit, publishVersion, writeNewFile, type DirectEditDeps, type ResolvedSource } from '../direct-edit/index.js';
import { findJsxElement } from '../direct-edit/jsx.js';
import { structureDoc } from '../direct-edit/structure-docs.js';
import { indentUnit, positionAt, refuse } from '../direct-edit/structure-ops.js';
import { removeImport } from './import-cleanup.js';
import { compareUses, importMap, tagText, type ShapeUse, type Slot } from './extract-shape.js';
import { classExpression, componentFile, nameSlots, planVariants, reindent, useSite, type FileStyle, type VariantPlan } from './extract-file.js';
import { resolveTarget, seenImports, type InsertScope } from './insert.js';
import { libraryRoots, loadLibrary } from './insert-list.js';
import { loadTypeScript, parseModuleFile, resolveImport } from './props-schema.js';

type Ts = Awaited<ReturnType<typeof loadTypeScript>>;
type Library = Awaited<ReturnType<typeof loadLibrary>>;

const loc = z.object({ file: z.string().min(1).max(1000), line: z.number().int().min(1), col: z.number().int().min(1) }).strict();
const target = z.object({ source: loc.nullable(), tag: z.string().max(100).optional(), selector: z.string().max(2000).optional(), owners: z.array(z.object({ name: z.string().max(64), stack: z.string().max(OWNER_STACK_MAX) })).max(OWNERS_MAX).optional() }).strict();
const requestSchema = z
  .object({
    targets: z.array(target).min(1, 'select at least one element').max(CREATE_TARGETS_MAX, `select at most ${CREATE_TARGETS_MAX} elements`),
    name: z.string().regex(COMPONENT_NAME, 'must be a PascalCase name such as StatRow'),
    folder: z.string().trim().min(1, 'pick a folder').max(500),
  })
  .strict();

interface Use extends ShapeUse {
  target: ResolvedSource;
  ast: t.File;
  start: number;
  end: number;
}

export interface CreatePlan {
  files: WrittenFile[];
  component: ResolvedSource;
  name: string;
  props: CreatedProp[];
  variants: string[];
  select: CreateComponentResult['select'];
  importFrom: string[];
  title: string;
}

export function parseCreateRequest(raw: unknown): CreateComponentRequest {
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new DirectEditError('invalid_request', issue ? `${issue.path.join('.') || 'request'}: ${issue.message}` : 'The create component request is not valid');
  }
  return parsed.data as CreateComponentRequest;
}

function plainReason(error: unknown): never {
  if (!(error instanceof DirectEditError) || error.code === 'stale_selection') throw error;
  if (/\.map\(\)/.test(error.message)) throw refuse('Cannot make a component from this element: a .map() in the code draws it, so its source is already one template for every item. Edit that template, or select elements that are written out one by one');
  if (/condition/.test(error.message)) throw refuse('Cannot make a component from this element: a condition in the code (? : or &&) shows it. Select an element that is always shown, or its parent');
  throw refuse(`Cannot make a component from this element: ${error.message.replace(/; ask the agent to change it$/, '')}`);
}

async function readUse(scope: InsertScope, library: Library, request: CreateComponentRequest['targets'][number], parsed: Map<string, { code: string; ast: t.File }>): Promise<Use> {
  const resolved = await resolveTarget(scope, library.root, { target: request }, library.entries);
  const relative = resolved.target.relative;
  if (!/\.[jt]sx$/i.test(relative)) throw refuse(`${relative} is not a JSX file, so the studio cannot make a component from it`);
  let file = parsed.get(resolved.target.file);
  if (!file) {
    const ast = parseModuleFile(resolved.code, resolved.target.file);
    if (!ast) throw new DirectEditError('parse_failed', `${relative} could not be parsed`);
    file = { code: resolved.code, ast };
    parsed.set(resolved.target.file, file);
  }
  try {
    structureDoc(relative, file.code).node(resolved.at, 'target', resolved.tag);
  } catch (error) {
    plainReason(error);
  }
  const element = findJsxElement(file.ast.program, resolved.at);
  if (!element) throw refuse(`No element starts at ${relative}:${resolved.at.line}:${resolved.at.col}`);
  return { target: resolved.target, ast: file.ast, code: file.code, element, imports: importMap(file.ast), start: element.start ?? 0, end: element.end ?? 0 };
}

function assertSeparate(uses: Use[]): void {
  for (const [index, use] of uses.entries()) {
    const other = uses.find((item, at) => at !== index && item.target.file === use.target.file && item.start <= use.start && use.end <= item.end);
    if (other) throw refuse('One selected element is inside another. Select only the outer elements, or only the inner ones');
  }
}

async function readUses(scope: InsertScope, library: Library, request: CreateComponentRequest): Promise<Use[]> {
  const parsed = new Map<string, { code: string; ast: t.File }>();
  const uses: Use[] = [];
  for (const item of request.targets) {
    const use = await readUse(scope, library, item, parsed);
    if (!uses.some((other) => other.target.file === use.target.file && other.start === use.start)) uses.push(use);
  }
  assertSeparate(uses);
  return uses.sort((a, b) => a.target.relative.localeCompare(b.target.relative) || a.start - b.start);
}

function inside(root: string, file: string): boolean {
  return file.startsWith(root + path.sep);
}

function folderPath(root: string, folder: string): string {
  const absolute = path.resolve(root, folder.replace(/^\/+/, ''));
  const segments = path.relative(root, absolute).split(path.sep);
  if (absolute !== root && !inside(root, absolute)) throw refuse('The folder must be inside the project');
  if (segments.some((segment) => segment === 'node_modules' || segment.startsWith('.'))) throw refuse('The studio cannot write a component into node_modules or a hidden folder');
  return absolute;
}

async function fileName(dir: string, name: string, ext: string): Promise<string> {
  const names = await readdir(dir).catch(() => [] as string[]);
  const jsx = names.filter((item) => /\.[jt]sx$/.test(item));
  const kebab = jsx.some((item) => /^[a-z0-9]+(-[a-z0-9]+)*\.[jt]sx$/.test(item));
  const pascal = jsx.some((item) => /^[A-Z]/.test(item));
  const useKebab = kebab && !pascal ? true : pascal ? false : /(^|\/)(ui|packages)(\/|$)/.test(dir.split(path.sep).join('/'));
  const base = useKebab ? name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase() : name;
  return path.join(dir, `${base}${ext}`);
}

function packageDir(file: string, root: string): string {
  for (let dir = path.dirname(file); dir.startsWith(root); dir = path.dirname(dir)) {
    if (existsSync(path.join(dir, 'package.json'))) return dir;
    if (dir === root) break;
  }
  return root;
}

function dependsOn(dir: string, name: string): boolean {
  try {
    const pkg = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8')) as Record<string, Record<string, string> | undefined>;
    return Boolean(pkg.dependencies?.[name] ?? pkg.devDependencies?.[name] ?? pkg.peerDependencies?.[name]);
  } catch {
    return false;
  }
}

function relativeSpec(from: string, to: string): string {
  const bare = to.replace(/\.(tsx|ts|jsx|js|mts|mjs)$/, '').replace(/\/index$/, '');
  const rel = path.relative(path.dirname(from), bare).split(path.sep).join('/');
  return rel.startsWith('.') ? rel : `./${rel}`;
}

interface SpecInput {
  ts: Ts;
  spec: string;
  source: string;
  file: string;
  root: string;
  appDir: string | null;
}

function appFileRefusal(spec: string): DirectEditError {
  return refuse(`The markup uses "${spec}", which is a file of the app, and a kit component cannot import app files. Pick the app's components folder, or move that file into the kit first`);
}

function rewriteSpec(input: SpecInput): string {
  const { ts, spec, source, file, root, appDir } = input;
  const resolved = resolveImport(ts, spec, source, root);
  const intoApp = (target: string) => appDir !== null && inside(appDir, target) && !inside(appDir, file);
  if (spec.startsWith('.')) {
    const target = resolved ?? path.resolve(path.dirname(source), spec);
    if (intoApp(target)) throw appFileRefusal(spec);
    return relativeSpec(file, target);
  }
  if (!resolved) return spec;
  const ownPackage = packageDir(file, root);
  if (packageDir(source, root) === ownPackage) return spec;
  if (packageDir(resolved, root) === ownPackage) return relativeSpec(file, resolved);
  if (intoApp(resolved)) throw appFileRefusal(spec);
  return spec;
}

function specifierText(specifier: t.ImportDeclaration['specifiers'][number], typeOnly: boolean): string {
  if (specifier.type !== 'ImportSpecifier') return specifier.local.name;
  const imported = specifier.imported.type === 'Identifier' ? specifier.imported.name : JSON.stringify(specifier.imported.value);
  const name = imported === specifier.local.name ? imported : `${imported} as ${specifier.local.name}`;
  return !typeOnly && specifier.importKind === 'type' ? `type ${name}` : name;
}

function importLine(decl: t.ImportDeclaration, names: Set<string>, spec: string, style: FileStyle): string {
  const typeOnly = decl.importKind === 'type';
  const picked = decl.specifiers.filter((item) => names.has(item.local.name));
  const lead = typeOnly ? 'import type ' : 'import ';
  const from = ` from ${style.quote}${spec}${style.quote}${style.semi}`;
  const namespace = picked.find((item) => item.type === 'ImportNamespaceSpecifier');
  if (namespace) return `${lead}* as ${namespace.local.name}${from}`;
  const fallback = picked.find((item) => item.type === 'ImportDefaultSpecifier');
  const named = picked.filter((item) => item.type === 'ImportSpecifier').map((item) => specifierText(item, typeOnly));
  const parts = [fallback ? fallback.local.name : null, named.length > 0 ? `{ ${named.join(', ')} }` : null].filter(Boolean);
  return `${lead}${parts.join(', ')}${from}`;
}

function newImports(ts: Ts, use: Use, names: Set<string>, file: string, root: string, appDir: string | null, style: FileStyle): string[] {
  const decls = [...new Set([...names].map((name) => use.imports.get(name)).filter((decl): decl is t.ImportDeclaration => decl !== undefined))];
  return decls.map((decl) => importLine(decl, names, rewriteSpec({ ts, spec: decl.source.value, source: use.target.file, file, root, appDir }), style));
}

function styleOf(use: Use, file: string, root: string): Omit<FileStyle, 'cva'> & { cvaAvailable: boolean } {
  const first = use.ast.program.body.find((node): node is t.ImportDeclaration => node.type === 'ImportDeclaration');
  const quote = first?.source.start != null && use.code[first.source.start] === '"' ? '"' : "'";
  const semi = first?.end != null && use.code[first.end - 1] !== ';' ? '' : ';';
  return { quote, semi, unit: indentUnit(use.code), typescript: file.endsWith('.tsx'), cvaAvailable: dependsOn(packageDir(file, root), 'class-variance-authority') || dependsOn(root, 'class-variance-authority') };
}

function lineIndent(code: string, offset: number): string {
  const start = code.lastIndexOf('\n', offset - 1) + 1;
  return /^[ \t]*/.exec(code.slice(start))?.[0] ?? '';
}

function bodyOf(use: Use, slots: Slot[], variants: VariantPlan | null, style: FileStyle): string {
  const edits = slots.map((slot) => {
    const part = variants?.parts.find((item) => item.slot === slot);
    const value = part && variants ? classExpression(part, variants, style) : slot.name;
    return { ...slot.edit0, text: `${slot.edit0.prefix}{${value}}` };
  });
  let text = use.code.slice(use.start, use.end);
  for (const edit of edits.sort((a, b) => b.start - a.start)) text = text.slice(0, edit.start - use.start) + edit.text + text.slice(edit.end - use.start);
  return reindent(text, lineIndent(use.code, use.start), style.unit.repeat(2));
}

interface FileEdit {
  use: Use[];
  splices: { start: number; end: number; text: string; tag?: string }[];
}

function applySplices(code: string, splices: FileEdit['splices']): { code: string; starts: number[] } {
  const sorted = [...splices].sort((a, b) => b.start - a.start);
  let next = code;
  for (const splice of sorted) next = next.slice(0, splice.start) + splice.text + next.slice(splice.end);
  const starts = splices
    .filter((splice) => splice.tag)
    .map((splice) => splice.start + splices.filter((other) => other.start < splice.start).reduce((sum, other) => sum + other.text.length - (other.end - other.start), 0));
  return { code: next, starts };
}

interface Context {
  ts: Ts;
  library: Library;
  scope: InsertScope;
  name: string;
  component: string;
  moved: Set<string>;
}

function useEdits(context: Context, uses: Use[], slots: Slot[], variants: VariantPlan | null): { files: WrittenFile[]; select: CreatePlan['select']; importFrom: string[] } {
  const byFile = new Map<string, Use[]>();
  uses.forEach((use) => byFile.set(use.target.file, [...(byFile.get(use.target.file) ?? []), use]));
  const files: WrittenFile[] = [];
  const select: CreatePlan['select'] = [];
  const importFrom: string[] = [];
  for (const group of byFile.values()) {
    const first = group[0] as Use;
    const unit = indentUnit(first.code);
    const need = { name: context.name, kind: 'named' as const, componentFile: context.component, targetFile: first.target.file, root: context.library.root, seen: seenImports(context.library.specifiers), allowPaths: context.scope.project.app?.framework === 'next' };
    const imported = planImport(context.ts, first.code, first.ast, need);
    importFrom.push(imported.specifier);
    const splices: FileEdit['splices'] = group.map((use) => ({ start: use.start, end: use.end, text: useSite(context.name, slots, variants, uses.indexOf(use), lineIndent(use.code, use.start), unit), tag: context.name }));
    if (imported.splice) splices.push(imported.splice);
    const done = applySplices(first.code, splices);
    const shift = done.code.length;
    for (const name of context.moved) done.code = removeImport(done.code, name, first.target.file);
    done.starts = done.starts.map((start) => start - (shift - done.code.length));
    if (!parseModuleFile(done.code, first.target.file)) throw new DirectEditError('parse_failed', `The new ${first.target.relative} could not be parsed, so nothing was written`);
    files.push({ target: first.target, original: first.code, code: done.code });
    for (const start of done.starts) select.push({ file: first.target.relative, ...positionAt(done.code, start), tag: context.name });
  }
  return { files, select, importFrom: [...new Set(importFrom)] };
}

function assertFreeName(library: Library, name: string): void {
  const clash = [...library.entries, ...library.locals].find((entry) => entry.name === name);
  if (clash) throw refuse(`The project already has a component named ${name} (${clash.file}). Pick another name`);
}

async function withTempFile<T>(file: string, code: string, task: () => T | Promise<T>): Promise<T> {
  await writeNewFile(file, code);
  try {
    return await task();
  } finally {
    await rm(file, { force: true });
  }
}

function kitDirs(library: Library): string[] {
  return library.scan.slice(0, -1);
}

export async function planCreateComponent(scope: InsertScope, raw: unknown): Promise<CreatePlan> {
  const request = parseCreateRequest(raw);
  if (scope.project.kind !== 'react') throw refuse('This is an HTML project. Components need a React project');
  const library = await loadLibrary(scope.project, scope.workTree);
  assertFreeName(library, request.name);
  const uses = await readUses(scope, library, request);
  const shape = compareUses(uses);
  const first = uses[0] as Use;
  const dir = folderPath(library.root, request.folder);
  const component = await fileName(dir, request.name, first.target.relative.endsWith('.tsx') ? '.tsx' : '.jsx');
  if (existsSync(component)) throw refuse(`${path.relative(library.root, component)} already exists. Pick another name or folder`);
  const { cvaAvailable, ...base } = styleOf(first, component, library.root);
  const style: FileStyle = { ...base, cva: cvaAvailable };
  const ts = await loadTypeScript();
  const appDir = kitDirs(library).some((kit) => component.startsWith(kit + path.sep)) ? (library.scan.at(-1) ?? null) : null;
  const imports = newImports(ts, first, shape.imports, component, library.root, appDir, style);
  nameSlots(shape.slots, shape.imports);
  const variants = planVariants(shape.slots, uses.length, request.name);
  const built = componentFile({ name: request.name, imports, body: bodyOf(first, shape.slots, variants, style), slots: shape.slots, variants, style });
  if (!parseModuleFile(built.code, component)) throw new DirectEditError('parse_failed', 'The new component file could not be parsed, so nothing was written');
  const context: Context = { ts, library, scope, name: request.name, component, moved: shape.imports };
  const edits = await withTempFile(component, built.code, () => useEdits(context, uses, shape.slots, variants));
  const relative = path.relative(library.root, component).split(path.sep).join('/');
  const created: WrittenFile = { target: { file: component, relative }, original: '', code: built.code, created: true };
  const title = `Create component ${request.name} from ${uses.length === 1 ? tagText(first.element.openingElement.name) : `${uses.length} elements`}`;
  return { files: [created, ...edits.files], component: created.target, name: request.name, props: built.props, variants: variants?.values ?? [], select: edits.select, importFrom: edits.importFrom, title };
}

export async function applyCreateComponent(deps: DirectEditDeps, scope: InsertScope & { direction: Direction }, raw: unknown): Promise<CreateComponentResult> {
  const { project, direction } = scope;
  parseCreateRequest(raw);
  assertCanEdit(deps, project, direction);
  const plan = await planCreateComponent(scope, raw);
  const meta: VersionMeta = { kind: 'manual', prompt: `Create component: ${plan.name} in ${plan.component.relative} (${plan.select.length} uses)` };
  const version = await writeAndCommitAll(deps, project, direction, plan.files, plan.title, meta);
  deps.history?.record({ projectId: project.id, directionId: direction.id, label: version.title, versionId: version.id, files: plan.files.map((item) => ({ file: item.target.file, relative: item.target.relative, before: item.original, after: item.code, ...(item.created ? { created: true } : {}) })) });
  await publishVersion(deps, project, direction, version);
  return { file: plan.component.relative, name: plan.name, version, title: plan.title, props: plan.props, variants: plan.variants, files: plan.files.map((item) => item.target.relative), select: plan.select, importFrom: plan.importFrom };
}

function packageName(dir: string, root: string): string | null {
  try {
    const pkg = JSON.parse(readFileSync(path.join(packageDir(path.join(dir, 'x'), root), 'package.json'), 'utf8')) as { name?: unknown };
    return typeof pkg.name === 'string' ? pkg.name : null;
  } catch {
    return null;
  }
}

export async function componentFolders(project: Project, workTree: string): Promise<ComponentFolderList> {
  if (project.kind !== 'react') return { folders: [], note: 'This is an HTML project. Components need a React project.' };
  const { root, scan } = await libraryRoots(project, workTree);
  const rel = (dir: string) => path.relative(root, dir).split(path.sep).join('/') || '.';
  const folders: ComponentFolder[] = scan.slice(0, -1).map((dir) => ({ folder: rel(dir), kind: 'kit', label: `${packageName(dir, root) ?? rel(dir)} kit` }));
  const app = scan.at(-1) ?? root;
  const appBase = path.basename(app) === 'src' ? path.dirname(app) : app;
  const candidates = [path.join(appBase, 'src', 'components'), path.join(appBase, 'components')];
  const found = candidates.find((dir) => existsSync(dir)) ?? (existsSync(path.join(appBase, 'src')) ? candidates[0] : candidates[1]);
  folders.push({ folder: rel(found as string), kind: 'app', label: 'App components' });
  return { folders, note: null };
}
