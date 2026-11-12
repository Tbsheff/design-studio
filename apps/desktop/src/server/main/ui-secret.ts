import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { Option, Schema } from "effect";

import { PRIVATE_MODE, writeAtomic } from "../platform/atomic-write/index.js";
import {
  UI_SECRET_PATTERN,
  deleteUiSecretEnv,
} from "../platform/config/index.js";
import type { ServerConfig } from "../platform/config/index.js";
import { logInfo } from "../platform/logger/index.js";

const SESSION_FILE = "session.json";

const SECRET_BYTES = 32;

const DEV_UI_PORT = 5173;

const OPEN_PATH = "/api/session/open";

const SessionFileSchema = Schema.Struct({
  uiSecret: Schema.String.check(Schema.isPattern(UI_SECRET_PATTERN)),
});

const decodeSessionText = Schema.decodeOption(
  Schema.fromJsonString(SessionFileSchema)
);

const toSavedSecret = async (file: string): Promise<string | null> => {
  try {
    const text = await readFile(file, "utf-8");

    return Option.getOrNull(decodeSessionText(text))?.uiSecret ?? null;
  } catch {
    return null;
  }
};

const toOpenUrl = (port: number, secret: string): string =>
  `http://127.0.0.1:${port}${OPEN_PATH}?key=${secret}`;

const toUiConfig = async (config: ServerConfig): Promise<ServerConfig> => {
  const file = path.join(config.dataDir, SESSION_FILE);
  const fromEnv = config.uiSecret;
  const saved = await toSavedSecret(file);

  const uiSecret =
    fromEnv ?? saved ?? randomBytes(SECRET_BYTES).toString("hex");

  deleteUiSecretEnv();

  if (fromEnv === null && saved !== uiSecret) {
    await writeAtomic(file, `${JSON.stringify({ uiSecret }, null, 2)}\n`, {
      cleanup: "always",
      mode: PRIVATE_MODE,
    });
  }

  if (fromEnv === null) {
    logInfo(
      `[studio] open the UI: ${toOpenUrl(DEV_UI_PORT, uiSecret)} (dev) or ${toOpenUrl(config.studioPort, uiSecret)}`
    );
  }

  return { ...config, uiSecret };
};

export { toUiConfig };
