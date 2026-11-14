import type { Input } from "@design-studio/actions/_core/action";
import type { getPlanShip } from "@design-studio/actions/ship/get-plan";
import { Effect } from "effect";

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
