import type { Input } from "@design-studio/actions/_core/action";
import type { setDefaultFolderWorkspace } from "@design-studio/actions/workspace/set-default-folder";
import { Effect } from "effect";

import { WorkspaceStore, WorkspaceWriter } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type SetDefaultFolderWorkspaceInput = Input<typeof setDefaultFolderWorkspace>;

const handle = Effect.fn("workspace.setDefaultFolder")(function* run(
  input: SetDefaultFolderWorkspaceInput
) {
  const store = yield* WorkspaceStore;
  const writer = yield* WorkspaceWriter;
  const previous = yield* store.currentFolder();
  const next = yield* writer.setFolder(input.path);

  if (previous !== next) {
    yield* writer.add({ path: previous }).pipe(
      Effect.tapError((failure) =>
        Effect.logError("could not keep the old default folder", failure)
      ),
      Effect.ignore
    );
  }

  return yield* store.list();
}) satisfies Handle<typeof setDefaultFolderWorkspace>;

export { handle };
