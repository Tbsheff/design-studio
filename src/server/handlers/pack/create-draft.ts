import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { createDraftPack } from "../../../shared/actions/pack/create-draft.js";
import { PackStore, PackWriter } from "../../design-system/index.js";
import type { Handle, Preview } from "../_core/handler.js";

type CreateDraftPackInput = Input<typeof createDraftPack>;

const handle = Effect.fn("pack.createDraft")(function* run(
  input: CreateDraftPackInput
) {
  const writer = yield* PackWriter;

  return yield* writer.createDraft(input);
}) satisfies Handle<typeof createDraftPack>;

const preview = Effect.fn("pack.createDraft.preview")(function* card(
  input: CreateDraftPackInput
) {
  const store = yield* PackStore;

  return yield* store.draftCard(input);
}) satisfies Preview<typeof createDraftPack>;

export { handle, preview };
