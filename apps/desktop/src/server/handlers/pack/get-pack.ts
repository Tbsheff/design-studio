import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { getPackPack } from "@design-studio/actions/pack/get-pack";
import { PackStore } from "../../design-system/index.js";
import type { Handle } from "../_core/handler.js";

type GetPackPackInput = Input<typeof getPackPack>;

const handle = Effect.fn("pack.getPack")(function* run(
  input: GetPackPackInput
) {
  const store = yield* PackStore;

  return yield* store.detail(input.packId);
}) satisfies Handle<typeof getPackPack>;

export { handle };
