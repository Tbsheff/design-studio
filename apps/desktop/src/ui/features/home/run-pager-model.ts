import type { Dispatch, MutableRefObject, SetStateAction } from "react";

import { toLoadedCount, updateCursorSeen } from "./run-cursor-model.js";
import type { RunCursor } from "./run-cursor-model.js";
import type { RunPageLike, RunPorts } from "./run-ports-model.js";
import { FIRST_RUNS, MORE_RUNS, THROUGH_RUNS } from "./studio-data-model.js";

interface RunPager<Runs> {
  readonly cursor: MutableRefObject<RunCursor>;
  readonly direction: MutableRefObject<string | null>;
  readonly ports: RunPorts<Runs>;
  readonly setRuns: Dispatch<SetStateAction<Runs>>;
  readonly setLoadedFor: (projectId: string) => void;
}

type WantRuns = (cursor: RunCursor) => boolean;

const publishPager = <Runs>(
  pager: RunPager<Runs>,
  cursor: RunCursor,
  load: (() => void) | null
): void => {
  if (pager.cursor.current === cursor) {
    pager.ports.publishOlder(
      cursor.state.current.isLoading,
      !cursor.state.current.isDone,
      load
    );
  }
};

const getRunEventsOrNull = async <Runs>(
  pager: RunPager<Runs>,
  cursor: RunCursor,
  runId: string
): Promise<Parameters<RunPorts<Runs>["toWithEvents"]>[1] | null> => {
  try {
    return await pager.ports.getRunEvents(cursor.projectId, runId);
  } catch {
    return null;
  }
};

const runLiveCatchUp = async <Runs>(
  pager: RunPager<Runs>,
  cursor: RunCursor,
  runId: string
): Promise<void> => {
  const events = await getRunEventsOrNull(pager, cursor, runId);

  if (events !== null && pager.cursor.current === cursor) {
    pager.setRuns((previous) => pager.ports.toWithEvents(previous, events));
  }
};

const applyPage = <Runs>(
  pager: RunPager<Runs>,
  cursor: RunCursor,
  page: RunPageLike
): void => {
  updateCursorSeen(cursor, page.runs);
  cursor.state.current = {
    ...cursor.state.current,
    before: page.nextBefore,
    isDone: page.nextBefore === null,
  };
  pager.setRuns((previous) => pager.ports.toMerged(previous, page.runs));
  pager.setLoadedFor(cursor.projectId);

  for (const summary of page.runs) {
    if (summary.status === "running") {
      runLiveCatchUp(pager, cursor, summary.id);
    }
  }
};

const toPageSize = (isFirst: boolean, size: number): number => {
  if (isFirst) {
    return FIRST_RUNS;
  }

  return size;
};

const runPage = async <Runs>(
  pager: RunPager<Runs>,
  cursor: RunCursor,
  want: WantRuns,
  size: number
): Promise<void> => {
  if (
    cursor.state.current.isDone ||
    pager.cursor.current !== cursor ||
    !want(cursor)
  ) {
    return;
  }

  const next = await pager.ports.listPage(
    cursor.projectId,
    toPageSize(cursor.state.current.before === null, size),
    cursor.state.current.before
  );

  if (pager.cursor.current !== cursor) {
    return;
  }

  applyPage(pager, cursor, next);
  await runPage(pager, cursor, want, size);
};

const runPageSafely = async <Runs>(
  pager: RunPager<Runs>,
  cursor: RunCursor,
  want: WantRuns,
  size: number
): Promise<void> => {
  try {
    await runPage(pager, cursor, want, size);
  } catch {
    pager.setLoadedFor(cursor.projectId);
  }
};

const toWantMore =
  <Runs>(pager: RunPager<Runs>, target: number): WantRuns =>
  (cursor) =>
    toLoadedCount(cursor, pager.direction.current) < target;

const runFill = async <Runs>(
  pager: RunPager<Runs>,
  cursor: RunCursor,
  want: WantRuns,
  size: number
): Promise<void> => {
  if (cursor.state.current.isLoading || cursor.state.current.isDone) {
    return;
  }

  cursor.state.current = { ...cursor.state.current, isLoading: true };
  publishPager(pager, cursor, null);
  const work = runPageSafely(pager, cursor, want, size);
  cursor.state.current = { ...cursor.state.current, pending: work };
  await work;
  cursor.state.current = {
    ...cursor.state.current,
    isLoading: false,
    pending: null,
  };
  publishPager(pager, cursor, () => {
    const target = toLoadedCount(cursor, pager.direction.current) + MORE_RUNS;
    runFill(pager, cursor, toWantMore(pager, target), MORE_RUNS);
  });
};

const runFillFirst = <Runs>(
  pager: RunPager<Runs>,
  cursor: RunCursor
): Promise<void> =>
  runFill(pager, cursor, toWantMore(pager, FIRST_RUNS), MORE_RUNS);

const isRunReachedIn = async <Runs>(
  pager: RunPager<Runs>,
  cursor: RunCursor,
  runId: string
): Promise<boolean> => {
  if (
    pager.cursor.current !== cursor ||
    cursor.seen.has(runId) ||
    cursor.state.current.isDone
  ) {
    return cursor.seen.has(runId);
  }

  const { before, pending } = cursor.state.current;

  await (pending ??
    runFill(
      pager,
      cursor,
      (candidate) => !candidate.seen.has(runId),
      THROUGH_RUNS
    ));

  const after = cursor.state.current;

  if (after.before === before && !after.pending) {
    return cursor.seen.has(runId);
  }

  return isRunReachedIn(pager, cursor, runId);
};

const isRunReached = <Runs>(
  pager: RunPager<Runs>,
  runId: string
): Promise<boolean> => isRunReachedIn(pager, pager.cursor.current, runId);

export { isRunReached, runFillFirst };

export type { RunPager };
