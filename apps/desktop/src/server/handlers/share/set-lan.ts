import type { Input } from "@design-studio/actions/_core/action";
import type { setLanShare } from "@design-studio/actions/share/set-lan";
import { Effect } from "effect";

import { ShareListener } from "../../share/index.js";
import type { Handle } from "../_core/handler.js";

type SetLanShareInput = Input<typeof setLanShare>;

const handle = Effect.fn("share.setLan")(function* run(
  input: SetLanShareInput
) {
  const listener = yield* ShareListener;

  return { server: yield* listener.setLan(input.isOn) };
}) satisfies Handle<typeof setLanShare>;

export { handle };
