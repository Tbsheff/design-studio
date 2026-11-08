import type { Input } from "@design-studio/actions/_core/action";
import type { restoreWorkTreeVersion } from "@design-studio/actions/version/restore-work-tree";
import { Effect } from "effect";

import { VersionWriter } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type RestoreWorkTreeVersionInput = Input<typeof restoreWorkTreeVersion>;

const handle = Effect.fn("version.restoreWorkTree")(function* run(
  input: RestoreWorkTreeVersionInput
) {
  const service = yield* VersionWriter;

  return yield* service.discard({
    directionId: input.directionId,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof restoreWorkTreeVersion>;

export { handle };
