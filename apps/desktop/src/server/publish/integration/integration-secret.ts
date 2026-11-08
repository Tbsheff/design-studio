import { rm } from "node:fs/promises";

import { createKeyVault } from "./deps.js";
import type { KeyVault } from "./deps.js";
import {
  toIntegrationFile,
  toIntegrationFolder,
  toSecretStem,
} from "./integration-paths.js";

const SECRET_MAX = 8192;

const toVault = (id: string): KeyVault =>
  createKeyVault(toIntegrationFolder(), toSecretStem(id));

const getSecret = (id: string): Promise<string | null> => toVault(id).get();

const setSecret = (id: string, value: string): Promise<void> =>
  toVault(id).set(value);

const deleteSecret = (id: string): Promise<void> => toVault(id).clear();

const deleteIntegrationFile = (id: string): Promise<void> =>
  rm(toIntegrationFile(id), { force: true });

export {
  SECRET_MAX,
  deleteIntegrationFile,
  deleteSecret,
  getSecret,
  setSecret,
};
