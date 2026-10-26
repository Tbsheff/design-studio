import { randomBytes } from 'node:crypto';
import { readFile, realpath, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Direction, DirectEditRequest, DirectEditResult, Project, Version, VersionMeta } from '../../shared/contracts.js';
import { isNodeError } from '../store/errors.js';
import type { AgentRunner, EventBus, ProjectStore, VersionStore } from '../types.js';
import { DirectEditError } from './errors.js';
import type { PatchResult } from './errors.js';
import { patchHtml } from './html.js';
import { patchJsx } from './jsx.js';
import { assertKnownTokens, knownTokenVars } from './tokens.js';
import { parseDirectEditRequest } from './validate.js';

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

export function patchSource(relative: string, source: string, request: DirectEditRequest): PatchResult {
  const extension = path.extname(relative).toLowerCase();
  const edit = { style: request.style ?? {}, text: request.text, tag: request.tag, name: request.name, move: request.move, insert: request.insert };
  const position = { line: request.source.line, col: request.source.col };
  if (extension === '.html' || extension === '.htm') return patchHtml(source, position, edit);
  return patchJsx(source, position, edit, { typescript: extension === '.tsx' });
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
  if (request.move !== undefined) return `Move ${tag} ${request.move}`;
  if (request.insert !== undefined) return `Add ${INSERT_LABEL[request.insert].toLowerCase()} to ${tag}`;
  const visibility = visibilityTitle(tag, request.style);
  if (visibility && request.text === undefined && request.name === undefined) return visibility;
  if (request.name !== undefined && applied.style.length === 0 && !applied.text) {
    return request.name === null ? `Remove name of ${tag}` : `Rename ${tag} to ${request.name}`;
  }
  if (applied.style.length === 0) return `Edit text of ${tag}`;
  const parts = applied.text ? [...applied.style, 'text'] : applied.style;
  return `Edit ${tag}: ${parts.join(', ')}`;
}

export function editSummary(request: DirectEditRequest): string {
  const parts = Object.entries(request.style ?? {}).map(([prop, value]) => (value === null ? `remove ${prop}` : `${prop}: ${value}`));
  if (request.text !== undefined) {
    const text = request.text.length > MAX_SUMMARY_TEXT ? `${request.text.slice(0, MAX_SUMMARY_TEXT - 1)}…` : request.text;
    parts.push(`text: "${text}"`);
  }
  if (request.name !== undefined) parts.push(request.name === null ? 'remove name' : `name: "${request.name}"`);
  if (request.move !== undefined) parts.push(`move ${request.move}`);
  if (request.insert !== undefined) parts.push(`insert ${request.insert}`);
  return `Direct edit of ${request.source.file}:${request.source.line}:${request.source.col}: ${parts.join('; ')}`;
}

export async function publishVersion(deps: DirectEditDeps, project: Project, direction: Direction, version: Version): Promise<void> {
  deps.bus.emit({ type: 'version.created', projectId: project.id, directionId: direction.id, version });
  const updated = await deps.projects.updateDirection(project.id, direction.id, { headVersionId: version.id });
  deps.bus.emit({ type: 'direction.updated', projectId: project.id, directionId: direction.id, direction: updated });
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
  return { file: relative, version, applied: patch.applied };
}

async function writeAndCommit(
  deps: DirectEditDeps,
  project: Project,
  direction: Direction,
  target: ResolvedSource,
  original: string,
  patch: PatchResult,
  request: DirectEditRequest,
): Promise<Version> {
  await writeAtomic(target.file, patch.code);
  const meta: VersionMeta = { kind: 'manual', prompt: editSummary(request) };
  let version: Version | null;
  try {
    version = await deps.versions.commitFile(project, direction, target.relative, editTitle(patch.tag, patch.applied, request), meta);
  } catch (error) {
    await writeAtomic(target.file, original);
    throw error;
  }
  if (version === null) {
    await writeAtomic(target.file, original);
    throw new DirectEditError('no_change', 'The edit did not change any tracked file');
  }
  return version;
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

export async function planDirectEdit(workTree: string, request: DirectEditRequest, known: Set<string> | null): Promise<PlannedEdit> {
  assertKnownTokens(request.style, known);
  const target = await resolveSource(workTree, request.source.file);
  const original = await readFile(target.file, 'utf8');
  return { request, target, original, patch: patchSource(target.relative, original, request) };
}

export async function applyDirectEdit(deps: DirectEditDeps, project: Project, direction: Direction, raw: unknown): Promise<DirectEditResult> {
  const request = parseDirectEditRequest(raw);
  const headVersionId = assertCanEdit(deps, project, direction);
  const plan = await planDirectEdit(direction.workTree, request, await knownTokenVars(direction.workTree));
  const { target, original, patch } = plan;
  if (patch.code === original) return unchangedResult(deps, project, headVersionId, target.relative, patch);
  const version = await writeAndCommit(deps, project, direction, target, original, patch, request);
  deps.history?.record({
    projectId: project.id,
    directionId: direction.id,
    label: version.title,
    versionId: version.id,
    files: [{ file: target.file, relative: target.relative, before: original, after: patch.code }],
  });
  await publishVersion(deps, project, direction, version);
  return { file: target.relative, version, applied: patch.applied, ...movedLoc(request.source.file, patch) };
}

function movedLoc(file: string, patch: PatchResult): Pick<DirectEditResult, 'moved'> {
  return patch.moved ? { moved: { file, line: patch.moved.line, col: patch.moved.col } } : {};
}
