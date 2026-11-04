import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { restoreVersion } from "../../../shared/actions/version/restore.js";
import { VersionWriter } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type RestoreVersionInput = Input<typeof restoreVersion>;

const handle = Effect.fn("version.restore")(function* run(
  input: RestoreVersionInput
) {
  const writer = yield* VersionWriter;

  return yield* writer.restore({
    directionId: input.directionId,
    projectId: input.projectId,
    versionId: input.versionId,
  });
}) satisfies Handle<typeof restoreVersion>;

export { handle };
