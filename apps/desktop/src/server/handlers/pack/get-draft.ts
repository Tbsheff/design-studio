import type { Input } from "@design-studio/actions/_core/action";
import type { getDraftPack } from "@design-studio/actions/pack/get-draft";
import { Effect } from "effect";

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
