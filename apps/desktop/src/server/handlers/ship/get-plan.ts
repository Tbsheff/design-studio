import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { getPlanShip } from "../../../shared/actions/ship/get-plan.js";
import { ShipStore } from "../../ship/index.js";
import type { Handle } from "../_core/handler.js";

type GetPlanShipInput = Input<typeof getPlanShip>;

const handle = Effect.fn("ship.getPlan")(function* run(
  input: GetPlanShipInput
) {
  const store = yield* ShipStore;

  return yield* store.get(input.projectId, input);
}) satisfies Handle<typeof getPlanShip>;

export { handle };
