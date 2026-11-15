import type {
  McpApprovalOutcome,
  PermissionDecision,
} from "@design-studio/contracts";
import { Schema } from "effect";

import type { ActionAsk } from "../agent/ask-gate.js";
import type { ApprovalQueue } from "./approvals.js";

const AGENT_CLIENT = "agent";

const NOTES: Readonly<
  Record<Exclude<McpApprovalOutcome, "allow" | "deny">, string>
> = {
  closed:
    "Design Studio was not open, so nobody could answer the approval card. Ask the user to open Design Studio, then try again.",
  timeout:
    "Nobody answered the approval card in time. Ask the user to answer the card in Design Studio, then try again.",
};

const isProjectArgs = Schema.is(Schema.Struct({ projectId: Schema.String }));

const toDecision = (outcome: McpApprovalOutcome): PermissionDecision => {
  if (outcome === "allow") {
    return { allow: true };
  }

  if (outcome === "deny") {
    return { allow: false };
  }

  return { allow: false, note: NOTES[outcome] };
};

const toQueueAsk =
  (approvals: ApprovalQueue): ActionAsk =>
  async (tool, input, card) => {
    let projectId: string | null = null;

    if (isProjectArgs(input)) {
      ({ projectId } = input);
    }

    const outcome = await approvals.ask({
      ...card,
      client: AGENT_CLIENT,
      projectId,
      tool,
    });

    return toDecision(outcome);
  };

export { toQueueAsk };
