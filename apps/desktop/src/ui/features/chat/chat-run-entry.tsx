import { memo, Suspense, useCallback, useMemo } from "react";
import type { ReactElement } from "react";

import { Message, MessageContent } from "../../ai/components/ai/message.js";
import { ApprovalCard, canPolishRun } from "../../chat-slots.js";
import { RunFeedbackRow } from "./chat-feedback.js";
import {
  UserMessage,
  PlanCard,
  PolishThis,
  RunError,
  RunNotice,
} from "./chat-parts.js";
import { UserTurn } from "./chat-rewind.js";
import { RunParts } from "./chat-run-parts.js";
import type { PolishProps, TurnProps } from "./chat-turn-model.js";
import { PermissionPrompt } from "./permission-prompt.js";
import { RunCommentsCard } from "./run-comments.js";
import { runProjectId } from "./run-history-model.js";
import type { RunView } from "./run-state-model.js";
import { LiveStatus } from "./tool-chips.js";

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

const hasComments = (run: RunView): boolean => {
  const lists = [
    run.request?.comments,
    run.request?.commentIds,
    run.summary?.request?.comments,
    run.summary?.request?.commentIds,
  ];

  return lists.some((list) => (list?.length ?? 0) > 0);
};

const RunEntry = memo(
  ({
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
  }: EntryProps) => {
    const { runId } = run;
    const details = useCallback(() => onDetails(runId), [onDetails, runId]);

    const review = useMemo(
      () =>
        onReview && reviewVersionId
          ? (): void => onReview(reviewVersionId)
          : undefined,
      [onReview, reviewVersionId]
    );

    const onUndo = useMemo(
      () =>
        actions && undoVersionId
          ? (): void => actions.onRestore(undoVersionId)
          : undefined,
      [actions, undoVersionId]
    );

    const running = run.status === "running";

    const rewind = useMemo(
      () => ({ editTip, forkBase, restoreTip, restoreVersionId }),
      [restoreTip, restoreVersionId, forkBase, editTip]
    );

    return (
      <div className="run flex min-w-0 flex-col gap-3.5" data-run-id={runId}>
        <UserTurn
          run={run}
          title={title}
          rewind={actions ? rewind : null}
          actions={actions}
        />
        <Message type="incoming" className="msg assistant">
          <MessageContent className="run-body gap-3">
            <RunParts run={run} running={running} workTree={workTree} />
            {running &&
              run.permissions.map((request) =>
                request.card ? (
                  <Suspense key={request.id} fallback={null}>
                    <ApprovalCard
                      projectId={runProjectId()}
                      runId={runId}
                      request={request}
                    />
                  </Suspense>
                ) : (
                  <PermissionPrompt
                    key={request.id}
                    projectId={runProjectId()}
                    runId={runId}
                    request={request}
                  />
                )
              )}
            {running && (
              <LiveStatus
                run={run}
                workTree={workTree}
                offline={offline}
                onStop={onStop}
              />
            )}
            <RunError
              run={run}
              latest={latest}
              undo={onUndo ? { onUndo, tip: undoTip } : undefined}
              {...(polish.onRetry
                ? { onRetry: (): void => polish.onRetry?.(run) }
                : {})}
            />
            <RunNotice
              run={run}
              latest={latest}
              {...(polish.onRetry
                ? { onRetry: (): void => polish.onRetry?.(run) }
                : {})}
            />
            {hasComments(run) && <RunCommentsCard run={run} />}
            <RunFeedbackRow run={run} onDetails={details} onReview={review} />
            {latest &&
              run.status === "completed" &&
              run.request?.plan &&
              polish.onApprovePlan && (
                <PlanCard onApprove={() => polish.onApprovePlan?.(run)} />
              )}
            {canPolishRun(run, polish.headVersionId) && (
              <PolishThis
                disabled={polish.running}
                onPolish={polish.onPolish}
              />
            )}
          </MessageContent>
        </Message>
      </div>
    );
  }
);
RunEntry.displayName = "RunEntry";

const PendingEntry = ({
  run,
  workTree,
}: {
  run: RunView;
  workTree: string | null;
}): ReactElement => (
  <div className="run flex min-w-0 flex-col gap-3.5" data-pending-run="">
    <UserMessage run={run} />
    <Message type="incoming" className="msg assistant">
      <MessageContent className="run-body gap-3">
        <LiveStatus run={run} workTree={workTree} />
      </MessageContent>
    </Message>
  </div>
);

export { PendingEntry, RunEntry };
