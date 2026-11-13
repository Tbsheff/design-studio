import { randomBytes } from "node:crypto";
import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import type { McpEnv } from "../platform/config/index.js";

export interface McpSettings {
  enabled: boolean;
  edits: boolean;
  port: number;
  token: string;
}

export const DEFAULT_MCP_PORT = 4590;
const FILE = "mcp.json";

const toMcpUrl = (port: number): string => `http://127.0.0.1:${port}/mcp`;

const toMcpSettingsPath = (dataDir: string): string => path.join(dataDir, FILE);

const fromMcpEnv = (settings: McpSettings, env: McpEnv): McpSettings => ({
  ...settings,
  edits: env.canEdit ?? settings.edits,
  enabled: env.isEnabled ?? settings.enabled,
});

export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function readMcpSettings(dataDir: string): Promise<McpSettings> {
  try {
    const parsed = JSON.parse(
      await readFile(path.join(dataDir, FILE), "utf-8")
    ) as Partial<McpSettings>;
    const port =
      Number.isInteger(parsed.port) &&
      (parsed.port as number) > 1023 &&
      (parsed.port as number) < 65_536
        ? (parsed.port as number)
        : DEFAULT_MCP_PORT;
    const token =
      typeof parsed.token === "string" && parsed.token.length >= 32
        ? parsed.token
        : newToken();
    return {
      enabled: parsed.enabled === true,
      edits: parsed.edits === true,
      port,
      token,
    };
  } catch {
    return {
      enabled: false,
      edits: false,
      port: DEFAULT_MCP_PORT,
      token: newToken(),
    };
  }
}

export async function writeMcpSettings(
  dataDir: string,
  settings: McpSettings
): Promise<void> {
  await mkdir(dataDir, { recursive: true });
  const target = toMcpSettingsPath(dataDir);
  const temp = `${target}.tmp-${randomBytes(4).toString("hex")}`;
  const body = { ...settings, url: toMcpUrl(settings.port) };
  await writeFile(temp, `${JSON.stringify(body, null, 2)}\n`, {
    mode: 0o600,
  });
  await chmod(temp, 0o600);
  await rename(temp, target);
  await chmod(target, 0o600);
}

export { fromMcpEnv, toMcpSettingsPath, toMcpUrl };
