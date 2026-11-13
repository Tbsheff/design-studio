import type { Input } from "@design-studio/actions/_core/action";
import type { inspectProposalsDesignRule } from "@design-studio/actions/design-rule/inspect-proposals";
import { PROPOSAL_MAX } from "@design-studio/actions/design-rule/proposal/schema";
import { Effect } from "effect";

import { RuleProposalStore } from "../../design-rules/index.js";
import type { Handle } from "../_core/handler.js";

type InspectProposalsDesignRuleInput = Input<typeof inspectProposalsDesignRule>;

const handle = Effect.fn("design-rule.inspectProposals")(function* run(
  input: InspectProposalsDesignRuleInput
) {
  const store = yield* RuleProposalStore;

  const open = yield* store.list({
    directionId: input.directionId,
    projectId: input.projectId,
  });

  return { items: open.items.slice(0, PROPOSAL_MAX) };
}) satisfies Handle<typeof inspectProposalsDesignRule>;

export { handle };
