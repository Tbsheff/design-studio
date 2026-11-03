import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { inspectDraftPacks } from "../../../shared/actions/packs/inspect-draft.js";
import { PackStore } from "../../design-system/index.js";
import type { Handle } from "../_core/handler.js";

type InspectDraftPacksInput = Input<typeof inspectDraftPacks>;

const handle = Effect.fn("packs.inspectDraft")(function* run(
  input: InspectDraftPacksInput
) {
  const store = yield* PackStore;

  return yield* store.draftStatus(input.projectId);
}) satisfies Handle<typeof inspectDraftPacks>;

export { handle };
