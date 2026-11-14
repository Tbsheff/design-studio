import type { Input } from "@design-studio/actions/_core/action";
import type { setCursorShare } from "@design-studio/actions/share/set-cursor";
import { Effect } from "effect";

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
