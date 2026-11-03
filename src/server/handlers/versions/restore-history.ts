import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { restoreHistoryVersions } from "../../../shared/actions/versions/restore-history.js";
import { VersionWriter } from "../../store/version-writer.js";
import type { Handle } from "../_core/handler.js";

type RestoreHistoryVersionsInput = Input<typeof restoreHistoryVersions>;

const handle = Effect.fn("versions.restoreHistory")(function* run(
  input: RestoreHistoryVersionsInput
) {
  const writer = yield* VersionWriter;

  return yield* writer.step(
    { directionId: input.directionId, projectId: input.projectId },
    "undo"
  );
}) satisfies Handle<typeof restoreHistoryVersions>;

export { handle };
