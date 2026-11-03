import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { updateShare } from "../../../shared/actions/share/update.js";
import { ShareLinkStore } from "../../share/index.js";
import type { Handle } from "../_core/handler.js";

type UpdateShareInput = Input<typeof updateShare>;

const handle = Effect.fn("share.update")(function* run(
  input: UpdateShareInput
) {
  const links = yield* ShareLinkStore;

  return yield* links.setStudioCursor(
    input.projectId,
    input.shareId,
    input.studioCursor
  );
}) satisfies Handle<typeof updateShare>;

export { handle };
