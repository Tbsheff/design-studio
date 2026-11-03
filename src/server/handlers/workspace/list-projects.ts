import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listProjectsWorkspace } from "../../../shared/actions/workspace/list-projects.js";
import { McpReadStore } from "../../preview/index.js";
import { LocalOrgScope } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type ListProjectsWorkspaceInput = Input<typeof listProjectsWorkspace>;

const handle = Effect.fn("workspace.listProjects")(function* run(
  _input: ListProjectsWorkspaceInput
) {
  const store = yield* McpReadStore;
  const scope = yield* LocalOrgScope;
  const items = yield* store.projectList(scope);

  return { items };
}) satisfies Handle<typeof listProjectsWorkspace>;

export { handle };
