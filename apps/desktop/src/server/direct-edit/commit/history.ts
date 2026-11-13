import { existsSync } from "node:fs";
import { readFile, realpath, rm } from "node:fs/promises";
import path from "node:path";

import type {
  Direction,
  EditHistoryEntry,
  EditHistoryList,
  EditHistoryState,
  Project,
  Version,
  VersionMeta,
} from "@design-studio/contracts";
import type { LayoutChange } from "@design-studio/contracts/canvas-file";

import { emitSourceChange } from "../../events/index.js";
import type {
  EventBus,
  DirectEditDeps,
  EditFileChange,
  EditHistory,
  EditRecord,
  EditStepResult,
  HistoryStep,
  VariationSettle,
} from "../../events/index.js";
import { isNodeError } from "../../platform/errors/index.js";
import { DirectEditError } from "../engine/errors.js";
import { writeAtomic, writeNewFile } from "./edit-source.js";
import { assertCanEdit, publishVersion, saveDeferred } from "./publish.js";
import { savedVersionId, savesSettled } from "./save-queue.js";

export const HISTORY_LIMIT = 100;

interface HistoryOptions {
  bus: Pick<EventBus, "emit">;
  onRestored?: (workTree: string, relatives: string[]) => void;
  layout?: (
    project: Project,
    change: LayoutChange,
    kind: HistoryStep
  ) => Promise<boolean>;
  settle?: (
    project: Project,
    settles: readonly VariationSettle[],
    kind: HistoryStep
  ) => Promise<void>;
  limit?: number;
}

interface Stacks {
  undo: EditRecord[];
  redo: EditRecord[];
}

const STALE_MESSAGE =
  "The file changed after this edit. Undo history was cleared.";
const STEP_WORD: Record<HistoryStep, string> = { undo: "Undo", redo: "Redo" };

function isFor(record: EditRecord | undefined, directionId: string): boolean {
  if (record === undefined) return false;

  return (
    record.directionId === directionId ||
    (record.directionIds ?? []).includes(directionId)
  );
}

function toDirectionIds(record: EditRecord): string[] {
  return [...new Set([record.directionId, ...(record.directionIds ?? [])])];
}

function lastFor(records: EditRecord[], directionId: string): number {
  for (let index = records.length - 1; index >= 0; index -= 1)
    if (isFor(records[index], directionId)) return index;
  return -1;
}

function stale(): DirectEditError {
  return new DirectEditError("history_stale", STALE_MESSAGE);
}

async function readOrNull(file: string): Promise<string | null> {
  try {
    return await readFile(file, "utf-8");
  } catch (error) {
    if (
      isNodeError(error) &&
      (error.code === "ENOENT" || error.code === "ENOTDIR")
    )
      return null;
    throw error;
  }
}

