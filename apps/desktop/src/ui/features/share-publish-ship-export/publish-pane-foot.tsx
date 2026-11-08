import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { pick } from "./pick.js";
import type { PublishFlow } from "./use-publish-flow.js";

interface PublishPaneFootProps {
  readonly flow: PublishFlow;
  readonly isReady: boolean;
  readonly problem: string | null;
  readonly onClose: () => void;
  readonly onCheck: () => void;
}

const toFootNote = (
  flow: PublishFlow,
  isReady: boolean,
  problem: string | null
): string => {
  if (flow.plan) {
    return copy.nothingUploaded;
  }

  if (isReady && problem) {
    return problem;
  }

  return copy.hostedByWorker;
};

const PublishPaneFoot = ({
  flow,
  isReady,
  onCheck,
  onClose,
  problem,
}: PublishPaneFootProps): ReactElement => {
  const { clearPlan: onBack, confirm: onConfirm, plan } = flow;
  const isBusy = flow.busy !== null;

  return (
    <div className="modal-foot">
      <span className="share-foot-note">
        {toFootNote(flow, isReady, problem)}
      </span>
      <span className="share-spacer" />
      {plan && (
        <button
          type="button"
          className="btn ghost"
          disabled={isBusy}
          onClick={onBack}
        >
          {copy.back}
        </button>
      )}
      {plan && (
        <button
          type="button"
          className="btn primary"
          disabled={isBusy}
          onClick={onConfirm}
          data-autofocus
        >
          {flow.busy ??
            pick(plan.republishOf, copy.republish, copy.publishWord)}
        </button>
      )}
      {!plan && (
        <button type="button" className="btn ghost" onClick={onClose}>
          {copy.close}
        </button>
      )}
      {!plan && (
        <button
          type="button"
          className="btn primary"
          disabled={!isReady || problem !== null || isBusy}
          onClick={onCheck}
        >
          {flow.busy ?? copy.checkWhatGoesPublic}
        </button>
      )}
    </div>
  );
};

export { PublishPaneFoot };
