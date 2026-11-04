import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { getPackPack } from "../../../shared/actions/pack/get-pack.js";
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
