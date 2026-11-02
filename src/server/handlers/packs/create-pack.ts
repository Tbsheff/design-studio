import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { createPackPacks } from "../../../shared/actions/packs/create-pack.js";
import { PackWriter } from "../../design-system/ops/pack-writer.js";
import type { Handle } from "../_core/handler.js";

type CreatePackPacksInput = Input<typeof createPackPacks>;

const handle = Effect.fn("packs.createPack")(function* run(
  input: CreatePackPacksInput
) {
  const writer = yield* PackWriter;

  return yield* writer.create(input);
}) satisfies Handle<typeof createPackPacks>;

export { handle };
