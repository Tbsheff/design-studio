import type { Input } from "@design-studio/actions/_core/action";
import type { createVersion } from "@design-studio/actions/version/create";
import { Effect } from "effect";

import { VersionWriter } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type CreateVersionInput = Input<typeof createVersion>;

const handle = Effect.fn("version.create")(function* run(
  input: CreateVersionInput
) {
  const service = yield* VersionWriter;

  return yield* service.keep({
    directionId: input.directionId,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof createVersion>;

export { handle };
