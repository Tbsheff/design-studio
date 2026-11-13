import type { Input } from "@design-studio/actions/_core/action";
import type { restoreChangeVersion } from "@design-studio/actions/version/restore-change";
import { Effect } from "effect";

import { ChangeRestoreWriter } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type RestoreChangeVersionInput = Input<typeof restoreChangeVersion>;

const handle = Effect.fn("version.restoreChange")(function* run(
  input: RestoreChangeVersionInput
) {
  const writer = yield* ChangeRestoreWriter;

  return yield* writer.restore({
    directionId: input.directionId,
    file: input.file,
    kind: input.kind,
    layerId: input.layerId,
    projectId: input.projectId,
    versionId: input.versionId,
  });
}) satisfies Handle<typeof restoreChangeVersion>;

export { handle };
