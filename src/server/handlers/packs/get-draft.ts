import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { getDraftPacks } from "../../../shared/actions/packs/get-draft.js";
import { PackStore } from "../../design-system/ops/pack-store.js";
import type { Handle } from "../_core/handler.js";

type GetDraftPacksInput = Input<typeof getDraftPacks>;

const handle = Effect.fn("packs.getDraft")(function* run(
  input: GetDraftPacksInput
) {
  const store = yield* PackStore;

  return yield* store.draft(input.projectId);
}) satisfies Handle<typeof getDraftPacks>;

export { handle };
