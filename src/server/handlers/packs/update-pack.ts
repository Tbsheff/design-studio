import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { updatePackPacks } from "../../../shared/actions/packs/update-pack.js";
import { PackWriter } from "../../design-system/ops/pack-writer.js";
import type { Handle } from "../_core/handler.js";

type UpdatePackPacksInput = Input<typeof updatePackPacks>;

const handle = Effect.fn("packs.updatePack")(function* run(
  input: UpdatePackPacksInput
) {
  const writer = yield* PackWriter;

  const { packId, ...patch } = input;

  return yield* writer.update(packId, patch);
}) satisfies Handle<typeof updatePackPacks>;

export { handle };
