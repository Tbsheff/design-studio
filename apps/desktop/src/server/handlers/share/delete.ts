import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { deleteShare } from "@design-studio/actions/share/delete";
import { LinkedShareWriter, ShareStore } from "../../share/index.js";
import type { Handle, Preview } from "../_core/handler.js";

type DeleteShareInput = Input<typeof deleteShare>;

const handle = Effect.fn("share.delete")(function* run(
  input: DeleteShareInput
) {
  const writer = yield* LinkedShareWriter;

  return yield* writer.delete(input.projectId, input.shareId);
}) satisfies Handle<typeof deleteShare>;

const preview = Effect.fn("share.delete.preview")(function* card(
  input: DeleteShareInput
) {
  const store = yield* ShareStore;

  return yield* store.deleteCard(input.projectId, input.shareId);
}) satisfies Preview<typeof deleteShare>;

export { handle, preview };
