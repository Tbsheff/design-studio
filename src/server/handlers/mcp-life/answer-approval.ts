import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { answerApprovalMcpLife } from "../../../shared/actions/mcp-life/answer-approval.js";
import { ApprovalWindowQueue } from "../../export/approval-window-queue.js";
import type { Handle, Preview } from "../_core/handler.js";

type AnswerApprovalMcpLifeInput = Input<typeof answerApprovalMcpLife>;

const handle = Effect.fn("mcp-life.answerApproval")(function* run(
  input: AnswerApprovalMcpLifeInput
) {
  const service = yield* ApprovalWindowQueue;

  return yield* service.answer(input.id, input.allow);
}) satisfies Handle<typeof answerApprovalMcpLife>;

const preview = Effect.fn("mcp-life.answerApproval.preview")(function* card(
  input: AnswerApprovalMcpLifeInput
) {
  const service = yield* ApprovalWindowQueue;
  const open = yield* service.peek(input.id);

  return {
    action: "Answer request",
    detail: open.detail,
    title: open.title,
  };
}) satisfies Preview<typeof answerApprovalMcpLife>;

export { handle, preview };
