import type { Input } from "@design-studio/actions/_core/action";
import type { createShare } from "@design-studio/actions/share/create";
import { Effect } from "effect";

import { LinkedShareWriter, ShareStore } from "../../share/index.js";
import type { Handle, Preview } from "../_core/handler.js";

type CreateShareInput = Input<typeof createShare>;

const handle = Effect.fn("share.create")(function* run(
  input: CreateShareInput
) {
  const writer = yield* LinkedShareWriter;

  return yield* writer.create(input);
}) satisfies Handle<typeof createShare>;

const preview = Effect.fn("share.create.preview")(function* card(
  input: CreateShareInput
) {
  const store = yield* ShareStore;

  return yield* store.createCard(input);
}) satisfies Preview<typeof createShare>;

export { handle, preview };
