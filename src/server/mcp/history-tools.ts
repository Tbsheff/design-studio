import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import type { DirectEditBatchResult, EditHistoryList, EditHistoryState, Project, Version } from '../../shared/contracts.js';
import { publishVersion } from '../direct-edit/index.js';
import { listWords } from './activity-text.js';
import { EditError, loadTarget, oneLine, refuseWhileRunning, studioCall, type EditDeps } from './edit-deps.js';
import { base, checkWritePath, classes, defineTool, directionId, hasClasses, ok, pagePath, pageUrl, projectId, selector, style, versionActivity, writeText, type Done } from './edit-kit.js';
import { describeElements } from './element.js';

const BATCH_MAX = 50;
const FILES_MAX = 20;
const FILE_MAX = 512 * 1024;
const HISTORY_NOTE = 'This is the same undo history as the studio window (Cmd+Z), so the user and you share it. It holds direct edits, structure ops, batches, token edits and write_file changes to existing files. For anything else (a new file, a studio run, a design system apply) use restore_version.';

type Direction = Project['directions'][number];

const target = z.object({ projectId, directionId }).strict();

async function historyState(deps: EditDeps, project: Project, direction: Direction): Promise<EditHistoryState & EditHistoryList> {
  return studioCall<EditHistoryState & EditHistoryList>(deps, 'GET', `${base(project, direction.id)}/edit-history/list?limit=20`);
}

async function step(deps: EditDeps, input: z.output<typeof target>, kind: 'undo' | 'redo'): Promise<Done> {
  const { project, direction } = await loadTarget(deps, input.projectId, input.directionId);
  refuseWhileRunning(deps, project, direction);
  const before = await historyState(deps, project, direction);
  const label = kind === 'undo' ? before.undoLabel : before.redoLabel;
  if (!label) throw new EditError(kind === 'undo' ? 'Nothing to undo in this direction. Use list_versions and restore_version for older changes.' : 'Nothing to redo in this direction.');
  const result = await studioCall<{ state: EditHistoryState; version: Version }>(deps, 'POST', `${base(project, direction.id)}/edit-history/${kind}`);
  const verb = kind === 'undo' ? 'Undid' : 'Redid';
  const output = ok({ [kind === 'undo' ? 'undid' : 'redid']: label, versionId: result.version.id, title: result.version.title, canUndo: result.state.canUndo, undoLabel: result.state.undoLabel, canRedo: result.state.canRedo, redoLabel: result.state.redoLabel });
  return { result: output, activity: versionActivity(project, direction, `${verb} “${oneLine(label, 80)}”`, result.version) };
}

const undo = defineTool('undo', target, { title: 'Undo last edit', description: `Undo the newest edit in the direction's edit history and save the result as a version. ${HISTORY_NOTE} The result names the edit it undid.` }, (deps, input) => step(deps, input, 'undo'));

const redo = defineTool('redo', target, { title: 'Redo edit', description: `Redo the newest undone edit in the direction's edit history. ${HISTORY_NOTE} A new edit clears the redo list.` }, (deps, input) => step(deps, input, 'redo'));

const editHistory = defineTool(
  'edit_history',
  target,
  { title: 'List edit history', description: `List the recent edits that undo and redo would step through, newest first: label, version id and files. ${HISTORY_NOTE} The history lives in memory and clears when Design Studio restarts.`, readOnly: true, idempotent: true },
  async (deps, input) => {
    const { project, direction } = await loadTarget(deps, input.projectId, input.directionId);
    const state = await historyState(deps, project, direction);
    return { result: ok({ ...state, note: HISTORY_NOTE }) };
  },
);

const batchEdit = z
  .object({
    path: pagePath,
    selector: selector.describe('CSS selector of one element on the page.'),
    style: style.optional().describe('CSS properties to set. null removes the property.'),
    text: z.string().max(5000).optional(),
    classes: classes.optional(),
  })
  .strict()
  .refine((edit) => edit.text !== undefined || hasClasses(edit) || Object.keys(edit.style ?? {}).length > 0, 'each edit needs style, text or classes');

const batchFile = z.object({ path: z.string().trim().min(1).max(300), content: z.string().max(FILE_MAX) }).strict();

const batchSchema = z
  .object({
    projectId,
    directionId,
    edits: z.array(batchEdit).min(1).max(BATCH_MAX).optional().describe('Style, text and class edits, each on one element. They can be on several pages and files.'),
    files: z.array(batchFile).min(1).max(FILES_MAX).optional().describe('Whole files to write, with the same path rules as write_file.'),
  })
  .strict()
  .refine((input) => (input.edits === undefined) !== (input.files === undefined), 'pass edits or files, not both: style/text edits and file writes cannot share one version');

