import { forkBaseOf } from "../../../shared/rewind.js";
import type { RunView } from "./run-state-model.js";
import type { RewindControl } from "./use-rewind.js";

interface TurnActions {
  onRestore: (versionId: string) => void;
  onEditResend: (
    run: RunView,
    prompt: string,
    fromVersionId: string
  ) => Promise<void>;
  onRename: (runId: string, title: string) => Promise<void>;
  dirtyCount: () => number;
}

interface RunCallbacks {
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

interface UndoProps {
  undoVersionId: string | null;
  undoTip: string | null;
}

const toRestoreTip = (
  running: boolean,
  rewind: RewindControl,
  versionId: string | null
): string | null => {
  if (running || rewind.locked) {
    return WAIT_TIP;
  }

  if (versionId === null) {
    return "This message made no version";
  }

  if (versionId === rewind.headVersionId) {
    return "The code is already at this message";
  }

  if (versionId === rewind.headRestoredFrom) {
    return "The code is already at this message";
  }

  return null;
};

const toEditTip = (
  running: boolean,
  forkBase: string | null
): string | null => {
  if (running) {
    return WAIT_TIP;
  }

  if (forkBase === null) {
    return "No earlier version to start from";
  }

  return null;
};

const toUndoTip = (rewind: RewindControl): string | null => {
  if (rewind.locked) {
    return WAIT_TIP;
  }

  if (rewind.dirtyCount > 0) {
    return "Save or discard your edits first";
  }

  return null;
};

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

  let forkBase: string | null = null;

  if (!running) {
    forkBase = forkBaseOf(
      { startedAt: run.startedAt, versionId },
      rewind.versions
    );
  }

  const restoreTip = toRestoreTip(running, rewind, versionId);
  const editTip = toEditTip(running, forkBase);

  let restoreVersionId: string | null = null;

  if (restoreTip === null) {
    restoreVersionId = versionId;
  }

  return {
    actions,
    editTip,
    forkBase,
    restoreTip,
    restoreVersionId,
    title,
  };
};

const undoProps = (
  run: RunView,
  rewind: RewindControl | undefined
): UndoProps => {
  const versionId = run.summary?.versionId;

  let parentId: string | null | undefined = null;

  if (
    rewind &&
    run.status === "failed" &&
    versionId &&
    versionId === rewind.headVersionId
  ) {
    parentId = rewind.versions.find(
      (version) => version.id === versionId
    )?.parentId;
  }

  if (!rewind || !parentId) {
    return { undoTip: null, undoVersionId: null };
  }

  return { undoTip: toUndoTip(rewind), undoVersionId: parentId };
};

const reviewOf = (
  run: RunView,
  rewind: RewindControl | undefined
): string | null => {
  const versionId = run.summary?.versionId;

  if (!rewind || !versionId || run.status === "running") {
    return null;
  }

  if (
    rewind.versions.some(
      (version) => version.id === versionId && version.parentId !== null
    )
  ) {
    return versionId;
  }

  return null;
};

export { reviewOf, turnProps, undoProps };

export type { RunCallbacks, TurnActions, TurnProps };
