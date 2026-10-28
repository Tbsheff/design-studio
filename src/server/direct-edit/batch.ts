import { readFile, realpath, rm } from 'node:fs/promises';
import type { Direction, DirectEditBatchResult, DirectEditRequest, Project, TextSourceInfo, Version, VersionMeta } from '../../shared/contracts.js';
import { DirectEditError } from './errors.js';
import { savesSettled } from './save-queue.js';
import { announceWhile, assertCanEdit, editSummary, patchSource, planDirectEdit, publishVersion, saveDeferred, themeForFile, writeAtomic, writeNewFile } from './index.js';
import type { DirectEditDeps, EditScope, PlannedEdit, ResolvedSource } from './index.js';
import type { TailwindTheme } from './tailwind/theme.js';
import { knownTokenVars } from './tokens.js';
import { parseDirectEditBatch } from './validate.js';
import { domPatchOf } from './planned-feed.js';

interface TextSplice {
  index: number;
  start: number;
  end: number;
  text: string;
  tag: string;
  textSource: TextSourceInfo;
}

interface FileGroup {
  target: ResolvedSource;
  original: string;
  code: string;
  theme: TailwindTheme | null;
  edits: { index: number; request: DirectEditRequest }[];
  splices: TextSplice[];
}

type AppliedEdit = DirectEditBatchResult['applied'][number];
type Step = { at: number; edit: FileGroup['edits'][number] } | { at: number; splice: TextSplice };

const MAX_PROMPT = 4000;

function spliceOf(plan: PlannedEdit, index: number, textSource: TextSourceInfo): TextSplice {
  const before = plan.original;
  const after = plan.patch.code;
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start += 1;
  let tail = 0;
  while (tail < before.length - start && tail < after.length - start && before[before.length - 1 - tail] === after[after.length - 1 - tail]) tail += 1;
  return { index, start, end: before.length - tail, text: after.slice(start, after.length - tail), tag: plan.patch.tag, textSource };
}

function withIndex(index: number, error: unknown): unknown {
  if (!(error instanceof DirectEditError) || /^Edits? \d/.test(error.message)) return error;
  return new DirectEditError(error.code, `Edit ${index + 1}: ${error.message}`, error.status);
}

async function numbered<T>(index: number, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    throw withIndex(index, error);
  }
}

function numberedSync<T>(index: number, run: () => T): T {
  try {
    return run();
  } catch (error) {
    throw withIndex(index, error);
  }
}

async function groupFor(groups: Map<string, FileGroup>, workTree: string, target: ResolvedSource, scope: EditScope): Promise<FileGroup> {
  const key = await realpath(target.file).catch(() => target.file);
  let group = groups.get(key);
  if (!group) {
    const original = await readFile(target.file, 'utf8');
    group = { target, original, code: original, theme: await themeForFile(workTree, target.relative, original, scope), edits: [], splices: [] };
    groups.set(key, group);
  }
  return group;
}

async function groupByFile(workTree: string, edits: DirectEditRequest[], known: Set<string> | null, scope: EditScope): Promise<FileGroup[]> {
  const groups = new Map<string, FileGroup>();
  for (const [index, request] of edits.entries()) {
    const plan = await numbered(index, () => planDirectEdit(workTree, request, known, scope));
    const group = await groupFor(groups, workTree, plan.target, scope);
    const textSource = plan.patch.textSource;
    if (!textSource) {
      group.edits.push({ index, request });
      continue;
    }
    if (plan.original !== group.original) throw new DirectEditError('text_not_editable', `Edit ${index + 1}: ${plan.target.relative} changed while the batch was read. Try again.`);
    group.splices.push(spliceOf(plan, index, textSource));
  }
  return [...groups.values()];
}

function offsetOf(code: string, line: number, col: number): number {
  let offset = 0;
  for (let at = 1; at < line; at += 1) {
    const next = code.indexOf('\n', offset);
    if (next < 0) return code.length;
    offset = next + 1;
  }
  return offset + Math.max(0, col - 1);
}

