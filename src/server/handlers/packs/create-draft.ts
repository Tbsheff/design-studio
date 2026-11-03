import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { createDraftPacks } from "../../../shared/actions/packs/create-draft.js";
import { PackStore, PackWriter } from "../../design-system/index.js";
import type { Handle, Preview } from "../_core/handler.js";

type CreateDraftPacksInput = Input<typeof createDraftPacks>;

const handle = Effect.fn("packs.createDraft")(function* run(
  input: CreateDraftPacksInput
) {
  const writer = yield* PackWriter;

  return yield* writer.createDraft(input);
}) satisfies Handle<typeof createDraftPacks>;

const preview = Effect.fn("packs.createDraft.preview")(function* card(
  input: CreateDraftPacksInput
) {
  const store = yield* PackStore;

  return yield* store.draftCard(input);
}) satisfies Preview<typeof createDraftPacks>;

export { handle, preview };
