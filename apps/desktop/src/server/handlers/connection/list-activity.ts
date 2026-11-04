import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listActivityConnection } from "../../../shared/actions/connection/list-activity.js";
import { McpActivityLog } from "../../mcp-life/index.js";
import type { Handle } from "../_core/handler.js";

type ListActivityConnectionInput = Input<typeof listActivityConnection>;

const handle = Effect.fn("connection.listActivity")(function* run(
  input: ListActivityConnectionInput
) {
  const service = yield* McpActivityLog;

  return yield* service.list(input.projectId);
}) satisfies Handle<typeof listActivityConnection>;

export { handle };
