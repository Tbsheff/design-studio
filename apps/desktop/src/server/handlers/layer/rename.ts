import type { Input } from "@design-studio/actions/_core/action";
import type { renameLayer } from "@design-studio/actions/layer/rename";
import { Effect } from "effect";

import { toRef } from "../../direct-edit/index.js";
import { DirectEditWriter } from "../../share/index.js";
import type { Handle } from "../_core/handler.js";

type RenameLayerInput = Input<typeof renameLayer>;

const handle = Effect.fn("layer.rename")(function* run(
  input: RenameLayerInput
) {
  const writer = yield* DirectEditWriter;

  return yield* writer.rename(toRef(input), {
    layers: input.layers,
    path: input.path,
  });
}) satisfies Handle<typeof renameLayer>;

export { handle };
