import { studioJson } from "./call-types.js";
import type { Context, Json } from "./call-types.js";

interface HistoryView {
  readonly undo: readonly Json[];
}

interface ResetTarget {
  readonly directionId: string;
  readonly projectId: string;
}

interface Reset {
  readonly line: string;
  readonly isFailed: boolean;
}

const UNDO_MAX = 3;

const MAIN_DIRECTION = "main";

const DIRECTION_PARAM = ":directionId";

const toText = (value: Json): string | null => {
  if (value === null || value === "" || value instanceof Object) {
    return null;
  }

  return String(value);
};

const toResetTarget = (context: Context): ResetTarget | null => {
  const { action, input } = context;
  const projectId = toText(input.projectId ?? null);

  const hasDirection =
    action.http.path.includes(DIRECTION_PARAM) || "directionId" in input;

  if (action.access === "read" || !hasDirection || projectId === null) {
    return null;
  }

  const directionId = toText(input.directionId ?? null) ?? MAIN_DIRECTION;

  return { directionId, projectId };
};

const toHistoryRoute = (target: ResetTarget, step: string): string =>
  `/api/projects/${encodeURIComponent(target.projectId)}/d/${encodeURIComponent(target.directionId)}/edit-history/${step}`;

const getUndoCount = async (
  context: Context,
  target: ResetTarget
): Promise<number> => {
  const view = await studioJson<HistoryView>(
    context,
    toHistoryRoute(target, "list"),
    null
  );

  return view.undo.length;
};

const runUndo = async (
  context: Context,
  target: ResetTarget,
  start: number,
  done: number
): Promise<number> => {
  const count = await getUndoCount(context, target);

  if (count <= start || done >= UNDO_MAX) {
    return done;
  }

  await studioJson(context, toHistoryRoute(target, "undo"), {});

  return runUndo(context, target, start, done + 1);
};

const toUndoText = (count: number): string => {
  if (count === 1) {
    return "reset: 1 undo";
  }

  return `reset: ${count} undos`;
};

const runReset = async (
  context: Context,
  target: ResetTarget,
  start: number
): Promise<Reset> => {
  try {
    const count = await runUndo(context, target, start, 0);
    const left = await getUndoCount(context, target);

    if (left > start) {
      return {
        isFailed: true,
        line: `reset: failed, ${left - start} history steps left after ${UNDO_MAX} undos. fix: undo the steps in the studio, then run call-action again`,
      };
    }

    return { isFailed: false, line: toUndoText(count) };
  } catch (error) {
    return {
      isFailed: true,
      line: `reset: failed, ${String(error)}. fix: undo the steps in the studio, then run call-action again`,
    };
  }
};

export { getUndoCount, runReset, toResetTarget };

export type { Reset, ResetTarget };
