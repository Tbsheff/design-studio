import { readFile, realpath, rm } from 'node:fs/promises';
import path from 'node:path';
import type { Direction, EditHistoryEntry, EditHistoryList, EditHistoryState, Project, Version, VersionMeta } from '../../shared/contracts.js';
import { isNodeError } from '../store/errors.js';
import type { EventBus } from '../types.js';
import { emitSourceChange } from './change-feed.js';
import { DirectEditError } from './errors.js';
import { savedVersionId, savesSettled } from './save-queue.js';
import { assertCanEdit, publishVersion, saveDeferred, writeAtomic, writeNewFile, type DirectEditDeps, type EditFileChange, type EditRecord, type EditRecorder } from './index.js';

export const HISTORY_LIMIT = 100;

export type HistoryStep = 'undo' | 'redo';

export interface EditStepResult {
  state: EditHistoryState;
  version: Version;
}

export interface EditHistory extends EditRecorder {
  state(projectId: string, directionId: string): EditHistoryState;
  list?(projectId: string, directionId: string, limit: number): EditHistoryList;
  step(kind: HistoryStep, deps: DirectEditDeps, project: Project, direction: Direction): Promise<EditStepResult>;
  clear(projectId: string, directionId?: string): void;
  forget(projectId: string, directionId: string): void;
}

interface HistoryOptions {
  bus: Pick<EventBus, 'emit'>;
  onRestored?: (workTree: string, relatives: string[]) => void;
  limit?: number;
}

interface Stacks {
  undo: EditRecord[];
  redo: EditRecord[];
}

const STALE_MESSAGE = 'The file changed after this edit. Undo history was cleared.';
const STEP_WORD: Record<HistoryStep, string> = { undo: 'Undo', redo: 'Redo' };

function lastFor(records: EditRecord[], directionId: string): number {
  for (let index = records.length - 1; index >= 0; index -= 1) if (records[index]?.directionId === directionId) return index;
  return -1;
}

function stale(): DirectEditError {
  return new DirectEditError('history_stale', STALE_MESSAGE);
}

async function readOrNull(file: string): Promise<string | null> {
  try {
    return await readFile(file, 'utf8');
  } catch (error) {
    if (isNodeError(error) && (error.code === 'ENOENT' || error.code === 'ENOTDIR')) return null;
    throw error;
  }
}

async function resolveFiles(workTree: string, record: EditRecord): Promise<string[] | null> {
  const root = await realpath(workTree);
  const files: string[] = [];
  for (const change of record.files) {
    const candidate = path.resolve(root, change.relative);
    if (!candidate.startsWith(root + path.sep)) return null;
    const real = await realpath(candidate).catch(() => null);
    const placed = real ?? (change.created ? await createdPath(candidate) : null);
    if (placed === null || !placed.startsWith(root + path.sep)) return null;
    files.push(placed);
  }
  return files;
}

async function createdPath(candidate: string): Promise<string | null> {
  const dir = await realpath(path.dirname(candidate)).catch(() => null);
  return dir === null ? null : path.join(dir, path.basename(candidate));
}

async function writeText(file: string, text: string | null): Promise<void> {
  if (text === null) await rm(file, { force: true });
  else if ((await readOrNull(file)) === null) await writeNewFile(file, text);
  else await writeAtomic(file, text);
}

async function writeInReverse(files: string[], texts: (string | null)[]): Promise<void> {
  for (let index = files.length - 1; index >= 0; index -= 1) await writeText(files[index] ?? '', texts[index] ?? null);
}

function textBefore(change: EditFileChange): string | null {
  return change.created ? null : change.before;
}

function stepMeta(kind: HistoryStep, record: EditRecord): VersionMeta {
  return { kind: 'manual', prompt: `${STEP_WORD[kind]} of "${record.label}" (${record.files.map((change) => change.relative).join(', ')})` };
}

