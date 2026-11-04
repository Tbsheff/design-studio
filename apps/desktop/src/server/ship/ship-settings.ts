import type { ShipSettings } from "../../shared/actions/_core/ship.js";
import { readShipState, saveShipSettings } from "../git/ship-store.js";
import type { ShipTarget } from "./ship-core.js";

const readSettings = async (target: ShipTarget): Promise<ShipSettings> => {
  const state = await readShipState(target.projectDir);

  return state.settings;
};

const writeSettings = (
  target: ShipTarget,
  settings: ShipSettings
): Promise<ShipSettings> =>
  saveShipSettings(target.projectDir, {
    bodyTemplate: settings.bodyTemplate,
    branchTemplate: settings.branchTemplate.trim(),
    issueId: settings.issueId.trim(),
    user: settings.user.trim(),
  });

export { readSettings, writeSettings };
