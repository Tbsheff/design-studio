import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { inspectPackPacks } from "../../../shared/actions/packs/inspect-pack.js";
import { PackStore } from "../../design-system/index.js";
import type { Handle } from "../_core/handler.js";

type InspectPackPacksInput = Input<typeof inspectPackPacks>;

const handle = Effect.fn("packs.inspectPack")(function* run(
  input: InspectPackPacksInput
) {
  const store = yield* PackStore;

  return yield* store.check(input.packId);
}) satisfies Handle<typeof inspectPackPacks>;

export { handle };
