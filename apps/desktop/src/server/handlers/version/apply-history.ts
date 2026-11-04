import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { applyHistoryVersion } from "../../../shared/actions/version/apply-history.js";
import { VersionWriter } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type ApplyHistoryVersionInput = Input<typeof applyHistoryVersion>;

const handle = Effect.fn("version.applyHistory")(function* run(
  input: ApplyHistoryVersionInput
) {
  const writer = yield* VersionWriter;

  return yield* writer.step(
    { directionId: input.directionId, projectId: input.projectId },
    "redo"
  );
}) satisfies Handle<typeof applyHistoryVersion>;

export { handle };
