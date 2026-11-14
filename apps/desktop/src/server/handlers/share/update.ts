import type { Input } from "@design-studio/actions/_core/action";
import type { updateShare } from "@design-studio/actions/share/update";
import { Effect } from "effect";

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
