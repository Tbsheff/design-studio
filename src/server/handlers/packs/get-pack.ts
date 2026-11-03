import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { getPackPacks } from "../../../shared/actions/packs/get-pack.js";
import { PackStore } from "../../design-system/index.js";
import type { Handle } from "../_core/handler.js";

type GetPackPacksInput = Input<typeof getPackPacks>;

const handle = Effect.fn("packs.getPack")(function* run(
  input: GetPackPacksInput
) {
  const store = yield* PackStore;

  return yield* store.detail(input.packId);
}) satisfies Handle<typeof getPackPacks>;

export { handle };
