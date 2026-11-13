import { routes } from "@design-studio/actions/design-rule/routes";
import { useCallback, useEffect, useTransition } from "react";

import { subscribeDone, useAction } from "../../platform/query.js";
import { toFirstProposal } from "./rule-proposal-model.js";
import type { RuleProposalView } from "./rule-proposal-model.js";

interface RuleProposalState {
  readonly error: string | null;
  readonly isPending: boolean;
  readonly proposal: RuleProposalView | null;
  readonly handleAccept: () => void;
  readonly handleDismiss: () => void;
}

type ProposalStatus = "accepted" | "dismissed";

const VERSION_LIST = "version.list";

const useRuleProposal = (
  projectId: string,
  directionId: string | null
): RuleProposalState => {
  const inspect = useAction(routes.inspectProposalsDesignRule, {
    directionId,
    projectId,
  });

  const setter = useAction(routes.setProposalDesignRule);
  const [isPending, startTransition] = useTransition();
  const { refetch } = inspect;
  const { run: setProposal } = setter;
  const proposal = toFirstProposal(inspect.data);
  const proposalId = proposal?.id ?? null;
  const error = setter.error?.message ?? null;

  useEffect(
    () =>
      subscribeDone((done): void => {
        if (done.invalidates.includes(VERSION_LIST)) {
          void refetch();
        }
      }),
    [refetch]
  );

  const handleSet = useCallback(
    (status: ProposalStatus): void => {
      if (proposalId === null) {
        return;
      }

      startTransition(async () => {
        await setProposal({ directionId, projectId, proposalId, status });
      });
    },
    [directionId, projectId, proposalId, setProposal]
  );

  const handleAccept = useCallback((): void => {
    handleSet("accepted");
  }, [handleSet]);

  const handleDismiss = useCallback((): void => {
    handleSet("dismissed");
  }, [handleSet]);

  return { error, handleAccept, handleDismiss, isPending, proposal };
};

export { useRuleProposal };

export type { RuleProposalState };
