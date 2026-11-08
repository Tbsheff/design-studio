import type { Input } from "@design-studio/actions/_core/action";
import type { deleteFolderWorkspace } from "@design-studio/actions/workspace/delete-folder";
import { Effect } from "effect";

import { WorkspaceWriter } from "../../store/index.js";
import type { Handle, Preview } from "../_core/handler.js";

type DeleteFolderWorkspaceInput = Input<typeof deleteFolderWorkspace>;

const handle = Effect.fn("workspace.deleteFolder")(function* run(
  input: DeleteFolderWorkspaceInput
) {
  const writer = yield* WorkspaceWriter;

  yield* writer.remove(input.workspaceId);

  return { ok: true };
}) satisfies Handle<typeof deleteFolderWorkspace>;

const preview = Effect.fn("workspace.deleteFolder.preview")(function* card(
  input: DeleteFolderWorkspaceInput
) {
  return yield* Effect.succeed({
    action: "Remove a saved folder",
    detail: "The folder and its files stay on disk. Only the list entry goes.",
    title: `Remove the saved folder ${input.workspaceId}`,
  });
}) satisfies Preview<typeof deleteFolderWorkspace>;

export { handle, preview };
