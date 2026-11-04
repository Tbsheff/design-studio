import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { setPackPack } from "@design-studio/actions/pack/set-pack";
import { PackWriter } from "../../design-system/index.js";
import type { Handle } from "../_core/handler.js";

type SetPackPackInput = Input<typeof setPackPack>;

const handle = Effect.fn("pack.setPack")(function* run(
  input: SetPackPackInput
) {
  const writer = yield* PackWriter;

  return yield* writer.save(input);
}) satisfies Handle<typeof setPackPack>;

export { handle };
