import type { ReactElement } from "react";

import { RunEntry } from "./chat-run-entry.js";
import { reviewOf, turnProps, undoProps } from "./chat-turn-model.js";
import type { RunView } from "./run-state-model.js";
import type { TimelineRunContext } from "./use-timeline-context.js";

const TimelineRun = ({
  run,
  context,
}: {
  run: RunView;
  context: TimelineRunContext;
}): ReactElement => {
  const { actions, isOffline, lastId, onDetails, onReview, onStop } = context;
  const { polish, rewind, titles, workTree } = context;

  const turn = turnProps(
    run,
    rewind,
    titles[run.runId] ?? run.summary?.title,
    actions
  );

  const undo = undoProps(run, rewind);

  return (
    <RunEntry
      run={run}
      latest={run.runId === lastId}
      workTree={workTree}
      onDetails={onDetails}
      polish={polish}
      offline={isOffline}
      onStop={onStop}
      reviewVersionId={reviewOf(run, rewind)}
      onReview={onReview}
      undoVersionId={undo.undoVersionId}
      undoTip={undo.undoTip}
      title={turn.title}
      restoreTip={turn.restoreTip}
      restoreVersionId={turn.restoreVersionId}
      forkBase={turn.forkBase}
      editTip={turn.editTip}
      actions={turn.actions}
    />
  );
};

export { TimelineRun };
