import type { Input } from "@design-studio/actions/_core/action";
import type { applyKitDrift } from "@design-studio/actions/kit-drift/apply";
import { Effect } from "effect";

import { KitDriftWriter } from "../../components/index.js";
import type { Handle } from "../_core/handler.js";

type ApplyKitDriftInput = Input<typeof applyKitDrift>;

const handle = Effect.fn("kit-drift.apply")(function* run(
  input: ApplyKitDriftInput
) {
  const writer = yield* KitDriftWriter;

  return yield* writer.apply({
    directionId: input.directionId,
    ids: input.ids,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof applyKitDrift>;

export { handle };
