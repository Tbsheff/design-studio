import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { setSettingsShip } from "@design-studio/actions/ship/set-settings";
import { ShipRunner } from "../../ship/index.js";
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
