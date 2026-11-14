import type { Input } from "@design-studio/actions/_core/action";
import type { createDraftPack } from "@design-studio/actions/pack/create-draft";
import { Effect } from "effect";

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
