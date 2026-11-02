import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { setLanShare } from "../../../shared/actions/share/set-lan.js";
import { ShareListener } from "../../share/share-listener.js";
import type { Handle } from "../_core/handler.js";

type SetLanShareInput = Input<typeof setLanShare>;

const handle = Effect.fn("share.setLan")(function* run(
  input: SetLanShareInput
) {
  const listener = yield* ShareListener;

  return { server: yield* listener.setLan(input.isOn) };
}) satisfies Handle<typeof setLanShare>;

export { handle };
