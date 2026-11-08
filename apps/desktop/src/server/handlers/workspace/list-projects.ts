import type { Input } from "@design-studio/actions/_core/action";
import type { listProjectsWorkspace } from "@design-studio/actions/workspace/list-projects";
import { Effect } from "effect";

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
