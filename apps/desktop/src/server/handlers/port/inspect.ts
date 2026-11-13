import type { Input } from "@design-studio/actions/_core/action";
import { NotImplemented } from "@design-studio/actions/_core/errors/not-implemented";
import type { inspectPort } from "@design-studio/actions/port/inspect";
import { Effect } from "effect";

import type { Handle } from "../_core/handler.js";

type InspectPortInput = Input<typeof inspectPort>;

const handle = Effect.fn("port.inspect")(function* run(
  _input: InspectPortInput
) {
  return yield* new NotImplemented({
    message: "port.inspect is not built yet.",
  });
}) satisfies Handle<typeof inspectPort>;

export { handle };
