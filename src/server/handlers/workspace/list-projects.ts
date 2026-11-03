import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listProjectsWorkspace } from "../../../shared/actions/workspace/list-projects.js";
import { McpReadStore } from "../../preview/index.js";
import type { Handle } from "../_core/handler.js";

type ListProjectsWorkspaceInput = Input<typeof listProjectsWorkspace>;

const handle = Effect.fn("workspace.listProjects")(function* run(
  _input: ListProjectsWorkspaceInput
) {
  const store = yield* McpReadStore;
  const items = yield* store.projectList();

  return { items };
}) satisfies Handle<typeof listProjectsWorkspace>;

export { handle };
