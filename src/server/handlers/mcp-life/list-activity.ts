import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listActivityMcpLife } from "../../../shared/actions/mcp-life/list-activity.js";
import { McpActivityLog } from "../../export/mcp-activity-log.js";
import type { Handle } from "../_core/handler.js";

type ListActivityMcpLifeInput = Input<typeof listActivityMcpLife>;

const handle = Effect.fn("mcp-life.listActivity")(function* run(
  input: ListActivityMcpLifeInput
) {
  const service = yield* McpActivityLog;

  return yield* service.list(input.projectId);
}) satisfies Handle<typeof listActivityMcpLife>;

export { handle };
