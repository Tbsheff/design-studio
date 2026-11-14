import type { Input } from "@design-studio/actions/_core/action";
import type { createPackPack } from "@design-studio/actions/pack/create-pack";
import { Effect } from "effect";

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
