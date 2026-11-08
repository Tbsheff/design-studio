import type { Input } from "@design-studio/actions/_core/action";
import type { listFoundAppsWorkspace } from "@design-studio/actions/workspace/list-found-apps";
import { Effect } from "effect";

import { McpReadStore } from "../../preview/index.js";
import type { Handle } from "../_core/handler.js";

type ListFoundAppsWorkspaceInput = Input<typeof listFoundAppsWorkspace>;

const handle = Effect.fn("workspace.listFoundApps")(function* run(
  input: ListFoundAppsWorkspaceInput
) {
  const store = yield* McpReadStore;

  return yield* store.foundApps(input.fresh === true);
}) satisfies Handle<typeof listFoundAppsWorkspace>;

export { handle };
