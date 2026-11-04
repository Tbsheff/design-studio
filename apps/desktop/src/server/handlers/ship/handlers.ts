// @generated
import type { ShipActions } from "@design-studio/actions/ship/index";

import type { Entries } from "../_core/handler.js";
import { handle as getPlanShipHandle } from "./get-plan.js";
import { handle as getSettingsShipHandle } from "./get-settings.js";
import { handle as inspectShipHandle } from "./inspect.js";
import {
  handle as publishShipHandle,
  preview as publishShipPreview,
} from "./publish.js";
import { handle as setSettingsShipHandle } from "./set-settings.js";

const ShipEntries = {
  getPlanShip: { handle: getPlanShipHandle },
  getSettingsShip: { handle: getSettingsShipHandle },
  inspectShip: { handle: inspectShipHandle },
  publishShip: { handle: publishShipHandle, preview: publishShipPreview },
  setSettingsShip: { handle: setSettingsShipHandle },
} satisfies Entries<typeof ShipActions>;

export { ShipEntries };
