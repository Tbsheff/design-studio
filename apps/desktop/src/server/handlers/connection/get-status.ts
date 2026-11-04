import { Effect } from "effect";

import type { getStatusConnection } from "../../../shared/actions/connection/get-status.js";
import { McpSettingsStore } from "../../mcp-life/index.js";
import type { Handle } from "../_core/handler.js";

const handle = Effect.fn("connection.getStatus")(function* run() {
  const service = yield* McpSettingsStore;

  return yield* service.status();
}) satisfies Handle<typeof getStatusConnection>;

export { handle };
