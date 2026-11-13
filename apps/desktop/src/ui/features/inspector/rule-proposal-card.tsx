import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { isClassProposal } from "./rule-proposal-model.js";
import type { RuleProposalView } from "./rule-proposal-model.js";
import { useRuleProposal } from "./use-rule-proposal.js";

interface Props {
  readonly directionId: string | null;
  readonly projectId: string;
}

const ICON_SIZE = 14;

const toProposalLine = (proposal: RuleProposalView): string => {
  if (isClassProposal(proposal)) {
    return copy.proposalClassLine(proposal.value, proposal.count);
  }

  return copy.proposalStyleLine(
    proposal.property,
    proposal.value,
    proposal.count
  );
};

const RuleProposalCard = ({
  directionId,
  projectId,
}: Props): ReactElement | null => {
  const state = useRuleProposal(projectId, directionId);
  const { proposal } = state;

  if (proposal === null) {
    return null;
  }

  return (
    <aside
      className="rule-proposal"
      aria-label={copy.proposalLabel}
      data-tip={proposal.text}
    >
      <Icon name="sparkle" size={ICON_SIZE} />
      <span className="rule-proposal-line">{toProposalLine(proposal)}</span>
      {state.error && (
        <span className="rule-proposal-error">{state.error}</span>
      )}
      <div className="rule-proposal-actions">
        <button
          type="button"
          className="btn ghost small"
          disabled={state.isPending}
          onClick={state.handleDismiss}
        >
          {copy.proposalDismiss}
        </button>
        <button
          type="button"
          className="btn small primary"
          disabled={state.isPending}
          onClick={state.handleAccept}
        >
          {copy.proposalAccept}
        </button>
      </div>
    </aside>
  );
};

export { RuleProposalCard };
