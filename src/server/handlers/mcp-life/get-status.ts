import { Effect } from "effect";

import type { getStatusMcpLife } from "../../../shared/actions/mcp-life/get-status.js";
import { McpSettingsStore } from "../../export/mcp-settings-store.js";
import type { Handle } from "../_core/handler.js";

const handle = Effect.fn("mcp-life.getStatus")(function* run() {
  const service = yield* McpSettingsStore;

  return yield* service.status();
}) satisfies Handle<typeof getStatusMcpLife>;

export { handle };
