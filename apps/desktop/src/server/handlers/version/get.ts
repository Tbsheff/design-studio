import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { getVersion } from "../../../shared/actions/version/get.js";
import { VersionStore } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type GetVersionInput = Input<typeof getVersion>;

const handle = Effect.fn("version.get")(function* run(input: GetVersionInput) {
  const store = yield* VersionStore;

  return yield* store.get(input.projectId, input.versionId);
}) satisfies Handle<typeof getVersion>;

export { handle };
