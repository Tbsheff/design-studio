import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { createShare } from "../../../shared/actions/share/create.js";
import { ShareLinkStore, ShareStore } from "../../share/index.js";
import type { Handle, Preview } from "../_core/handler.js";

type CreateShareInput = Input<typeof createShare>;

const handle = Effect.fn("share.create")(function* run(
  input: CreateShareInput
) {
  const links = yield* ShareLinkStore;

  return yield* links.create(input);
}) satisfies Handle<typeof createShare>;

const preview = Effect.fn("share.create.preview")(function* card(
  input: CreateShareInput
) {
  const store = yield* ShareStore;

  return yield* store.createCard(input);
}) satisfies Preview<typeof createShare>;

export { handle, preview };
