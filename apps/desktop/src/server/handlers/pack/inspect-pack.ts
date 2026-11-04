import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { inspectPackPack } from "../../../shared/actions/pack/inspect-pack.js";
import { PackStore } from "../../design-system/index.js";
import type { Handle } from "../_core/handler.js";

type InspectPackPackInput = Input<typeof inspectPackPack>;

const handle = Effect.fn("pack.inspectPack")(function* run(
  input: InspectPackPackInput
) {
  const store = yield* PackStore;

  return yield* store.check(input.packId);
}) satisfies Handle<typeof inspectPackPack>;

export { handle };
