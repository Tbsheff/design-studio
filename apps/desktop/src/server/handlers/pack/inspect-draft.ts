import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { inspectDraftPack } from "../../../shared/actions/pack/inspect-draft.js";
import { PackStore } from "../../design-system/index.js";
import type { Handle } from "../_core/handler.js";

type InspectDraftPackInput = Input<typeof inspectDraftPack>;

const handle = Effect.fn("pack.inspectDraft")(function* run(
  input: InspectDraftPackInput
) {
  const store = yield* PackStore;

  return yield* store.draftStatus(input.projectId);
}) satisfies Handle<typeof inspectDraftPack>;

export { handle };
