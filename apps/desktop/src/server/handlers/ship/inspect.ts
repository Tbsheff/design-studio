import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { inspectShip } from "@design-studio/actions/ship/inspect";
import { ShipStore } from "../../ship/index.js";
import type { Handle } from "../_core/handler.js";

type InspectShipInput = Input<typeof inspectShip>;

const handle = Effect.fn("ship.inspect")(function* run(
  input: InspectShipInput
) {
  const store = yield* ShipStore;

  return yield* store.inspect(input.projectId, input);
}) satisfies Handle<typeof inspectShip>;

export { handle };
