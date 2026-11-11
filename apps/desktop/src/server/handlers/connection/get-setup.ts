import type { getSetupConnection } from "@design-studio/actions/connection/get-setup";
import { Effect } from "effect";

import { McpSettingsStore } from "../../mcp-life/index.js";
import type { Handle } from "../_core/handler.js";

const handle = Effect.fn("connection.getSetup")(function* run() {
  const store = yield* McpSettingsStore;

  return yield* store.setup();
}) satisfies Handle<typeof getSetupConnection>;

export { handle };
