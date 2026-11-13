interface RuleProposalView {
  readonly count: number;
  readonly id: string;
  readonly layerIds: readonly string[];
  readonly property: string;
  readonly text: string;
  readonly value: string;
}

interface RuleProposalList {
  readonly items: readonly RuleProposalView[];
}

const toFirstProposal = (
  list: RuleProposalList | null
): RuleProposalView | null => list?.items[0] ?? null;

const isClassProposal = (proposal: RuleProposalView): boolean =>
  proposal.value.startsWith(proposal.property);

export { isClassProposal, toFirstProposal };

export type { RuleProposalList, RuleProposalView };
