import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listVariantsMcpRead } from "../../../shared/actions/mcp-read/list-variants.js";
import { McpReadStore } from "../../preview/mcp-read-store.js";
import type { Handle } from "../_core/handler.js";

type ListVariantsMcpReadInput = Input<typeof listVariantsMcpRead>;

const handle = Effect.fn("mcp-read.listVariants")(function* run(
  input: ListVariantsMcpReadInput
) {
  const store = yield* McpReadStore;

  const items = yield* store.variantList({ projectId: input.projectId });

  return { items };
}) satisfies Handle<typeof listVariantsMcpRead>;

export { handle };
