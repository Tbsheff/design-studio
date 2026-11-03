import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listVariantsWorkspace } from "../../../shared/actions/workspace/list-variants.js";
import { McpReadStore } from "../../preview/index.js";
import type { Handle } from "../_core/handler.js";

type ListVariantsWorkspaceInput = Input<typeof listVariantsWorkspace>;

const handle = Effect.fn("workspace.listVariants")(function* run(
  input: ListVariantsWorkspaceInput
) {
  const store = yield* McpReadStore;

  const items = yield* store.variantList({ projectId: input.projectId });

  return { items };
}) satisfies Handle<typeof listVariantsWorkspace>;

export { handle };
