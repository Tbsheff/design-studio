import type { Input } from "@design-studio/actions/_core/action";
import type { createFolderWorkspace } from "@design-studio/actions/workspace/create-folder";
import { Effect } from "effect";

import { WorkspaceWriter } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type CreateFolderWorkspaceInput = Input<typeof createFolderWorkspace>;

const handle = Effect.fn("workspace.createFolder")(function* run(
  input: CreateFolderWorkspaceInput
) {
  const writer = yield* WorkspaceWriter;

  return yield* writer.add({ ...input });
}) satisfies Handle<typeof createFolderWorkspace>;

export { handle };
