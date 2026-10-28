import { randomBytes } from 'node:crypto';
import { readFile, realpath, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Direction, DirectEditRequest, DirectEditResult, Project, Version, VersionMeta } from '../../shared/contracts.js';
import { variantLabel } from '../../shared/variants.js';
import { isNodeError } from '../store/errors.js';
import type { AgentRunner, EventBus, ProjectStore, VersionStore } from '../types.js';
import { DirectEditError } from './errors.js';
import type { PatchResult } from './errors.js';
import { patchHtml } from './html.js';
import { hasClassChange } from './classes.js';
import { patchJsx } from './jsx.js';
import { findTextSource } from './text-source.js';
import { tailwindThemeFor, type TailwindTheme } from './tailwind/theme.js';
import { assertKnownTokens, knownTokenVars } from './tokens.js';
import { parseDirectEditRequest } from './validate.js';
import { isPendingVersion, saveLater } from './save-queue.js';

export { DirectEditError } from './errors.js';
export { parseDirectEditRequest } from './validate.js';

export interface EditFileChange {
  file: string;
  relative: string;
  before: string;
  after: string;
}

export interface EditRecord {
  projectId: string;
  directionId: string;
  label: string;
  versionId: string;
  files: EditFileChange[];
}

export interface EditRecorder {
  record(entry: EditRecord): void;
}

export interface DirectEditDeps {
  bus: EventBus;
  projects: Pick<ProjectStore, 'updateDirection'>;
  versions: VersionStore;
  runner: Pick<AgentRunner, 'isRunning'>;
  history?: EditRecorder;
  previewOrigin?: (project: Project, direction: Direction) => Promise<string | null>;
}

export interface ResolvedSource {
  file: string;
  relative: string;
}

export interface PlannedEdit {
  request: DirectEditRequest;
  target: ResolvedSource;
  original: string;
  patch: PatchResult;
}

const EDITABLE_EXTENSIONS = new Set(['.html', '.htm', '.jsx', '.tsx']);
const BLOCKED_SEGMENTS = new Set(['node_modules', '.git', 'dist', '.vite', '.studio']);
const MAX_SUMMARY_TEXT = 120;
const INSERT_LABEL = { text: 'Text', frame: 'Frame', rect: 'Rectangle', ellipse: 'Ellipse' } as const;

function invalidSource(message: string): DirectEditError {
  return new DirectEditError('invalid_source', message);
}

function assertEditablePath(file: string): void {
  if (file.includes('\0')) throw invalidSource('The source path is not valid');
  if (!EDITABLE_EXTENSIONS.has(path.extname(file).toLowerCase())) {
    throw invalidSource('Only .html, .htm, .jsx and .tsx files can be edited directly');
  }
}

async function realOrMissing(candidate: string): Promise<string> {
  try {
    return await realpath(candidate);
  } catch (error) {
    if (isNodeError(error) && (error.code === 'ENOENT' || error.code === 'ENOTDIR')) {
      throw new DirectEditError('source_not_found', 'The source file does not exist');
    }
    throw error;
  }
}

function isInside(root: string, target: string): boolean {
  return target.startsWith(root + path.sep);
}

export async function resolveSource(workTree: string, file: string): Promise<ResolvedSource> {
  assertEditablePath(file);
  const root = await realpath(workTree);
  const candidate = path.resolve(root, file);
  if (!isInside(root, candidate)) throw invalidSource('The source file is outside the direction');
  const real = await realOrMissing(candidate);
  if (!isInside(root, real)) throw invalidSource('The source file is outside the direction');
  const segments = path.relative(root, real).split(path.sep);
  if (segments.some((segment) => BLOCKED_SEGMENTS.has(segment.toLowerCase()))) throw invalidSource('The source file is in a folder that cannot be edited');
  assertEditablePath(real);
  if (!(await stat(real)).isFile()) throw invalidSource('The source path is not a file');
  return { file: real, relative: segments.join('/') };
}

export function patchSource(relative: string, source: string, request: DirectEditRequest, tailwind: TailwindTheme | null = null): PatchResult {
  const extension = path.extname(relative).toLowerCase();
  const edit = { style: request.style ?? {}, text: request.text, tag: request.tag, name: request.name, move: request.move, insert: request.insert, classes: request.classes, component: request.component, variant: request.variant };
  const position = { line: request.source.line, col: request.source.col };
  if (extension === '.html' || extension === '.htm') {
    if (request.component !== undefined) throw new DirectEditError('invalid_request', 'Component uses can be edited in .jsx and .tsx files only');
    return patchHtml(source, position, edit, tailwind);
  }
  return patchJsx(source, position, edit, { typescript: extension === '.tsx', tailwind, file: relative });
}

