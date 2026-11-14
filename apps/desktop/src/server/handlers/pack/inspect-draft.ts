import type { Input } from "@design-studio/actions/_core/action";
import type { inspectDraftPack } from "@design-studio/actions/pack/inspect-draft";
import { Effect } from "effect";

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
