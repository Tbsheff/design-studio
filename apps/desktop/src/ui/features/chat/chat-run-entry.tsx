import { memo, useMemo } from "react";
import type { ReactElement } from "react";

import type { PolishProps, TurnProps } from "./chat-turn-model.js";
import { RunBody } from "./run-body.js";
import type { RunView } from "./run-state-model.js";
import { useRunEntry } from "./use-run-entry.js";
import { UserTurn } from "./user-turn.js";

interface EntryProps extends TurnProps {
  run: RunView;
  undoVersionId: string | null;
  undoTip: string | null;
  reviewVersionId: string | null;
  onReview: ((versionId: string) => void) | null;
  latest: boolean;
  workTree: string | null;
  onDetails: (runId: string) => void;
  polish: PolishProps;
  offline: boolean;
  onStop: (() => void) | undefined;
}

const RunEntryBody = ({
  run,
  latest,
  workTree,
  onDetails,
  polish,
  offline,
  onStop,
  title,
  restoreTip,
  restoreVersionId,
  forkBase,
  editTip,
  actions,
  undoVersionId,
  undoTip,
  reviewVersionId,
  onReview,
}: EntryProps): ReactElement => {
  const { tail, undo, retry } = useRunEntry({
    actions,
    latest,
    onDetails,
    onReview,
    polish,
    reviewVersionId,
    run,
    undoTip,
    undoVersionId,
  });

  const rewind = useMemo(
    () => ({ editTip, forkBase, restoreTip, restoreVersionId }),
    [restoreTip, restoreVersionId, forkBase, editTip]
  );

  return (
    <div className="run flex min-w-0 flex-col gap-3.5" data-run-id={run.runId}>
      <UserTurn run={run} title={title} rewind={rewind} actions={actions} />
      <RunBody
        tail={tail}
        workTree={workTree}
        isOffline={offline}
        undo={undo}
        onRetry={retry}
        onStop={onStop ?? null}
      />
    </div>
  );
};

const RunEntry = memo(RunEntryBody);

RunEntry.displayName = "RunEntry";

export { RunEntry };
