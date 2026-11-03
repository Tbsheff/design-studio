import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { applyHistoryVersions } from "../../../shared/actions/versions/apply-history.js";
import { VersionWriter } from "../../store/version-writer.js";
import type { Handle } from "../_core/handler.js";

type ApplyHistoryVersionsInput = Input<typeof applyHistoryVersions>;

const handle = Effect.fn("versions.applyHistory")(function* run(
  input: ApplyHistoryVersionsInput
) {
  const writer = yield* VersionWriter;

  return yield* writer.step(
    { directionId: input.directionId, projectId: input.projectId },
    "redo"
  );
}) satisfies Handle<typeof applyHistoryVersions>;

export { handle };