function stepsOf(group: FileGroup): Step[] {
  const steps: Step[] = [
    ...group.edits.map((edit) => ({ at: offsetOf(group.original, edit.request.source.line, edit.request.source.col), edit })),
    ...group.splices.map((splice) => ({ at: splice.start, splice })),
  ];
  return steps.sort((a, b) => b.at - a.at);
}

function applySplice(group: FileGroup, splice: TextSplice, done: TextSplice[]): void {
  const same = done.find((other) => other.start === splice.start && other.end === splice.end);
  if (same) {
    if (same.text === splice.text) return;
    throw new DirectEditError('text_not_editable', `Edits ${same.index + 1} and ${splice.index + 1} set the same text source to different values.`);
  }
  if (done.some((other) => splice.start < other.end && other.start < splice.end) || group.code.slice(splice.start, splice.end) !== group.original.slice(splice.start, splice.end)) {
    throw new DirectEditError('text_not_editable', `Edit ${splice.index + 1}: another edit in this batch changes the same text. Send it on its own.`);
  }
  group.code = group.code.slice(0, splice.start) + splice.text + group.code.slice(splice.end);
  done.push(splice);
}

function patchGroups(groups: FileGroup[], applied: AppliedEdit[], tags: string[]): void {
  for (const group of groups) {
    const done: TextSplice[] = [];
    for (const step of stepsOf(group)) {
      if ('splice' in step) {
        applySplice(group, step.splice, done);
        applied[step.splice.index] = { file: group.target.relative, style: [], text: true, textSource: step.splice.textSource };
        tags[step.splice.index] = step.splice.tag;
        continue;
      }
      const { index, request } = step.edit;
      const patch = numberedSync(index, () => patchSource(group.target.relative, group.code, request, group.theme));
      group.code = patch.code;
      applied[index] = { file: group.target.relative, ...patch.applied, ...(patch.tailwind ? { tailwind: patch.tailwind } : {}) };
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

export type WrittenFile = Pick<FileGroup, 'target' | 'original' | 'code'> & { created?: boolean };

async function restoreOriginals(groups: WrittenFile[]): Promise<void> {
  const results = await Promise.allSettled(groups.map((group) => (group.created ? rm(group.target.file, { force: true }) : writeAtomic(group.target.file, group.original))));
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
  await savesSettled(project.id);
  try {
    for (const group of changed) {
      if (group.created) await writeNewFile(group.target.file, group.code);
      else await writeAtomic(group.target.file, group.code);
      written.push(group);
    }
  } catch (error) {
    await restoreOriginals(written);
    throw error;
  }
  return saveDeferred(deps, project, direction, changed.map((group) => group.target.relative), title, meta);
}

export async function applyDirectEditBatch(deps: DirectEditDeps, project: Project, direction: Direction, raw: unknown): Promise<DirectEditBatchResult> {
  const { edits } = parseDirectEditBatch(raw);
  const headVersionId = assertCanEdit(deps, project, direction);
  const previewOrigin = deps.previewOrigin ? () => (deps.previewOrigin as NonNullable<DirectEditDeps['previewOrigin']>)(project, direction) : undefined;
  const groups = await groupByFile(direction.workTree, edits, await knownTokenVars(direction.workTree), { projectKind: project.kind, ...(previewOrigin ? { previewOrigin } : {}) });
  const applied: AppliedEdit[] = new Array<AppliedEdit>(edits.length);
  const tags: string[] = new Array<string>(edits.length);
  patchGroups(groups, applied, tags);
  const changed = groups.filter((group) => group.code !== group.original);
  if (changed.length === 0) return { files: [], version: await deps.versions.get(project, headVersionId), applied };
  const meta: VersionMeta = { kind: 'manual', prompt: batchPrompt(edits) };
  const version = await announceWhile(project, direction, () => edits.map((request, index) => (applied[index] ? domPatchOf(request, { applied: applied[index], ...(applied[index].tailwind ? { tailwind: applied[index].tailwind } : {}) }) : null)), () => writeAndCommitAll(deps, project, direction, changed, batchTitle(applied, tags), meta));
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
