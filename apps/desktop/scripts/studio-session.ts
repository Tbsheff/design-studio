import { readFile } from "node:fs/promises";
import path from "node:path";
import { env } from "node:process";

import { WORKSPACE_ROOT } from "./workspace-root.ts";

const UI_SECRET_HEADER = "x-studio-ui-secret";

const SESSION_FILE = "session.json";

const UI_SECRET_PATTERN = /"uiSecret":\s*"(?<secret>[\da-f]+)"/iu;

const TOKEN_PATTERN = /"token":\s*"(?<token>[\da-f]+)"/u;

const toDataDir = (dataDir: string | null): string =>
  path.resolve(
    dataDir ?? (env.STUDIO_DATA_DIR || path.join(WORKSPACE_ROOT, "studio-data"))
  );

const toUiSecret = async (dataDir: string | null): Promise<string> => {
  const file = path.join(toDataDir(dataDir), SESSION_FILE);
  const text = await readFile(file, "utf-8");
  const secret = UI_SECRET_PATTERN.exec(text)?.groups?.secret ?? null;

  if (secret === null) {
    throw new Error(`${file} has no uiSecret. Start the studio server first.`);
  }

  return secret;
};

const toStudioToken = async (
  origin: string,
  dataDir: string | null
): Promise<string> => {
  const response = await fetch(`${origin}/api/session`, {
    headers: { [UI_SECRET_HEADER]: await toUiSecret(dataDir) },
  });

  if (!response.ok) {
    throw new Error(`GET ${origin}/api/session answered ${response.status}`);
  }

  const text = await response.text();
  const token = TOKEN_PATTERN.exec(text)?.groups?.token ?? null;

  if (token === null) {
    throw new Error(`GET ${origin}/api/session sent no token`);
  }

  return token;
};

const toUiOpenUrl = async (
  origin: string,
  dataDir: string | null
): Promise<string> =>
  `${origin}/api/session/open?key=${await toUiSecret(dataDir)}`;

export { UI_SECRET_HEADER, toStudioToken, toUiOpenUrl, toUiSecret };
