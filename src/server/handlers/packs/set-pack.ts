import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { setPackPacks } from "../../../shared/actions/packs/set-pack.js";
import { PackWriter } from "../../design-system/index.js";
import type { Handle } from "../_core/handler.js";

type SetPackPacksInput = Input<typeof setPackPacks>;

const handle = Effect.fn("packs.setPack")(function* run(
  input: SetPackPacksInput
) {
  const writer = yield* PackWriter;

  return yield* writer.save(input);
}) satisfies Handle<typeof setPackPacks>;

export { handle };
