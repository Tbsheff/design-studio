import type { ReactElement } from "react";

import { MessageContent } from "../../ai/components/ai/message-content.js";
import type { RunUndoAction } from "./chat-parts-model.js";
import { RunParts } from "./chat-run-parts.js";
import { DecisionRow } from "./decision-row.js";
import { LiveStatus } from "./live-status.js";
import { RunBodyTail } from "./run-body-tail.js";
import type { RunBodyTailProps } from "./run-entry-model.js";
import { RunError } from "./run-error.js";
import { RunNotice } from "./run-notice.js";
import { RunPermissions } from "./run-permissions.js";
import { toStyled } from "./styled.js";

const BodyContent = toStyled(MessageContent, "run-body gap-3");

interface RunBodyContentProps {
  readonly tail: RunBodyTailProps;
  readonly workTree: string | null;
  readonly isOffline: boolean;
  readonly undo: RunUndoAction | null;
  readonly onRetry: (() => void) | null;
  readonly onStop: (() => void) | null;
}

const RunBodyContent = ({
  tail,
  workTree,
  isOffline,
  undo,
  onRetry,
  onStop,
}: RunBodyContentProps): ReactElement => {
  const { run, latest, onDetails, onReview, onPolish, onApprovePlan } = tail;
  const isRunning = run.status === "running";

  return (
    <BodyContent>
      <RunParts run={run} running={isRunning} workTree={workTree} />
      {isRunning && <RunPermissions run={run} />}
      {isRunning && (
        <LiveStatus
          run={run}
          workTree={workTree}
          isOffline={isOffline}
          onStop={onStop}
        />
      )}
      <RunError
        run={run}
        latest={latest}
        undo={undo}
        onRetry={onRetry}
        onDetails={onDetails}
      />
      <RunNotice run={run} latest={latest} onRetry={onRetry} />
      <DecisionRow run={run} />
      <RunBodyTail
        run={run}
        latest={latest}
        headVersionId={tail.headVersionId}
        isPolishDisabled={tail.isPolishDisabled}
        onDetails={onDetails}
        onReview={onReview}
        onPolish={onPolish}
        onApprovePlan={onApprovePlan}
      />
    </BodyContent>
  );
};

export { RunBodyContent };

export type { RunBodyContentProps };
