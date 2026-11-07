import path from "node:path";

import { loadConfig } from "./deps.js";
import type { DirectionIds } from "./deps.js";

const THEME_FOLDER = "themes";

const toThemeFile = (ids: DirectionIds): string =>
  path.join(
    loadConfig().dataDir,
    THEME_FOLDER,
    `${ids.projectId}__${ids.directionId}.json`
  );

export { toThemeFile };
