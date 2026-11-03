import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { deleteShare } from "../../../shared/actions/share/delete.js";
import { ShareLinkStore, ShareStore } from "../../share/index.js";
import type { Handle, Preview } from "../_core/handler.js";

type DeleteShareInput = Input<typeof deleteShare>;

const handle = Effect.fn("share.delete")(function* run(
  input: DeleteShareInput
) {
  const links = yield* ShareLinkStore;

  return yield* links.revoke(input.projectId, input.shareId);
}) satisfies Handle<typeof deleteShare>;

const preview = Effect.fn("share.delete.preview")(function* card(
  input: DeleteShareInput
) {
  const store = yield* ShareStore;

  return yield* store.deleteCard(input.projectId, input.shareId);
}) satisfies Preview<typeof deleteShare>;

export { handle, preview };
