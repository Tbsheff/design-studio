import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { deleteSessionVersions } from "../../../shared/actions/versions/delete-session.js";
import { VersionWriter } from "../../store/index.js";
import type { Handle, Preview } from "../_core/handler.js";

const SHORT_ID = 8;

type DeleteSessionVersionsInput = Input<typeof deleteSessionVersions>;

const handle = Effect.fn("versions.deleteSession")(function* run(
  input: DeleteSessionVersionsInput
) {
  const writer = yield* VersionWriter;

  return yield* writer.endSession({
    action: "discard",
    baseVersionId: input.baseVersionId,
    directionId: input.directionId,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof deleteSessionVersions>;

const preview = Effect.fn("versions.deleteSession.preview")(function* card(
  input: DeleteSessionVersionsInput
) {
  yield* Effect.void;

  return {
    action: "Discard edits",
    detail: `Put the files of direction ${input.directionId} back to version ${input.baseVersionId.slice(0, SHORT_ID)}. Unsaved edits of this session are lost.`,
    title: "Discard this edit session?",
  };
}) satisfies Preview<typeof deleteSessionVersions>;

export { handle, preview };
