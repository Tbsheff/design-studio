import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { duplicatePackPack } from "../../../shared/actions/pack/duplicate-pack.js";
import { PackWriter } from "../../design-system/index.js";
import type { Handle } from "../_core/handler.js";

type DuplicatePackPackInput = Input<typeof duplicatePackPack>;

const handle = Effect.fn("pack.duplicatePack")(function* run(
  input: DuplicatePackPackInput
) {
  const writer = yield* PackWriter;

  return yield* writer.duplicate(input.packId, input.name ?? null);
}) satisfies Handle<typeof duplicatePackPack>;

export { handle };
