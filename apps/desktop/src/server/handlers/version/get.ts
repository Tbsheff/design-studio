import type { Input } from "@design-studio/actions/_core/action";
import type { getVersion } from "@design-studio/actions/version/get";
import { Effect } from "effect";

import { VersionStore } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type GetVersionInput = Input<typeof getVersion>;

const handle = Effect.fn("version.get")(function* run(input: GetVersionInput) {
  const store = yield* VersionStore;

  return yield* store.get(input.projectId, input.versionId);
}) satisfies Handle<typeof getVersion>;

export { handle };
