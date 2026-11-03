import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { setPackPack } from "../../../shared/actions/pack/set-pack.js";
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
