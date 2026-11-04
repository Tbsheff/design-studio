import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { restoreHistoryVersion } from "@design-studio/actions/version/restore-history";
import { VersionWriter } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type RestoreHistoryVersionInput = Input<typeof restoreHistoryVersion>;

const handle = Effect.fn("version.restoreHistory")(function* run(
  input: RestoreHistoryVersionInput
) {
  const writer = yield* VersionWriter;

  return yield* writer.step(
    { directionId: input.directionId, projectId: input.projectId },
    "undo"
  );
}) satisfies Handle<typeof restoreHistoryVersion>;

export { handle };
