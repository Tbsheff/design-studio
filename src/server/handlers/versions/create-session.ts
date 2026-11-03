import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { createSessionVersions } from "../../../shared/actions/versions/create-session.js";
import { VersionWriter } from "../../store/version-writer.js";
import type { Handle } from "../_core/handler.js";

type CreateSessionVersionsInput = Input<typeof createSessionVersions>;

const handle = Effect.fn("versions.createSession")(function* run(
  input: CreateSessionVersionsInput
) {
  const writer = yield* VersionWriter;

  return yield* writer.endSession({
    action: "save",
    baseVersionId: input.baseVersionId,
    directionId: input.directionId,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof createSessionVersions>;

export { handle };
