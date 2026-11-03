import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { getVersions } from "../../../shared/actions/versions/get.js";
import { VersionStore } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type GetVersionsInput = Input<typeof getVersions>;

const handle = Effect.fn("versions.get")(function* run(
  input: GetVersionsInput
) {
  const store = yield* VersionStore;

  return yield* store.get(input.projectId, input.versionId);
}) satisfies Handle<typeof getVersions>;

export { handle };