async function batchElements(deps: EditDeps, project: Project, direction: Direction, edits: z.output<typeof batchEdit>[]): Promise<Done> {
  const pages = [...new Set(edits.map((edit) => edit.path ?? ''))];
  const found = new Map<string, Awaited<ReturnType<typeof describeElements>>>();
  for (const page of pages) {
    const selectors = edits.filter((edit) => (edit.path ?? '') === page).map((edit) => edit.selector);
    found.set(page, await describeElements(deps.preview, await pageUrl(deps, project, direction, page || undefined), selectors));
  }
  const cursor = new Map<string, number>();
  const requests = edits.map((edit, index) => {
    const page = edit.path ?? '';
    const at = cursor.get(page) ?? 0;
    cursor.set(page, at + 1);
    const element = found.get(page)?.[at] ?? null;
    if (!element) throw new EditError(`Edit ${index + 1}: no element matches ${edit.selector} on the page.`);
    if (!element.source) throw new EditError(`Edit ${index + 1}: ${edit.selector} has no source location, so it cannot be edited directly.`);
    return { source: element.source, selector: edit.selector, tag: element.tag, ...(edit.style && Object.keys(edit.style).length > 0 ? { style: edit.style } : {}), ...(edit.text !== undefined ? { text: edit.text } : {}), ...(hasClasses(edit) ? { classes: edit.classes } : {}) };
  });
  const result = await studioCall<DirectEditBatchResult>(deps, 'POST', `${base(project, direction.id)}/direct-edit`, { edits: requests });
  if (result.files.length === 0) return { result: ok({ changed: false, versionId: result.version.id, note: 'Every value was already set.' }) };
  const parts = [...new Set(result.applied.flatMap((entry) => [...entry.style.map((prop) => prop.replace(/-/g, ' ')), ...(entry.classes ? ['classes'] : []), ...(entry.text ? ['text'] : [])]))];
  const subject = edits.length === 1 ? (requests[0]?.tag ?? 'element') : `${edits.length} elements`;
  const output = ok({ changed: true, files: result.files, versionId: result.version.id, title: result.version.title, applied: result.applied, note: 'All edits are one version and one undo step.' });
  return { result: output, activity: versionActivity(project, direction, `Edited ${subject} ${listWords(parts)} in one step`, result.version) };
}

async function batchFiles(deps: EditDeps, project: Project, direction: Direction, files: z.output<typeof batchFile>[], client: string): Promise<Done> {
  const planned = files.map((file) => {
    const relative = checkWritePath(project, direction.workTree, file.path);
    return { relative, absolute: path.join(direction.workTree, ...relative.split('/')), content: file.content };
  });
  if (new Set(planned.map((file) => file.relative)).size !== planned.length) throw new EditError('Each path can be in files only once.');
  const befores = await Promise.all(planned.map((file) => readFile(file.absolute, 'utf8').catch(() => null)));
  const changed = planned.filter((file, index) => befores[index] !== file.content);
  if (changed.length === 0) return { result: ok({ changed: false, versionId: direction.headVersionId }) };
  const written: { absolute: string; before: string | null }[] = [];
  let version: Version | null;
  try {
    for (const file of changed) {
      written.push({ absolute: file.absolute, before: befores[planned.indexOf(file)] ?? null });
      await writeText(file.absolute, file.content);
    }
    const relatives = changed.map((file) => file.relative);
    version = await deps.versions.commitFile(project, direction, relatives, `Edit by ${client}: ${changed.length} files`, { kind: 'manual', prompt: `Edit by ${client}: ${relatives.join(', ')}` });
  } catch (error) {
    for (const file of written) await (file.before === null ? rm(file.absolute, { force: true }) : writeText(file.absolute, file.before)).catch(() => undefined);
    throw error;
  }
  const allExisted = changed.every((file) => befores[planned.indexOf(file)] !== null);
  if (version && allExisted) deps.history?.record({ projectId: project.id, directionId: direction.id, label: version.title, versionId: version.id, files: changed.map((file) => ({ file: file.absolute, relative: file.relative, before: befores[planned.indexOf(file)] ?? '', after: file.content })) });
  if (version) await publishVersion({ bus: deps.bus, projects: deps.projects, versions: deps.versions, runner: deps.runner }, project, direction, version);
  const created = changed.filter((file) => befores[planned.indexOf(file)] === null).map((file) => file.relative);
  const output = ok({ changed: true, files: changed.map((file) => file.relative), created, versionId: version?.id ?? null, title: version?.title ?? null, undo: allExisted ? 'undo reverts all files in one step' : 'a new file is not in the undo history; use restore_version' });
  return { result: output, activity: versionActivity(project, direction, `Wrote ${listWords(changed.map((file) => file.relative))} in one step`, version) };
}

const batch = defineTool(
  'batch_edit',
  batchSchema,
  {
    title: 'Batch edit',
    description: 'Make several changes as ONE version and one undo step. Pass edits (style, text and class edits on elements found by CSS selector, on one or more pages; the same code path as a multi-select in the studio inspector) or files (whole files, the same path rules as write_file). Up to 50 edits or 20 files. Structure ops (delete, duplicate, wrap, unwrap, move) are not part of a batch; use edit_element with op.',
  },
  async (deps, input, client) => {
    const { project, direction } = await loadTarget(deps, input.projectId, input.directionId);
    refuseWhileRunning(deps, project, direction);
    if (input.edits) return batchElements(deps, project, direction, input.edits);
    return batchFiles(deps, project, direction, input.files ?? [], client);
  },
);

export const HISTORY_TOOLS = [undo, redo, editHistory, batch];
