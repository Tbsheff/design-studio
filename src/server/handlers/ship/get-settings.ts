import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { getSettingsShip } from "../../../shared/actions/ship/get-settings.js";
import { ShipStore } from "../../ship/ship-store.js";
import type { Handle } from "../_core/handler.js";

type GetSettingsShipInput = Input<typeof getSettingsShip>;

const handle = Effect.fn("ship.getSettings")(function* run(
  input: GetSettingsShipInput
) {
  const store = yield* ShipStore;

  return yield* store.settings(input.projectId);
}) satisfies Handle<typeof getSettingsShip>;

export { handle };
