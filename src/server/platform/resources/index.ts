import { existsSync } from "node:fs";
import path from "node:path";

import { resourcesDir } from "../config/index.js";

const resourcePath = (relative: string, devPath: string): string => {
  const root = resourcesDir();

  if (!root) {
    return devPath;
  }

  return path.join(root, relative);
};

const packagedResource = (relative: string): string | null => {
  const root = resourcesDir();

  if (!root) {
    return null;
  }

  const file = path.join(root, relative);

  if (!existsSync(file)) {
    return null;
  }

  return file;
};

export { resourcesDir } from "../config/index.js";

export { packagedResource, resourcePath };
