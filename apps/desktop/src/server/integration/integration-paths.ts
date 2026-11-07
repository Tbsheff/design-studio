import path from "node:path";

import { loadConfig } from "./deps.js";

const INTEGRATION_FOLDER = "integrations";

const JSON_SUFFIX = ".json";

const toIntegrationFolder = (): string =>
  path.join(loadConfig().dataDir, INTEGRATION_FOLDER);

const toIntegrationFile = (id: string): string =>
  path.join(toIntegrationFolder(), `${id}${JSON_SUFFIX}`);

const toSecretStem = (id: string): string => `${id}.secret`;

export { JSON_SUFFIX, toIntegrationFile, toIntegrationFolder, toSecretStem };
