import type { Input } from "@design-studio/actions/_core/action";
import type { inspectDiffVersion } from "@design-studio/actions/version/inspect-diff";
import { Effect } from "effect";

import { VersionStore } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type InspectDiffVersionInput = Input<typeof inspectDiffVersion>;

const handle = Effect.fn("version.inspectDiff")(function* run(
  input: InspectDiffVersionInput
) {
  const store = yield* VersionStore;

  return yield* store.changes({
    directionId: input.directionId ?? null,
    from: input.from,
    isThumbs: input.thumbnails ?? true,
    projectId: input.projectId,
    to: input.to ?? null,
  });
}) satisfies Handle<typeof inspectDiffVersion>;

export { handle };
