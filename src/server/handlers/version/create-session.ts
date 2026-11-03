import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { createSessionVersion } from "../../../shared/actions/version/create-session.js";
import { VersionWriter } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type CreateSessionVersionInput = Input<typeof createSessionVersion>;

const handle = Effect.fn("version.createSession")(function* run(
  input: CreateSessionVersionInput
) {
  const writer = yield* VersionWriter;

  return yield* writer.endSession({
    action: "save",
    baseVersionId: input.baseVersionId,
    directionId: input.directionId,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof createSessionVersion>;

export { handle };
