import type { Input } from "@design-studio/actions/_core/action";
import type { setProposalDesignRule } from "@design-studio/actions/design-rule/set-proposal";
import { Effect } from "effect";

import { RuleProposalWriter } from "../../design-rules/index.js";
import type { Handle } from "../_core/handler.js";

type SetProposalDesignRuleInput = Input<typeof setProposalDesignRule>;

const handle = Effect.fn("design-rule.setProposal")(function* run(
  input: SetProposalDesignRuleInput
) {
  const writer = yield* RuleProposalWriter;

  return yield* writer.set({
    directionId: input.directionId,
    projectId: input.projectId,
    proposalId: input.proposalId,
    status: input.status,
  });
}) satisfies Handle<typeof setProposalDesignRule>;

export { handle };
