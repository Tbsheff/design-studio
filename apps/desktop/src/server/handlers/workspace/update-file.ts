import type { Input } from "@design-studio/actions/_core/action";
import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import { Conflict } from "@design-studio/actions/_core/errors/conflict";
import { Forbidden } from "@design-studio/actions/_core/errors/forbidden";
import type { DirectEditConflict } from "@design-studio/actions/direct-edit/errors/direct-edit-conflict";
import type { DirectEditFailed } from "@design-studio/actions/direct-edit/errors/direct-edit-failed";
import type { DirectEditNotFound } from "@design-studio/actions/direct-edit/errors/direct-edit-not-found";
import type { updateFileWorkspace } from "@design-studio/actions/workspace/update-file";
import { Effect } from "effect";

import type { DirectEditFailure } from "../../direct-edit/index.js";
import { isPathLocked } from "../../platform/path-lock/index.js";
import { DirectEditWriter } from "../../share/index.js";
import { FileLockStore, LocalPrincipal } from "../../store/index.js";
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

const LOCKED_MESSAGE =
  "This file is locked. Unlock it in Code to let Claude change it.";

const requireUnlocked = Effect.fn("workspace.updateFile.lock")(function* run(
  input: UpdateFileWorkspaceInput
) {
  const principal = yield* LocalPrincipal;

  if (principal.kind === "ui") {
    return;
  }

  const locks = yield* FileLockStore;

  const globs = yield* locks.get(input.projectId, input.directionId);

  if (isPathLocked(globs, input.path)) {
    return yield* new Forbidden({
      message: LOCKED_MESSAGE,
      perm: "studio.write",
    });
  }
});

const handle = Effect.fn("workspace.updateFile")(function* run(
  input: UpdateFileWorkspaceInput
) {
  yield* requireUnlocked(input);
  const writer = yield* DirectEditWriter;

  return yield* writer
    .updateFile(
      { directionId: input.directionId, projectId: input.projectId },
      { baseHash: input.baseHash, content: input.content, path: input.path }
    )
    .pipe(Effect.mapError(toFileFailure));
}) satisfies Handle<typeof updateFileWorkspace>;

export { handle };
