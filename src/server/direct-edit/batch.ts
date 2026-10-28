import { readFile } from 'node:fs/promises';
import type { Direction, DirectEditBatchResult, DirectEditRequest, Project, Version, VersionMeta } from '../../shared/contracts.js';
import { DirectEditError } from './errors.js';
import { assertCanEdit, editSummary, patchSource, publishVersion, resolveSource, writeAtomic } from './index.js';
import type { DirectEditDeps, ResolvedSource } from './index.js';
import { assertKnownTokens, knownTokenVars } from './tokens.js';
import { parseDirectEditBatch } from './validate.js';

interface FileGroup {
  target: ResolvedSource;
  original: string;
  code: string;
  edits: { index: number; request: DirectEditRequest }[];
}

type AppliedEdit = DirectEditBatchResult['applied'][number];

const MAX_PROMPT = 4000;

function byPositionFromEnd(a: { request: DirectEditRequest }, b: { request: DirectEditRequest }): number {
  return b.request.source.line - a.request.source.line || b.request.source.col - a.request.source.col;
}

async function groupByFile(workTree: string, edits: DirectEditRequest[], known: Set<string> | null): Promise<FileGroup[]> {
  const groups = new Map<string, FileGroup>();
  for (const [index, request] of edits.entries()) {
    assertKnownTokens(request.style, known);
    const target = await resolveSource(workTree, request.source.file);
    let group = groups.get(target.file);
    if (!group) {
      const original = await readFile(target.file, 'utf8');
      group = { target, original, code: original, edits: [] };
      groups.set(target.file, group);
    }
    group.edits.push({ index, request });
  }
  return [...groups.values()];
}

function patchGroups(groups: FileGroup[], applied: AppliedEdit[], tags: string[]): void {
  for (const group of groups) {
    for (const { index, request } of [...group.edits].sort(byPositionFromEnd)) {
      const patch = patchSource(group.target.relative, group.code, request);
      group.code = patch.code;
      applied[index] = { file: group.target.relative, ...patch.applied };
      tags[index] = patch.tag;
    }
  }
}

function batchTitle(applied: AppliedEdit[], tags: string[]): string {
  const style = [...new Set(applied.flatMap((entry) => entry.style))];
  const classes = applied.some((entry) => entry.classes);
  const parts = [...style, ...(classes ? ['classes'] : []), ...(applied.some((entry) => entry.text) ? ['text'] : [])];
  const subject = applied.length === 1 ? (tags[0] ?? 'element') : `${applied.length} elements`;
  if (style.length === 0 && !classes) return `Edit text of ${subject}`;
  return `Edit ${subject}: ${parts.join(', ')}`;
}

function batchPrompt(edits: DirectEditRequest[]): string {
  const prompt = edits.map(editSummary).join('\n');
  return prompt.length > MAX_PROMPT ? `${prompt.slice(0, MAX_PROMPT - 1)}…` : prompt;
}

export type WrittenFile = Pick<FileGroup, 'target' | 'original' | 'code'>;

async function restoreOriginals(groups: WrittenFile[]): Promise<void> {
  const results = await Promise.allSettled(groups.map((group) => writeAtomic(group.target.file, group.original)));
  const failed = results.filter((result) => result.status === 'rejected').length;
  if (failed > 0) console.error(`direct edit batch: could not restore ${failed} file(s) after a failed edit`);
}

export async function writeAndCommitAll(
  deps: DirectEditDeps,
  project: Project,
  direction: Direction,
  changed: WrittenFile[],
  title: string,
  meta: VersionMeta,
): Promise<Version> {
  const written: WrittenFile[] = [];
  try {
    for (const group of changed) {
      written.push(group);
      await writeAtomic(group.target.file, group.code);
    }
    const version = await deps.versions.commitFile(project, direction, changed.map((group) => group.target.relative), title, meta);
    if (version === null) throw new DirectEditError('no_change', 'The edits did not change any tracked file');
    return version;
  } catch (error) {
    await restoreOriginals(written);
    throw error;
  }
}

export async function applyDirectEditBatch(deps: DirectEditDeps, project: Project, direction: Direction, raw: unknown): Promise<DirectEditBatchResult> {
  const { edits } = parseDirectEditBatch(raw);
  const headVersionId = assertCanEdit(deps, project, direction);
  const groups = await groupByFile(direction.workTree, edits, await knownTokenVars(direction.workTree));
  const applied: AppliedEdit[] = new Array<AppliedEdit>(edits.length);
  const tags: string[] = new Array<string>(edits.length);
  patchGroups(groups, applied, tags);
  const changed = groups.filter((group) => group.code !== group.original);
  if (changed.length === 0) return { files: [], version: await deps.versions.get(project, headVersionId), applied };
  const meta: VersionMeta = { kind: 'manual', prompt: batchPrompt(edits) };
  const version = await writeAndCommitAll(deps, project, direction, changed, batchTitle(applied, tags), meta);
  deps.history?.record({
    projectId: project.id,
    directionId: direction.id,
    label: version.title,
    versionId: version.id,
    files: changed.map((group) => ({ file: group.target.file, relative: group.target.relative, before: group.original, after: group.code })),
  });
  await publishVersion(deps, project, direction, version);
  return { files: changed.map((group) => group.target.relative), version, applied };
}
