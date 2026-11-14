import type { Input } from "@design-studio/actions/_core/action";
import type { setStatusConnection } from "@design-studio/actions/connection/set-status";
import { Effect } from "effect";

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
