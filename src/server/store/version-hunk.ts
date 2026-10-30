import { readFile } from 'node:fs/promises';
import type { Direction, Project, VersionFileDiff } from '../../shared/contracts.js';
import { hunkSides, splitHunks, type HunkRevertRequest, type HunkRevertResult, type PatchHunk } from '../../shared/hunk.js';
import { assertCanEdit, publishVersion, resolveSource, saveDeferred, writeAtomic, type DirectEditDeps } from '../direct-edit/index.js';
import { savesSettled } from '../direct-edit/save-queue.js';
import { BadRequestError, ConflictError, NotFoundError, isNodeError } from './errors.js';

export class HunkStaleError extends ConflictError {}

const STALE = 'This change is no longer in the file. It was undone or edited after this version.';

function lineOffsets(text: string): number[] {
  const offsets = [0];
  for (let at = text.indexOf('\n'); at !== -1; at = text.indexOf('\n', at + 1)) offsets.push(at + 1);
  return offsets;
}

function matchesAt(text: string, block: string, starts: Set<number>): number[] {
  const found: number[] = [];
  for (let at = text.indexOf(block); at !== -1; at = text.indexOf(block, at + 1)) if (starts.has(at)) found.push(at);
  return found;
}

export function reverseHunk(current: string, hunk: PatchHunk): string {
  const { before, after } = hunkSides(hunk);
  if (after === '') {
    if (current !== '') throw new HunkStaleError(STALE);
    return before;
  }
  const offsets = lineOffsets(current);
  const found = matchesAt(current, after, new Set(offsets));
  if (found.length === 0) throw new HunkStaleError(STALE);
  const expected = offsets[Math.max(0, hunk.newStart - 1)] ?? current.length;
  const at = found.reduce((best, item) => (Math.abs(item - expected) < Math.abs(best - expected) ? item : best));
  return current.slice(0, at) + before + current.slice(at + after.length);
}

function pickFile(files: VersionFileDiff[], file: string): VersionFileDiff {
  const entry = files.find((item) => item.path === file);
  if (!entry) throw new NotFoundError(`${file} has no changes between these versions.`);
  if (entry.binary) throw new BadRequestError(`${file} is a binary file. Restore the version to undo it.`);
  if (entry.status === 'removed') throw new BadRequestError(`${file} was removed in this version. Restore the version to bring it back.`);
  return entry;
}

function pickHunk(entry: VersionFileDiff, index: number): PatchHunk {
  const hunks = splitHunks(entry.patch);
  const hunk = hunks[index - 1];
  if (!hunk) throw new NotFoundError(`${entry.path} has ${hunks.length} ${hunks.length === 1 ? 'change' : 'changes'}, not ${index}.`);
  if (!hunk.complete) throw new BadRequestError(`Change ${index} in ${entry.path} is cut from the diff because the file diff is too long.`);
  return hunk;
}

async function readText(file: string): Promise<string> {
  try {
    return await readFile(file, 'utf8');
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') throw new HunkStaleError(`${STALE} The file is gone.`);
    throw error;
  }
}

async function baseOf(deps: DirectEditDeps, project: Project, request: HunkRevertRequest): Promise<string> {
  if (request.from) return request.from;
  const version = await deps.versions.get(project, request.to);
  if (!version.parentId) throw new BadRequestError('This version is the first one. It has no earlier version to compare with.');
  return version.parentId;
}

export async function revertHunk(deps: DirectEditDeps, project: Project, direction: Direction, request: HunkRevertRequest): Promise<HunkRevertResult> {
  assertCanEdit(deps, project, direction);
  if (!deps.versions.diffFiles) throw new BadRequestError('Version diffs are not available.');
  const from = await baseOf(deps, project, request);
  const changes = await deps.versions.diffFiles(project, from, request.to);
  const hunk = pickHunk(pickFile(changes.files, request.file), request.hunk);
  await savesSettled(project.id);
  const target = await resolveSource(direction.workTree, request.file);
  const original = await readText(target.file);
  const next = reverseHunk(original, hunk);
  await writeAtomic(target.file, next);
  const title = `Undo change ${request.hunk} in ${target.relative.split('/').pop()}`;
  const version = saveDeferred(deps, project, direction, [target.relative], title, { kind: 'manual', prompt: `${title} (${hunk.header.replace(/^(@@[^@]*@@).*$/, '$1')}), from the compare of ${from.slice(0, 7)} and ${request.to.slice(0, 7)}` });
  deps.history?.record({ projectId: project.id, directionId: direction.id, label: title, versionId: version.id, files: [{ file: target.file, relative: target.relative, before: original, after: next }] });
  await publishVersion(deps, project, direction, version);
  return { version, file: target.relative, hunk: request.hunk, from, to: request.to };
}
