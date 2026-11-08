import type { Input } from "@design-studio/actions/_core/action";
import type { restoreHeadVersion } from "@design-studio/actions/version/restore-head";
import { Effect } from "effect";

import { VersionWriter } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type RestoreHeadVersionInput = Input<typeof restoreHeadVersion>;

const handle = Effect.fn("version.restoreHead")(function* run(
  input: RestoreHeadVersionInput
) {
  const service = yield* VersionWriter;

  return yield* service.restoreHead({
    directionId: input.directionId,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof restoreHeadVersion>;

export { handle };
