import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listApprovalsMcpLife } from "../../../shared/actions/mcp-life/list-approvals.js";
import { ApprovalWindowQueue } from "../../export/approval-window-queue.js";
import type { Handle } from "../_core/handler.js";

type ListApprovalsMcpLifeInput = Input<typeof listApprovalsMcpLife>;

const handle = Effect.fn("mcp-life.listApprovals")(function* run(
  input: ListApprovalsMcpLifeInput
) {
  const service = yield* ApprovalWindowQueue;

  return yield* service.poll(input.seen ?? "", input.wait ?? 0);
}) satisfies Handle<typeof listApprovalsMcpLife>;

export { handle };
