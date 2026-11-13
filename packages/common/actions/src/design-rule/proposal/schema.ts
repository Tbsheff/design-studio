import { Effect, Schema } from "effect";

import { DirectionIdSchema } from "../../_core/ids.js";

const PROPOSAL_MAX = 5;

const PROPOSAL_LAYER_MAX = 20;

const ProposalIdSchema = Schema.String.check(
  Schema.isPattern(/^p-[a-f0-9]{10}$/u)
).annotate({
  description: "Proposal id from inspect_proposals_design_rule.",
});

const ProposalStatusSchema = Schema.Literals([
  "accepted",
  "dismissed",
]).annotate({
  description:
    "accepted saves the proposal as a project rule. dismissed hides it for good.",
});

const ProposalDirectionFieldSchema = Schema.NullOr(DirectionIdSchema)
  .annotate({
    description: "Direction id. Pass null for the main direction.",
  })
  .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null)));

const RuleProposalSchema = Schema.Struct({
  count: Schema.Int,
  id: ProposalIdSchema,
  layerIds: Schema.Array(Schema.String).check(
    Schema.isMaxLength(PROPOSAL_LAYER_MAX)
  ),
  property: Schema.String,
  text: Schema.String,
  value: Schema.String,
});

const RuleProposalsSchema = Schema.Struct({
  items: Schema.Array(RuleProposalSchema).check(
    Schema.isMaxLength(PROPOSAL_MAX)
  ),
});

const RuleProposalSetSchema = Schema.Struct({
  id: ProposalIdSchema,
  ruleId: Schema.NullOr(Schema.String),
  status: ProposalStatusSchema,
});

type RuleProposal = typeof RuleProposalSchema.Type;

type RuleProposals = typeof RuleProposalsSchema.Type;

type RuleProposalSet = typeof RuleProposalSetSchema.Type;

type ProposalStatus = typeof ProposalStatusSchema.Type;

export {
  PROPOSAL_LAYER_MAX,
  PROPOSAL_MAX,
  ProposalDirectionFieldSchema,
  ProposalIdSchema,
  ProposalStatusSchema,
  RuleProposalSchema,
  RuleProposalSetSchema,
  RuleProposalsSchema,
};

export type { ProposalStatus, RuleProposal, RuleProposalSet, RuleProposals };
