import type { Input } from "@design-studio/actions/_core/action";
import type { applyHistoryVersion } from "@design-studio/actions/version/apply-history";
import { Effect } from "effect";

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