export function createEditHistory(options: HistoryOptions): EditHistory {
  const limit = options.limit ?? HISTORY_LIMIT;
  const projects = new Map<string, Stacks>();

  const stacksOf = (projectId: string): Stacks => {
    let stacks = projects.get(projectId);
    if (!stacks) {
      stacks = { undo: [], redo: [] };
      projects.set(projectId, stacks);
    }
    return stacks;
  };

  const changed = (projectId: string, directionId: string): void => {
    options.bus.emit({ type: 'edit-history.changed', projectId, directionId });
  };

  const push = (records: EditRecord[], record: EditRecord): void => {
    records.push(record);
    if (records.length > limit) records.splice(0, records.length - limit);
  };

  const state = (projectId: string, directionId: string): EditHistoryState => {
    const stacks = projects.get(projectId);
    const undo = stacks ? stacks.undo[lastFor(stacks.undo, directionId)] : undefined;
    const redo = stacks ? stacks.redo[lastFor(stacks.redo, directionId)] : undefined;
    return { canUndo: undo !== undefined, canRedo: redo !== undefined, undoLabel: undo?.label ?? null, redoLabel: redo?.label ?? null };
  };

  const list = (projectId: string, directionId: string, max: number): EditHistoryList => {
    const stacks = projects.get(projectId);
    const entries = (records: EditRecord[]): EditHistoryEntry[] =>
      records
        .filter((record) => record.directionId === directionId)
        .slice(-max)
        .reverse()
        .map((record) => ({ label: record.label, versionId: savedVersionId(record.versionId), files: record.files.map((change) => change.relative) }));
    return { undo: entries(stacks?.undo ?? []), redo: entries(stacks?.redo ?? []) };
  };

  const clear = (projectId: string, directionId?: string): void => {
    const stacks = projects.get(projectId);
    if (!stacks) return;
    stacks.undo.length = 0;
    stacks.redo.length = 0;
    if (directionId !== undefined) changed(projectId, directionId);
  };

  const forget = (projectId: string, directionId: string): void => {
    const stacks = projects.get(projectId);
    if (stacks) {
      stacks.undo = stacks.undo.filter((entry) => entry.directionId !== directionId);
      stacks.redo = stacks.redo.filter((entry) => entry.directionId !== directionId);
    }
    changed(projectId, directionId);
  };

  const commitStep = async (kind: HistoryStep, deps: DirectEditDeps, project: Project, direction: Direction, record: EditRecord, files: string[]): Promise<Version> => {
    const wanted = (change: EditFileChange) => (kind === 'undo' ? textBefore(change) : change.after);
    const current = (change: EditFileChange) => (kind === 'undo' ? change.after : textBefore(change));
    try {
      await writeInReverse(files, record.files.map(wanted));
    } catch (error) {
      await writeInReverse(files, record.files.map(current)).catch((restoreError: unknown) => console.error('[history] could not restore files', restoreError));
      throw error;
    }
    return saveDeferred(deps, project, direction, record.files.map((change) => change.relative), `${STEP_WORD[kind]}: ${record.label}`, stepMeta(kind, record));
  };

  const step = async (kind: HistoryStep, deps: DirectEditDeps, project: Project, direction: Direction): Promise<EditStepResult> => {
    assertCanEdit(deps, project, direction);
    await savesSettled(project.id);
    const stacks = stacksOf(project.id);
    const from = kind === 'undo' ? stacks.undo : stacks.redo;
    const index = lastFor(from, direction.id);
    const record = from[index];
    if (!record) throw new DirectEditError('history_empty', kind === 'undo' ? 'Nothing to undo' : 'Nothing to redo');
    const files = await resolveFiles(direction.workTree, record);
    const texts = files === null ? [] : await Promise.all(files.map(readOrNull));
    const expected = record.files.map((change) => (kind === 'undo' ? change.after : textBefore(change)));
    if (files === null || texts.some((text, position) => text !== expected[position])) {
      clear(project.id, direction.id);
      throw stale();
    }
    const version = await commitStep(kind, deps, project, direction, record, files);
    emitSourceChange({ projectId: project.id, directionId: direction.id, files: record.files.map((change) => (kind === 'undo' ? { relative: change.relative, before: change.after, after: change.before } : change)) });
    from.splice(index, 1);
    push(kind === 'undo' ? stacks.redo : stacks.undo, { ...record, versionId: version.id });
    options.onRestored?.(direction.workTree, record.files.map((change) => change.relative));
    await publishVersion(deps, project, direction, version);
    changed(project.id, direction.id);
    return { state: state(project.id, direction.id), version };
  };

  const record = (entry: EditRecord): void => {
    const files = entry.files.filter((change) => change.before !== change.after);
    if (files.length === 0) return;
    emitSourceChange({ projectId: entry.projectId, directionId: entry.directionId, files });
    const stacks = stacksOf(entry.projectId);
    push(stacks.undo, { ...entry, files });
    for (let index = stacks.redo.length - 1; index >= 0; index -= 1) if (stacks.redo[index]?.directionId === entry.directionId) stacks.redo.splice(index, 1);
    changed(entry.projectId, entry.directionId);
  };

  return { record, state, list, step, clear, forget };
}
