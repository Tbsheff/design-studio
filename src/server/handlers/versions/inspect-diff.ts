import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { inspectDiffVersions } from "../../../shared/actions/versions/inspect-diff.js";
import { VersionStore } from "../../store/version-store.js";
import type { Handle } from "../_core/handler.js";

type InspectDiffVersionsInput = Input<typeof inspectDiffVersions>;

const handle = Effect.fn("versions.inspectDiff")(function* run(
  input: InspectDiffVersionsInput
) {
  const store = yield* VersionStore;

  return yield* store.changes({
    directionId: input.directionId ?? null,
    from: input.from,
    isThumbs: input.thumbnails ?? true,
    projectId: input.projectId,
    to: input.to ?? null,
  });
}) satisfies Handle<typeof inspectDiffVersions>;

export { handle };