export interface EditScope {
  projectKind: Project['kind'];
  previewOrigin?: () => Promise<string | null>;
}

export async function themeForFile(workTree: string, relative: string, text: string, scope: EditScope | undefined): Promise<TailwindTheme | null> {
  if (!scope) return null;
  return tailwindThemeFor(workTree, { relative, text }, scope);
}

export async function writeAtomic(file: string, content: string): Promise<void> {
  const temp = path.join(path.dirname(file), `.${path.basename(file)}.studio-${randomBytes(4).toString('hex')}.tmp`);
  const { mode } = await stat(file);
  await writeFile(temp, content, { mode });
  try {
    await rename(temp, file);
  } catch (error) {
    await rm(temp, { force: true });
    throw error;
  }
}

function visibilityTitle(tag: string, style: DirectEditRequest['style']): string | null {
  const entries = Object.entries(style ?? {});
  if (entries.length !== 1 || entries[0]?.[0] !== 'display') return null;
  const value = entries[0][1];
  if (value === 'none') return `Hide ${tag}`;
  return value === null ? `Show ${tag}` : null;
}

function editTitle(tag: string, applied: PatchResult['applied'], request: DirectEditRequest): string {
  const title = baseTitle(tag, applied, request);
  return request.variant ? `${title} (${variantLabel(request.variant)})` : title;
}

function baseTitle(tag: string, applied: PatchResult['applied'], request: DirectEditRequest): string {
  if (request.move !== undefined) return `Move ${tag} ${request.move}`;
  if (request.insert !== undefined) return `Add ${INSERT_LABEL[request.insert].toLowerCase()} to ${tag}`;
  const visibility = visibilityTitle(tag, request.style);
  if (visibility && request.text === undefined && request.name === undefined) return visibility;
  if (request.name !== undefined && applied.style.length === 0 && !applied.text && !applied.classes) {
    return request.name === null ? `Remove name of ${tag}` : `Rename ${tag} to ${request.name}`;
  }
  if (applied.style.length === 0 && !applied.classes) return `Edit text of ${tag}`;
  const parts = [...applied.style, ...(applied.classes ? ['classes'] : []), ...(applied.text ? ['text'] : [])];
  return `Edit ${tag}: ${parts.join(', ')}`;
}

function otherParts(request: DirectEditRequest): string[] {
  const parts: string[] = [];
  if (request.name !== undefined) parts.push(request.name === null ? 'remove name' : `name: "${request.name}"`);
  if (request.move !== undefined) parts.push(`move ${request.move}`);
  if (request.insert !== undefined) parts.push(`insert ${request.insert}`);
  if (request.variant) parts.push(`variant ${request.variant}`);
  return parts;
}

export function editSummary(request: DirectEditRequest): string {
  const parts = Object.entries(request.style ?? {}).map(([prop, value]) => (value === null ? `remove ${prop}` : `${prop}: ${value}`));
  if (request.text !== undefined) {
    const text = request.text.length > MAX_SUMMARY_TEXT ? `${request.text.slice(0, MAX_SUMMARY_TEXT - 1)}…` : request.text;
    parts.push(`text: "${text}"`);
  }
  if (request.classes?.add?.length) parts.push(`add class ${request.classes.add.join(' ')}`);
  if (request.classes?.remove?.length) parts.push(`remove class ${request.classes.remove.join(' ')}`);
  parts.push(...otherParts(request));
  for (const token of request.classes?.add ?? []) parts.push(`add class ${token}`);
  for (const token of request.classes?.remove ?? []) parts.push(`remove class ${token}`);
  return `Direct edit of ${request.source.file}:${request.source.line}:${request.source.col}: ${parts.join('; ')}`;
}

export async function publishVersion(deps: DirectEditDeps, project: Project, direction: Direction, version: Version, withStatus = true): Promise<void> {
  if (isPendingVersion(version)) return;
  deps.bus.emit({ type: 'version.created', projectId: project.id, directionId: direction.id, version });
  const updated = await deps.projects.updateDirection(project.id, direction.id, { headVersionId: version.id });
  deps.bus.emit({ type: 'direction.updated', projectId: project.id, directionId: direction.id, direction: updated });
  if (!withStatus) return;
  const status = await deps.versions.status(project, direction);
  deps.bus.emit({ type: 'status.changed', projectId: project.id, directionId: direction.id, status });
}

async function unchangedResult(
  deps: DirectEditDeps,
  project: Project,
  headVersionId: string,
  relative: string,
  patch: PatchResult,
): Promise<DirectEditResult> {
  const version = await deps.versions.get(project, headVersionId);
  return { file: relative, version, applied: patch.applied, ...(patch.tailwind ? { tailwind: patch.tailwind } : {}) };
}

