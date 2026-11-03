import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { setStatusMcpLife } from "../../../shared/actions/mcp-life/set-status.js";
import { ApprovalWindowQueue } from "../../export/approval-window-queue.js";
import type { Handle } from "../_core/handler.js";

type SetStatusMcpLifeInput = Input<typeof setStatusMcpLife>;

const handle = Effect.fn("mcp-life.setStatus")(function* run(
  input: SetStatusMcpLifeInput
) {
  const service = yield* ApprovalWindowQueue;

  return yield* service.update(input);
}) satisfies Handle<typeof setStatusMcpLife>;

export { handle };
