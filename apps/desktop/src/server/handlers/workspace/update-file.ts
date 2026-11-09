import type { Input } from "@design-studio/actions/_core/action";
import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import { Conflict } from "@design-studio/actions/_core/errors/conflict";
import type { DirectEditConflict } from "@design-studio/actions/direct-edit/errors/direct-edit-conflict";
import type { DirectEditFailed } from "@design-studio/actions/direct-edit/errors/direct-edit-failed";
import type { DirectEditNotFound } from "@design-studio/actions/direct-edit/errors/direct-edit-not-found";
import type { updateFileWorkspace } from "@design-studio/actions/workspace/update-file";
import { Effect } from "effect";

import type { DirectEditFailure } from "../../direct-edit/index.js";
import { DirectEditWriter } from "../../share/index.js";
import type { Handle } from "../_core/handler.js";

type UpdateFileWorkspaceInput = Input<typeof updateFileWorkspace>;

type FileFailure =
  | BadRequest
  | Conflict
  | Exclude<
      DirectEditFailure,
      DirectEditConflict | DirectEditFailed | DirectEditNotFound
    >;

const toFileFailure = (cause: DirectEditFailure): FileFailure => {
  if (cause._tag === "DirectEditConflict") {
    return new Conflict({ message: cause.message });
  }

  if (
    cause._tag === "DirectEditFailed" ||
    cause._tag === "DirectEditNotFound"
  ) {
    return new BadRequest({ message: cause.message });
  }

  return cause;
};

const handle = Effect.fn("workspace.updateFile")(function* run(
  input: UpdateFileWorkspaceInput
) {
  const writer = yield* DirectEditWriter;

  return yield* writer
    .updateFile(
      { directionId: input.directionId, projectId: input.projectId },
      { baseHash: input.baseHash, content: input.content, path: input.path }
    )
    .pipe(Effect.mapError(toFileFailure));
}) satisfies Handle<typeof updateFileWorkspace>;

export { handle };
