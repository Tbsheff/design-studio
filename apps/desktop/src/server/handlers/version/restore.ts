import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { restoreVersion } from "@design-studio/actions/version/restore";
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
