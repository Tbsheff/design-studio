import type { Input } from "@design-studio/actions/_core/action";
import type { listVariantsWorkspace } from "@design-studio/actions/workspace/list-variants";
import { Effect } from "effect";

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
