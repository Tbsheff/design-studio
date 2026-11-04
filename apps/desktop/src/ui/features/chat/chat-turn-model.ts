import { forkBaseOf } from "../../../shared/rewind.js";
import type { TurnActions } from "./chat-rewind.js";
import type { RunView } from "./run-state-model.js";
import type { RewindControl } from "./use-rewind.js";

interface PolishProps {
  headVersionId: string | null;
  running: boolean;
  onPolish: () => void;
  onRetry?: (run: RunView) => void;
  onApprovePlan?: (run: RunView) => void;
}

interface TurnProps {
  title: string | undefined;
  restoreTip: string | null;
  restoreVersionId: string | null;
  forkBase: string | null;
  editTip: string | null;
  actions: TurnActions | null;
}

const WAIT_TIP = "Wait for the run to finish";

const turnProps = (
  run: RunView,
  rewind: RewindControl | undefined,
  title: string | undefined,
  actions: TurnActions | null
): TurnProps => {
  if (!rewind || !actions) {
    return {
      actions: null,
      editTip: null,
      forkBase: null,
      restoreTip: null,
      restoreVersionId: null,
      title,
    };
  }

  const running = run.status === "running" || !run.summary;
  const versionId = run.summary?.versionId ?? null;

  const forkBase = running
    ? null
    : forkBaseOf({ startedAt: run.startedAt, versionId }, rewind.versions);

  const restoreTip =
    running || rewind.locked
      ? WAIT_TIP
      : versionId === null
        ? "This message made no version"
        : versionId === rewind.headVersionId ||
            versionId === rewind.headRestoredFrom
          ? "The code is already at this message"
          : null;

  const editTip = running
    ? WAIT_TIP
    : forkBase === null
      ? "No earlier version to start from"
      : null;

  return {
    actions,
    editTip,
    forkBase,
    restoreTip,
    restoreVersionId: restoreTip === null ? versionId : null,
    title,
  };
};

const undoProps = (
  run: RunView,
  rewind: RewindControl | undefined
): { undoVersionId: string | null; undoTip: string | null } => {
  const versionId = run.summary?.versionId;

  const parentId =
    rewind &&
    run.status === "failed" &&
    versionId &&
    versionId === rewind.headVersionId
      ? rewind.versions.find((version) => version.id === versionId)?.parentId
      : null;

  if (!rewind || !parentId) {
    return { undoTip: null, undoVersionId: null };
  }

  return {
    undoTip: rewind.locked
      ? WAIT_TIP
      : rewind.dirtyCount > 0
        ? "Save or discard your edits first"
        : null,
    undoVersionId: parentId,
  };
};

const reviewOf = (
  run: RunView,
  rewind: RewindControl | undefined
): string | null => {
  const versionId = run.summary?.versionId;

  if (!rewind || !versionId || run.status === "running") {
    return null;
  }

  return rewind.versions.some(
    (version) => version.id === versionId && version.parentId !== null
  )
    ? versionId
    : null;
};

export { turnProps, undoProps, reviewOf };

export type { PolishProps, TurnProps };
