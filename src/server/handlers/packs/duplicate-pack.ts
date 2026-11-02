import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { duplicatePackPacks } from "../../../shared/actions/packs/duplicate-pack.js";
import { PackWriter } from "../../design-system/ops/pack-writer.js";
import type { Handle } from "../_core/handler.js";

type DuplicatePackPacksInput = Input<typeof duplicatePackPacks>;

const handle = Effect.fn("packs.duplicatePack")(function* run(
  input: DuplicatePackPacksInput
) {
  const writer = yield* PackWriter;

  return yield* writer.duplicate(input.packId, input.name ?? null);
}) satisfies Handle<typeof duplicatePackPacks>;

export { handle };
