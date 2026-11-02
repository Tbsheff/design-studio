import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { setSettingsShip } from "../../../shared/actions/ship/set-settings.js";
import { ShipRunner } from "../../ship/ship-runner.js";
import type { Handle } from "../_core/handler.js";

type SetSettingsShipInput = Input<typeof setSettingsShip>;

const handle = Effect.fn("ship.setSettings")(function* run(
  input: SetSettingsShipInput
) {
  const runner = yield* ShipRunner;

  const { projectId, ...settings } = input;

  return yield* runner.setSettings(projectId, settings);
}) satisfies Handle<typeof setSettingsShip>;

export { handle };
