import type { Input } from "@design-studio/actions/_core/action";
import type { inspectFlowPage } from "@design-studio/actions/page/inspect-flow";
import { Effect } from "effect";

import { PageFlowStore } from "../../canvas/index.js";
import type { Handle } from "../_core/handler.js";

type InspectFlowPageInput = Input<typeof inspectFlowPage>;

const handle = Effect.fn("page.inspectFlow")(function* run(
  input: InspectFlowPageInput
) {
  const store = yield* PageFlowStore;

  return yield* store.inspect({
    directionId: input.directionId,
    entry: input.entry,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof inspectFlowPage>;

export { handle };
