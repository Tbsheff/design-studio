import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { listActivityConnection } from "@design-studio/actions/connection/list-activity";
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
