import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { setCursorShare } from "../../../shared/actions/share/set-cursor.js";
import { ShareLinkStore } from "../../share/index.js";
import type { Handle } from "../_core/handler.js";

type SetCursorShareInput = Input<typeof setCursorShare>;

const handle = Effect.fn("share.setCursor")(function* run(
  input: SetCursorShareInput
) {
  const links = yield* ShareLinkStore;

  return yield* links.setCursor(input.projectId, input);
}) satisfies Handle<typeof setCursorShare>;

export { handle };
