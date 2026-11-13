import { Layer } from "effect";

import {
  DesignRuleWriter,
  RuleProposalStore,
  RuleProposalWriter,
} from "../../design-rules/index.js";
import { DesignRuleLineRunner } from "../../project-ops/index.js";
import { ChangeStore, VersionStore } from "../../store/index.js";

const VersionReadLive = Layer.mergeAll(ChangeStore.layer, VersionStore.layer);

const ProposalStoreLive = RuleProposalStore.layer.pipe(
  Layer.provide(VersionReadLive)
);

const ProposalWriterDeps = Layer.mergeAll(
  ProposalStoreLive,
  DesignRuleWriter.layer
);

const ProposalWriterLive = RuleProposalWriter.layer.pipe(
  Layer.provide(ProposalWriterDeps)
);

const DesignRuleLive = Layer.mergeAll(
  DesignRuleLineRunner.layer,
  DesignRuleWriter.layer,
  ProposalStoreLive,
  ProposalWriterLive
);

export { DesignRuleLive };
