import type { Input } from "@design-studio/actions/_core/action";
import type { duplicatePackPack } from "@design-studio/actions/pack/duplicate-pack";
import { Effect } from "effect";

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
