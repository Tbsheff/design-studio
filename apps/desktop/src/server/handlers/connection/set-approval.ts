import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { setApprovalConnection } from "@design-studio/actions/connection/set-approval";
import { ApprovalWindowQueue } from "../../mcp-life/index.js";
import type { Handle } from "../_core/handler.js";

type SetApprovalConnectionInput = Input<typeof setApprovalConnection>;

const handle = Effect.fn("connection.setApproval")(function* run(
  input: SetApprovalConnectionInput
) {
  const queue = yield* ApprovalWindowQueue;

  return yield* queue.answer(input.approvalId, input.allow);
}) satisfies Handle<typeof setApprovalConnection>;

export { handle };
