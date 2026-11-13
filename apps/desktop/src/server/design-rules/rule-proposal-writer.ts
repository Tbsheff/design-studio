import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import type {
  ProposalStatus,
  RuleProposalSet,
} from "@design-studio/actions/design-rule/proposal/schema";
import { Context, Effect, Layer } from "effect";

import { runDirectionWrite } from "../direct-edit/index.js";
import type { KnownFailure } from "../platform/attempt/index.js";
import { DesignRuleWriter } from "./design-rule-writer.js";
import { setProposalStatus } from "./rule-proposal-file.js";
import type { ProposalStatusFile } from "./rule-proposal-file.js";
import { RuleProposalStore } from "./rule-proposal-store.js";

interface SetProposalCommand {
  readonly directionId: string | null;
  readonly projectId: string;
  readonly proposalId: string;
  readonly status: ProposalStatus;
}

interface RuleProposalWriterApi {
  readonly set: (
    command: SetProposalCommand
  ) => Effect.Effect<RuleProposalSet, KnownFailure>;
}

const PROPOSAL_MODEL = "rule-proposal";

const CLOSED_MESSAGE =
  "This proposal is not open. Call inspect_proposals_design_rule for the open ones.";

class RuleProposalWriter extends Context.Service<
  RuleProposalWriter,
  RuleProposalWriterApi
>()("design-studio/design-rules/RuleProposalWriter") {
  declare public readonly access: "write";

  public static readonly layer = Layer.effect(
    RuleProposalWriter,
    Effect.gen(function* build() {
      const store = yield* RuleProposalStore;
      const rules = yield* DesignRuleWriter;

      return RuleProposalWriter.of({
        set: Effect.fn("RuleProposalWriter.set")(function* run(
          command: SetProposalCommand
        ) {
          const open = yield* store.list(command);

          const proposal =
            open.items.find((item) => item.id === command.proposalId) ?? null;

          if (open.status[command.status].includes(command.proposalId)) {
            return {
              id: command.proposalId,
              ruleId: null,
              status: command.status,
            };
          }

          if (proposal === null || open.directionId === null) {
            return yield* new NotFound({ message: CLOSED_MESSAGE });
          }

          const ids = {
            directionId: open.directionId,
            projectId: command.projectId,
          };

          let createdRuleId: string | null = null;

          if (command.status === "accepted") {
            const created = yield* rules.create({
              ...ids,
              line: proposal.text,
              model: PROPOSAL_MODEL,
            });

            createdRuleId = created.ruleId;
          }

          yield* runDirectionWrite<ProposalStatusFile, never>(
            ids,
            ({ runtime }) =>
              setProposalStatus(
                runtime.projectDir(command.projectId),
                proposal.id,
                command.status
              ),
            () => null
          );

          return {
            id: proposal.id,
            ruleId: createdRuleId,
            status: command.status,
          };
        }),
      });
    })
  );
}

export { RuleProposalWriter };

export type { RuleProposalWriterApi, SetProposalCommand };
