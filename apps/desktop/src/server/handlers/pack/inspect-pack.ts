import type { Input } from "@design-studio/actions/_core/action";
import type { inspectPackPack } from "@design-studio/actions/pack/inspect-pack";
import { Effect } from "effect";

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
