import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { updatePackPack } from "@design-studio/actions/pack/update-pack";
import { PackWriter } from "../../design-system/index.js";
import type { Handle } from "../_core/handler.js";

type UpdatePackPackInput = Input<typeof updatePackPack>;

const handle = Effect.fn("pack.updatePack")(function* run(
  input: UpdatePackPackInput
) {
  const writer = yield* PackWriter;

  const { packId, ...patch } = input;

  return yield* writer.update(packId, patch);
}) satisfies Handle<typeof updatePackPack>;

export { handle };
