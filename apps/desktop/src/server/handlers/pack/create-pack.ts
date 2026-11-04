import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { createPackPack } from "../../../shared/actions/pack/create-pack.js";
import { PackWriter } from "../../design-system/index.js";
import type { Handle } from "../_core/handler.js";

type CreatePackPackInput = Input<typeof createPackPack>;

const handle = Effect.fn("pack.createPack")(function* run(
  input: CreatePackPackInput
) {
  const writer = yield* PackWriter;

  return yield* writer.create(input);
}) satisfies Handle<typeof createPackPack>;

export { handle };
