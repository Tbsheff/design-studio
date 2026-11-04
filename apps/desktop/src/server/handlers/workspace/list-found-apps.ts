import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listFoundAppsWorkspace } from "../../../shared/actions/workspace/list-found-apps.js";
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
