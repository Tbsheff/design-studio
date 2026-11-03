import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { deleteSessionVersion } from "../../../shared/actions/version/delete-session.js";
import { VersionWriter } from "../../store/index.js";
import type { Handle, Preview } from "../_core/handler.js";

const SHORT_ID = 8;

type DeleteSessionVersionInput = Input<typeof deleteSessionVersion>;

const handle = Effect.fn("version.deleteSession")(function* run(
  input: DeleteSessionVersionInput
) {
  const writer = yield* VersionWriter;

  return yield* writer.endSession({
    action: "discard",
    baseVersionId: input.baseVersionId,
    directionId: input.directionId,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof deleteSessionVersion>;

const preview = Effect.fn("version.deleteSession.preview")(function* card(
  input: DeleteSessionVersionInput
) {
  yield* Effect.void;

  return {
    action: "Discard edits",
    detail: `Put the files of direction ${input.directionId} back to version ${input.baseVersionId.slice(0, SHORT_ID)}. Unsaved edits of this session are lost.`,
    title: "Discard this edit session?",
  };
}) satisfies Preview<typeof deleteSessionVersion>;

export { handle, preview };
