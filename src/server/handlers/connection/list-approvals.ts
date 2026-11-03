import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listApprovalsConnection } from "../../../shared/actions/connection/list-approvals.js";
import { McpApprovalStore } from "../../mcp-life/index.js";
import type { Handle } from "../_core/handler.js";

type ListApprovalsConnectionInput = Input<typeof listApprovalsConnection>;

const handle = Effect.fn("connection.listApprovals")(function* run(
  input: ListApprovalsConnectionInput
) {
  const store = yield* McpApprovalStore;

  return yield* store.poll(input.seen ?? "", input.wait ?? 0);
}) satisfies Handle<typeof listApprovalsConnection>;

export { handle };