export function saveDeferred(deps: DirectEditDeps, project: Project, direction: Direction, relatives: string[], title: string, meta: VersionMeta): Version {
  return saveLater({ versions: deps.versions, publish: (p, d, version, withStatus) => publishVersion(deps, p, d, version, withStatus) }, project, direction, relatives, title, meta);
}

async function writeAndCommit(deps: DirectEditDeps, project: Project, direction: Direction, target: ResolvedSource, patch: PatchResult, request: DirectEditRequest): Promise<Version> {
  await writeAtomic(target.file, patch.code);
  return saveDeferred(deps, project, direction, [target.relative], editTitle(patch.tag, patch.applied, request), { kind: 'manual', prompt: editSummary(request) });
}

export function assertCanEdit(deps: Pick<DirectEditDeps, 'runner'>, project: Project, direction: Direction): string {
  if (deps.runner.isRunning(project.id, direction.id)) {
    throw new DirectEditError('run_in_progress', 'The agent is editing this direction; wait for the run to finish');
  }
  if (direction.headVersionId === null) {
    throw new DirectEditError('no_base_version', 'This direction has no saved version yet; keep or discard the unfinished changes first');
  }
  return direction.headVersionId;
}

export async function planDirectEdit(workTree: string, request: DirectEditRequest, known: Set<string> | null, scope?: EditScope): Promise<PlannedEdit> {
  assertKnownTokens(request.style, known);
  const target = await resolveSource(workTree, request.source.file);
  const original = await readFile(target.file, 'utf8');
  const theme = await themeForFile(workTree, target.relative, original, scope);
  try {
    return { request, target, original, patch: patchSource(target.relative, original, request, theme) };
  } catch (error) {
    if (!isDataText(error, request)) throw error;
    return planTextSource(workTree, request, (await scope?.previewOrigin?.().catch(() => null)) ?? null, error);
  }
}

function isDataText(error: unknown, request: DirectEditRequest): error is DirectEditError {
  const onlyText = request.text !== undefined && Object.keys(request.style ?? {}).length === 0 && !hasClassChange(request.classes) && request.name === undefined;
  return onlyText && error instanceof DirectEditError && error.code === 'text_from_data';
}

async function planTextSource(workTree: string, request: DirectEditRequest, previewOrigin: string | null, error: DirectEditError): Promise<PlannedEdit> {
  const lookup = await findTextSource({ workTree, previewOrigin }, request.source, request.hints ?? null);
  if ('reason' in lookup) throw new DirectEditError('text_from_data', `${error.message.replace(/ Change the data there, or ask the agent\.$/, '')} ${lookup.reason} Ask the agent to change it.`);
  const { hit } = lookup;
  const code = hit.write(request.text ?? '');
  const patch: PatchResult = { code, tag: request.tag ?? 'text', applied: { style: [], text: true }, textSource: hit.info };
  return { request, target: { file: hit.file, relative: hit.relative }, original: hit.original, patch };
}

export async function applyDirectEdit(deps: DirectEditDeps, project: Project, direction: Direction, raw: unknown): Promise<DirectEditResult> {
  const request = parseDirectEditRequest(raw);
  const headVersionId = assertCanEdit(deps, project, direction);
  const previewOrigin = deps.previewOrigin ? () => (deps.previewOrigin as NonNullable<DirectEditDeps['previewOrigin']>)(project, direction) : undefined;
  const plan = await planDirectEdit(direction.workTree, request, await knownTokenVars(direction.workTree), { projectKind: project.kind, ...(previewOrigin ? { previewOrigin } : {}) });
  const { target, original, patch } = plan;
  if (patch.code === original) return unchangedResult(deps, project, headVersionId, target.relative, patch);
  const version = await writeAndCommit(deps, project, direction, target, patch, request);
  deps.history?.record({
    projectId: project.id,
    directionId: direction.id,
    label: version.title,
    versionId: version.id,
    files: [{ file: target.file, relative: target.relative, before: original, after: patch.code }],
  });
  await publishVersion(deps, project, direction, version);
  return { file: target.relative, version, applied: patch.applied, ...movedLoc(request.source.file, patch), ...(patch.tailwind ? { tailwind: patch.tailwind } : {}), ...(patch.textSource ? { textSource: patch.textSource } : {}) };
}

function movedLoc(file: string, patch: PatchResult): Pick<DirectEditResult, 'moved'> {
  return patch.moved ? { moved: { file, line: patch.moved.line, col: patch.moved.col } } : {};
}
