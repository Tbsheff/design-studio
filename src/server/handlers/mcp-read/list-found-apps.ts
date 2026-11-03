import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listFoundAppsMcpRead } from "../../../shared/actions/mcp-read/list-found-apps.js";
import { McpReadStore } from "../../preview/mcp-read-store.js";
import type { Handle } from "../_core/handler.js";

type ListFoundAppsMcpReadInput = Input<typeof listFoundAppsMcpRead>;

const handle = Effect.fn("mcp-read.listFoundApps")(function* run(
  input: ListFoundAppsMcpReadInput
) {
  const store = yield* McpReadStore;

  return yield* store.foundApps(input.fresh === true);
}) satisfies Handle<typeof listFoundAppsMcpRead>;

export { handle };
