import type { Input } from "@design-studio/actions/_core/action";
import type { listApprovalsConnection } from "@design-studio/actions/connection/list-approvals";
import { Effect } from "effect";

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
