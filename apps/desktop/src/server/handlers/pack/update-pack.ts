import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { updatePackPack } from "../../../shared/actions/pack/update-pack.js";
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
