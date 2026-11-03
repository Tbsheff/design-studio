import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { restoreVersions } from "../../../shared/actions/versions/restore.js";
import { VersionWriter } from "../../store/version-writer.js";
import type { Handle } from "../_core/handler.js";

type RestoreVersionsInput = Input<typeof restoreVersions>;

const handle = Effect.fn("versions.restore")(function* run(
  input: RestoreVersionsInput
) {
  const writer = yield* VersionWriter;

  return yield* writer.restore({
    directionId: input.directionId,
    projectId: input.projectId,
    versionId: input.versionId,
  });
}) satisfies Handle<typeof restoreVersions>;

export { handle };
