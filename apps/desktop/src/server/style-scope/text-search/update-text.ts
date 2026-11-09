import {
  assertCanEdit,
  publishVersion,
  writeAndCommitAll,
  writeAtomic,
} from "./deps.js";
import type {
  DirectEditDeps,
  EditRecorder,
  TextSkip,
  TextUpdateRequest,
  TextUpdateResult,
  Version,
  WrittenFile,
} from "./deps.js";
import type { Found } from "./match.js";
import type { SearchTarget } from "./scope.js";
import { collectHits } from "./search-text.js";
import type { FileScan } from "./search-text.js";
import { applySplices, splicesOf } from "./segment.js";
import type { Segment } from "./segment.js";

const TITLE_TEXT_MAX = 40;

interface UpdateCommit {
  readonly deps: DirectEditDeps;
  readonly history: EditRecorder | null;
  readonly client: string;
}

interface ChangedFile {
  readonly relative: string;
  readonly absolute: string;
  readonly before: string;
  readonly after: string;
}

interface UpdatePlan {
  readonly changed: readonly ChangedFile[];
  readonly updated: number;
  readonly stale: readonly string[];
  readonly skipped: readonly TextSkip[];
}

interface UpdateOutcome {
  readonly result: TextUpdateResult;
  readonly version: Version | null;
}

const toPickedOf = (
  scan: FileScan,
  chosen: ReadonlySet<string> | null
): Map<Segment, Found[]> => {
  const picked = new Map<Segment, Found[]>();

  for (const item of scan.hits) {
    if (chosen === null || chosen.has(item.hit.id)) {
      const list = picked.get(item.segment) ?? [];
      list.push(item.found);
      picked.set(item.segment, list);
    }
  }

  return picked;
};

const toChangeOf = (
  scan: FileScan,
  picked: Map<Segment, Found[]>,
  request: TextUpdateRequest
): ChangedFile | null => {
  const splices = [...picked.entries()].flatMap(([segment, founds]) =>
    splicesOf(segment, founds, request.replace, request.regex)
  );

  const code = applySplices(scan.source, splices);

  if (code === scan.source) {
    return null;
  }

  return {
    absolute: scan.file.absolute,
    after: code,
    before: scan.source,
    relative: scan.file.relative,
  };
};

const toPlanTextUpdate = async (
  target: SearchTarget,
  request: TextUpdateRequest
): Promise<UpdatePlan> => {
  const collected = await collectHits(target, request);
  let chosen: ReadonlySet<string> | null = null;

  if (request.ids !== null) {
    chosen = new Set(request.ids);
  }

  const changed: ChangedFile[] = [];
  const seen = new Set<string>();
  let updated = 0;

  for (const scan of collected.scans) {
    const picked = toPickedOf(scan, chosen);
    const change = toChangeOf(scan, picked, request);

    for (const founds of picked.values()) {
      updated += founds.length;
    }

    for (const item of scan.hits) {
      seen.add(item.hit.id);
    }

    if (change) {
      changed.push(change);
    }
  }

  const stale = (request.ids ?? []).filter((id) => !seen.has(id));

  const { skipped } = collected;

  return { changed, skipped, stale, updated };
};

const toWriteTextUpdate = async (plan: UpdatePlan): Promise<void> => {
  await Promise.all(
    plan.changed.map((file) => writeAtomic(file.absolute, file.after))
  );
};

const toTitleOf = (plan: UpdatePlan, replace: string): string => {
  const shown = replace.slice(0, TITLE_TEXT_MAX);
  let hits = `${plan.updated} text hits`;

  if (plan.updated === 1) {
    hits = "1 text hit";
  }

  return `Update ${hits} to "${shown}"`;
};

const toResultOf = (
  plan: UpdatePlan,
  version: Version | null
): TextUpdateResult => ({
  files: plan.changed.map((file) => file.relative),
  skipped: plan.skipped,
  stale: plan.stale,
  updated: plan.updated,
  versionId: version?.id ?? null,
});

const toCommitChanged = async (
  target: SearchTarget,
  changed: readonly ChangedFile[],
  title: string,
  commit: UpdateCommit
): Promise<Version> => {
  const { project, direction } = target;

  const written: WrittenFile[] = changed.map((file) => ({
    code: file.after,
    original: file.before,
    target: { file: file.absolute, relative: file.relative },
  }));

  const version = await writeAndCommitAll(
    commit.deps,
    project,
    direction,
    written,
    title,
    {
      client: commit.client,
      kind: "manual",
      prompt: `${title} by ${commit.client}`,
    }
  );

  commit.history?.record({
    directionId: direction.id,
    files: changed.map((file) => ({
      after: file.after,
      before: file.before,
      file: file.absolute,
      relative: file.relative,
    })),
    label: version.title,
    projectId: project.id,
    versionId: version.id,
  });
  await publishVersion(commit.deps, project, direction, version);

  return version;
};

const toCommitUpdate = (
  target: SearchTarget,
  plan: UpdatePlan,
  request: TextUpdateRequest,
  commit: UpdateCommit
): Promise<Version> =>
  toCommitChanged(
    target,
    plan.changed,
    toTitleOf(plan, request.replace),
    commit
  );

const applyTextUpdate = async (
  target: SearchTarget,
  request: TextUpdateRequest,
  commit: UpdateCommit
): Promise<UpdateOutcome> => {
  assertCanEdit(commit.deps, target.project, target.direction);
  const plan = await toPlanTextUpdate(target, request);

  if (plan.changed.length === 0) {
    return { result: toResultOf(plan, null), version: null };
  }

  const version = await toCommitUpdate(target, plan, request, commit);

  return { result: toResultOf(plan, version), version };
};

export {
  applyTextUpdate,
  toCommitChanged as commitChanged,
  toPlanTextUpdate as planTextUpdate,
  toResultOf as resultOf,
  toWriteTextUpdate as writeTextUpdate,
};

export type { ChangedFile, UpdateCommit, UpdateOutcome, UpdatePlan };
