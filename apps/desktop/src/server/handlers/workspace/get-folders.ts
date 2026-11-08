import type { Input } from "@design-studio/actions/_core/action";
import type { getFoldersWorkspace } from "@design-studio/actions/workspace/get-folders";
import { Effect } from "effect";

import { WorkspaceStore } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type GetFoldersWorkspaceInput = Input<typeof getFoldersWorkspace>;

const handle = Effect.fn("workspace.getFolders")(function* run(
  _input: GetFoldersWorkspaceInput
) {
  const store = yield* WorkspaceStore;

  return yield* store.list();
}) satisfies Handle<typeof getFoldersWorkspace>;

export { handle };
