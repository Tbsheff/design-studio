import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { inspectShip } from "../../../shared/actions/ship/inspect.js";
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
