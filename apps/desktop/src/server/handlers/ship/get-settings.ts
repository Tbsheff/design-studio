import type { Input } from "@design-studio/actions/_core/action";
import type { getSettingsShip } from "@design-studio/actions/ship/get-settings";
import { Effect } from "effect";

import { ShipStore } from "../../ship/index.js";
import type { Handle } from "../_core/handler.js";

type GetSettingsShipInput = Input<typeof getSettingsShip>;

const handle = Effect.fn("ship.getSettings")(function* run(
  input: GetSettingsShipInput
) {
  const store = yield* ShipStore;

  return yield* store.settings(input.projectId);
}) satisfies Handle<typeof getSettingsShip>;

export { handle };