async function resolveFiles(
  workTree: string,
  record: EditRecord
): Promise<string[] | null> {
  const root = await realpath(workTree);
  const files: string[] = [];
  for (const change of record.files) {
    const candidate = path.resolve(root, change.relative);
    if (!candidate.startsWith(root + path.sep)) return null;
    const real = await realpath(candidate).catch(() => null);
    const placed =
      real ?? (change.created ? await createdPath(candidate) : null);
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

async function writeInReverse(
  files: string[],
  texts: (string | null)[]
): Promise<void> {
  const order = files.map((_, index) => files.length - 1 - index);
  const created = order.filter(
    (index) => texts[index] !== null && !existsSync(files[index] ?? "")
  );
  for (const index of [
    ...created,
    ...order.filter((item) => !created.includes(item)),
  ])
    await writeText(files[index] ?? "", texts[index] ?? null);
}

function textBefore(change: EditFileChange): string | null {
  return change.created ? null : change.before;
}

function stepMeta(kind: HistoryStep, record: EditRecord): VersionMeta {
  return {
    kind: "manual",
    prompt: `${STEP_WORD[kind]} of "${record.label}" (${record.files.map((change) => change.relative).join(", ")})`,
  };
}

export function createEditHistory(options: HistoryOptions): EditHistory {
  const limit = options.limit ?? HISTORY_LIMIT;
  const projects = new Map<string, Stacks>();
  const recorded = new WeakMap<EditRecord, number>();
  let sequence = 0;

  const stacksOf = (projectId: string): Stacks => {
    let stacks = projects.get(projectId);
    if (!stacks) {
      stacks = { undo: [], redo: [] };
      projects.set(projectId, stacks);
    }
    return stacks;
  };

  const changed = (projectId: string, directionId: string): void => {
    options.bus.emit({ type: "edit-history.changed", projectId, directionId });
  };

  const push = (records: EditRecord[], record: EditRecord): void => {
    records.push(record);
    if (records.length > limit) records.splice(0, records.length - limit);
  };

  const state = (projectId: string, directionId: string): EditHistoryState => {
    const stacks = projects.get(projectId);
    const undo = stacks
      ? stacks.undo[lastFor(stacks.undo, directionId)]
      : undefined;
    const redo = stacks
      ? stacks.redo[lastFor(stacks.redo, directionId)]
      : undefined;
    return {
      canUndo: undo !== undefined,
      canRedo: redo !== undefined,
      undoLabel: undo?.label ?? null,
      redoLabel: redo?.label ?? null,
    };
  };

  const list = (
    projectId: string,
    directionId: string,
    max: number
  ): EditHistoryList => {
    const stacks = projects.get(projectId);
    const entries = (records: EditRecord[]): EditHistoryEntry[] =>
      records
        .filter((record) => isFor(record, directionId))
        .slice(-max)
        .reverse()
        .map((record) => ({
          label: record.label,
          versionId: savedVersionId(record.versionId),
          files: record.files.map((change) => change.relative),
        }));
    return {
      undo: entries(stacks?.undo ?? []),
      redo: entries(stacks?.redo ?? []),
    };
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
      stacks.undo = stacks.undo.filter((entry) => !isFor(entry, directionId));
      stacks.redo = stacks.redo.filter((entry) => !isFor(entry, directionId));
    }
    changed(projectId, directionId);
  };

  const commitStep = async (
    kind: HistoryStep,
    deps: DirectEditDeps,
    project: Project,
    direction: Direction,
    record: EditRecord,
    files: string[]
  ): Promise<Version> => {
    const wanted = (change: EditFileChange) =>
      kind === "undo" ? textBefore(change) : change.after;
    const current = (change: EditFileChange) =>
      kind === "undo" ? change.after : textBefore(change);
    try {
      await writeInReverse(files, record.files.map(wanted));
    } catch (error) {
      await writeInReverse(files, record.files.map(current)).catch(
        (restoreError: unknown) =>
          console.error("[history] could not restore files", restoreError)
      );
      throw error;
    }
    return saveDeferred(
      deps,
      project,
      direction,
      record.files.map((change) => change.relative),
      `${STEP_WORD[kind]}: ${record.label}`,
      stepMeta(kind, record)
    );
  };

  const layoutStep = async (
    kind: HistoryStep,
    deps: DirectEditDeps,
    project: Project,
    direction: Direction,
    record: EditRecord,
    layout: LayoutChange,
    head: string
  ): Promise<EditStepResult> => {
    const applied = options.layout
      ? await options.layout(project, layout, kind)
      : false;
    if (!applied) {
      clear(project.id, direction.id);
      throw stale();
    }

    if (record.settles && record.settles.length > 0)
      await options.settle?.(project, record.settles, kind);

    const stacks = stacksOf(project.id);
    const from = kind === "undo" ? stacks.undo : stacks.redo;
    from.splice(from.indexOf(record), 1);
    push(kind === "undo" ? stacks.redo : stacks.undo, record);
    for (const id of new Set([direction.id, ...toDirectionIds(record)]))
      changed(project.id, id);
    return {
      label: record.label,
      state: state(project.id, direction.id),
      version: await deps.versions.get(project, savedVersionId(head)),
    };
  };

  const step = async (
    kind: HistoryStep,
    deps: DirectEditDeps,
    project: Project,
    direction: Direction
  ): Promise<EditStepResult> => {
    const head = assertCanEdit(deps, project, direction);
    await savesSettled(project.id);
    const stacks = stacksOf(project.id);
    const from = kind === "undo" ? stacks.undo : stacks.redo;
    const index = lastFor(from, direction.id);
    const record = from[index];
    if (!record)
      throw new DirectEditError(
        "history_empty",
        kind === "undo" ? "Nothing to undo" : "Nothing to redo"
      );
    if (record.layout)
      return layoutStep(
        kind,
        deps,
        project,
        direction,
        record,
        record.layout,
        head
      );
    const files = await resolveFiles(direction.workTree, record);
    const texts =
      files === null ? [] : await Promise.all(files.map(readOrNull));
    const expected = record.files.map((change) =>
      kind === "undo" ? change.after : textBefore(change)
    );
    if (
      files === null ||
      texts.some((text, position) => text !== expected[position])
    ) {
      clear(project.id, direction.id);
      throw stale();
    }
    const version = await commitStep(
      kind,
      deps,
      project,
      direction,
      record,
      files
    );
    emitSourceChange({
      projectId: project.id,
      directionId: direction.id,
      files: record.files.map((change) =>
        kind === "undo"
          ? {
              relative: change.relative,
              before: change.after,
              after: change.before,
            }
          : change
      ),
    });
    from.splice(index, 1);
    push(kind === "undo" ? stacks.redo : stacks.undo, {
      ...record,
      versionId: version.id,
    });
    options.onRestored?.(
      direction.workTree,
      record.files.map((change) => change.relative)
    );
    await publishVersion(deps, project, direction, version);
    changed(project.id, direction.id);
    return {
      label: record.label,
      state: state(project.id, direction.id),
      version,
    };
  };

  const record = (entry: EditRecord): void => {
    const files = entry.files.filter(
      (change) => change.before !== change.after
    );
    if (files.length === 0 && !entry.layout) return;
    if (files.length > 0)
      emitSourceChange({
        projectId: entry.projectId,
        directionId: entry.directionId,
        files,
      });
    const stacks = stacksOf(entry.projectId);
    const stored = { ...entry, files };
    sequence += 1;
    recorded.set(stored, sequence);
    push(stacks.undo, stored);

    const ids = toDirectionIds(stored);

    for (let index = stacks.redo.length - 1; index >= 0; index -= 1)
      if (ids.some((id) => isFor(stacks.redo[index], id)))
        stacks.redo.splice(index, 1);
    for (const id of ids) changed(entry.projectId, id);
  };

  const unsaved = async (
    projectId: string,
    entry: EditRecord
  ): Promise<boolean> => {
    if (entry.files.length === 0 || entry.layout) return false;
    const records = projects.get(projectId)?.undo ?? [];
    const later = new Set(
      records
        .slice(records.indexOf(entry) + 1)
        .flatMap((next) =>
          next.files.map((change) => `${change.file}\0${change.before}`)
        )
    );
    const chained = entry.files.some((change) =>
      later.has(`${change.file}\0${change.after}`)
    );
    if (chained) return false;
    try {
      const texts = await Promise.all(
        entry.files.map((change) => readOrNull(change.file))
      );
      for (const [index, change] of entry.files.entries())
        if (texts[index] !== textBefore(change)) return false;
      return true;
    } catch {
      return false;
    }
  };

  const mark = (): number => sequence;

  const dropUnsaved = async (
    projectId: string,
    since: number
  ): Promise<number> => {
    const stacks = projects.get(projectId);
    if (!stacks) return 0;
    const fresh = stacks.undo.filter(
      (entry) => (recorded.get(entry) ?? 0) > since
    );
    const flags = await Promise.all(
      fresh.map((entry) => unsaved(projectId, entry))
    );
    const drop = fresh.filter((entry) => flags[fresh.indexOf(entry)]);
    if (drop.length === 0) return 0;
    for (const entry of drop) {
      const position = stacks.undo.indexOf(entry);
      if (position !== -1) stacks.undo.splice(position, 1);
    }
    for (const directionId of new Set(drop.map((entry) => entry.directionId)))
      changed(projectId, directionId);
    return drop.length;
  };

  return { record, state, list, step, clear, forget, mark, dropUnsaved };
}

export type { EditHistory, EditStepResult, HistoryStep };
