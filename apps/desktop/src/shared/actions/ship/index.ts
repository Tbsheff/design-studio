// @generated
import { getPlanShip } from "./get-plan.js";
import { getSettingsShip } from "./get-settings.js";
import { inspectShip } from "./inspect.js";
import { publishShip } from "./publish.js";
import { setSettingsShip } from "./set-settings.js";

const ShipActions = {
  getPlanShip,
  getSettingsShip,
  inspectShip,
  publishShip,
  setSettingsShip,
} as const;

export { ShipActions };
