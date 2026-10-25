import { randomBytes } from 'node:crypto';
import { chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

export interface McpSettings {
  enabled: boolean;
  port: number;
  token: string;
}

export const DEFAULT_MCP_PORT = 4590;
const FILE = 'mcp.json';

export function newToken(): string {
  return randomBytes(32).toString('base64url');
}

export async function readMcpSettings(dataDir: string): Promise<McpSettings> {
  try {
    const parsed = JSON.parse(await readFile(path.join(dataDir, FILE), 'utf8')) as Partial<McpSettings>;
    const port = Number.isInteger(parsed.port) && (parsed.port as number) > 1023 && (parsed.port as number) < 65536 ? (parsed.port as number) : DEFAULT_MCP_PORT;
    const token = typeof parsed.token === 'string' && parsed.token.length >= 32 ? parsed.token : newToken();
    return { enabled: parsed.enabled === true, port, token };
  } catch {
    return { enabled: false, port: DEFAULT_MCP_PORT, token: newToken() };
  }
}

export async function writeMcpSettings(dataDir: string, settings: McpSettings): Promise<void> {
  await mkdir(dataDir, { recursive: true });
  const target = path.join(dataDir, FILE);
  const temp = `${target}.tmp-${randomBytes(4).toString('hex')}`;
  await writeFile(temp, `${JSON.stringify(settings, null, 2)}\n`, { mode: 0o600 });
  await chmod(temp, 0o600);
  await rename(temp, target);
}
