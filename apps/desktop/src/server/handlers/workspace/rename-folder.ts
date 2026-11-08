import type { Input } from "@design-studio/actions/_core/action";
import type { renameFolderWorkspace } from "@design-studio/actions/workspace/rename-folder";
import { Effect } from "effect";

import { WorkspaceWriter } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type RenameFolderWorkspaceInput = Input<typeof renameFolderWorkspace>;

const handle = Effect.fn("workspace.renameFolder")(function* run(
  input: RenameFolderWorkspaceInput
) {
  const writer = yield* WorkspaceWriter;

  return yield* writer.rename(input.workspaceId, input.label);
}) satisfies Handle<typeof renameFolderWorkspace>;

export { handle };
