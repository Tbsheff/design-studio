import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { setStatusConnection } from "../../../shared/actions/connection/set-status.js";
import { McpSettingsWriter } from "../../mcp-life/index.js";
import type { Handle } from "../_core/handler.js";

type SetStatusConnectionInput = Input<typeof setStatusConnection>;

const handle = Effect.fn("connection.setStatus")(function* run(
  input: SetStatusConnectionInput
) {
  const writer = yield* McpSettingsWriter;

  return yield* writer.update(input);
}) satisfies Handle<typeof setStatusConnection>;

export { handle };
