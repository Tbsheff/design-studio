import type { ShipSettings } from "@design-studio/contracts/ship";

import { readShipState, saveShipSettings } from "../git/ship-store.js";
import type { ShipTarget } from "./ship-target.js";

const getSettings = async (target: ShipTarget): Promise<ShipSettings> => {
  const state = await readShipState(target.projectDir);

  return state.settings;
};

const updateSettings = (
  target: ShipTarget,
  settings: ShipSettings
): Promise<ShipSettings> =>
  saveShipSettings(target.projectDir, {
    bodyTemplate: settings.bodyTemplate,
    branchTemplate: settings.branchTemplate.trim(),
    issueId: settings.issueId.trim(),
    user: settings.user.trim(),
  });

export { getSettings, updateSettings };
