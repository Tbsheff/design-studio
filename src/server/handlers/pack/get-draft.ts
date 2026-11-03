import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { getDraftPack } from "../../../shared/actions/pack/get-draft.js";
import { PackStore } from "../../design-system/index.js";
import type { Handle } from "../_core/handler.js";

type GetDraftPackInput = Input<typeof getDraftPack>;

const handle = Effect.fn("pack.getDraft")(function* run(
  input: GetDraftPackInput
) {
  const store = yield* PackStore;

  return yield* store.draft(input.projectId);
}) satisfies Handle<typeof getDraftPack>;

export { handle };
