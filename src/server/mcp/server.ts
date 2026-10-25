import { timingSafeEqual } from 'node:crypto';
import type { Server } from 'node:http';
import net from 'node:net';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import type { McpStatus } from '../../shared/export.js';
import type { ExportDeps } from '../export/source.js';
import { callTool, ToolError, TOOLS } from './tools.js';
import { newToken, readMcpSettings, writeMcpSettings, type McpSettings } from './settings.js';

const PROTOCOLS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const MAX_BODY = 1024 * 1024;
const SERVER_NAME = 'design-studio';
const INSTRUCTIONS = 'Design Studio is a local design tool. These tools read its projects: list_projects first, then get_tokens, get_design_md, get_frame_html, get_screenshot, list_files and read_file with a projectId. All tools are read-only.';

interface RpcMessage {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

type RpcReply = { jsonrpc: '2.0'; id: string | number | null; result: unknown } | { jsonrpc: '2.0'; id: string | number | null; error: { code: number; message: string } };

function same(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function portFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.unref();
    probe.once('error', () => resolve(false));
    probe.listen({ port, host: '127.0.0.1', exclusive: true }, () => probe.close(() => resolve(true)));
  });
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.unref();
    probe.once('error', reject);
    probe.listen({ port: 0, host: '127.0.0.1' }, () => {
      const address = probe.address();
      probe.close(() => (typeof address === 'object' && address ? resolve(address.port) : reject(new Error('no free port'))));
    });
  });
}

async function runTool(deps: ExportDeps, name: string, raw: unknown): Promise<unknown> {
  const args = typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  try {
    return await callTool(deps, name, args);
  } catch (error) {
    const known = error instanceof ToolError || (error instanceof Error && 'status' in error);
    if (!known) console.error('[mcp] tool failed', name, error);
    return { content: [{ type: 'text', text: known ? (error as Error).message : 'The tool failed. See the Design Studio log.' }], isError: true };
  }
}

async function dispatch(deps: ExportDeps, message: RpcMessage): Promise<RpcReply | null> {
  const id = message.id ?? null;
  const isNotification = message.id === undefined;
  const reply = (result: unknown): RpcReply | null => (isNotification ? null : { jsonrpc: '2.0', id, result });
  const fail = (code: number, text: string): RpcReply | null => (isNotification ? null : { jsonrpc: '2.0', id, error: { code, message: text } });
  if (message.jsonrpc !== '2.0' || typeof message.method !== 'string') return fail(-32600, 'invalid request');
  switch (message.method) {
    case 'initialize': {
      const asked = typeof message.params?.protocolVersion === 'string' ? message.params.protocolVersion : '';
      return reply({ protocolVersion: PROTOCOLS.includes(asked) ? asked : PROTOCOLS[0], capabilities: { tools: { listChanged: false } }, serverInfo: { name: SERVER_NAME, title: 'Design Studio', version: '0.1.0' }, instructions: INSTRUCTIONS });
    }
    case 'ping':
      return reply({});
    case 'tools/list':
      return reply({ tools: TOOLS });
    case 'tools/call': {
      const name = typeof message.params?.name === 'string' ? message.params.name : '';
      if (!TOOLS.some((tool) => tool.name === name)) return fail(-32602, `unknown tool ${name}`);
      return reply(await runTool(deps, name, message.params?.arguments));
    }
    default:
      if (message.method.startsWith('notifications/')) return null;
      return fail(-32601, `method ${message.method} is not supported`);
  }
}

function createMcpApp(deps: ExportDeps, settings: () => McpSettings): Hono {
  const app = new Hono();
  app.use('*', async (c, next) => {
    const { port, token } = settings();
    const host = c.req.header('host') ?? '';
    if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) return c.json({ error: 'forbidden' }, 403);
    if (c.req.header('origin') !== undefined) return c.json({ error: 'forbidden' }, 403);
    const auth = c.req.header('authorization') ?? '';
    if (!auth.startsWith('Bearer ') || !same(auth.slice(7), token)) return c.json({ error: 'unauthorized' }, 401, { 'www-authenticate': 'Bearer' });
    await next();
  });
  app.post('/mcp', async (c) => {
    const length = Number(c.req.header('content-length') ?? '0');
    if (length > MAX_BODY) return c.json({ error: 'too large' }, 413);
    const raw = await c.req.text();
    if (raw.length > MAX_BODY) return c.json({ error: 'too large' }, 413);
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return c.json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } }, 400);
    }
    const batch = Array.isArray(parsed);
    const messages = (batch ? parsed : [parsed]) as RpcMessage[];
    const replies = (await Promise.all(messages.map((m) => dispatch(deps, typeof m === 'object' && m !== null ? m : {})))).filter((r): r is RpcReply => r !== null);
    if (replies.length === 0) return c.body(null, 202);
    return c.json(batch ? replies : replies[0]);
  });
  app.all('/mcp', (c) => c.body(null, 405, { allow: 'POST' }));
  app.notFound((c) => c.json({ error: 'not found' }, 404));
  return app;
}

export interface McpService {
  status(): Promise<McpStatus>;
  setEnabled(enabled: boolean): Promise<McpStatus>;
  rotate(): Promise<McpStatus>;
  boot(): Promise<void>;
  stop(): Promise<void>;
}

export function createMcpService(dataDir: string, deps: ExportDeps): McpService {
  let current: McpSettings | null = null;
  let server: Server | null = null;
  let lastError: string | null = null;
  const app = createMcpApp(deps, () => current as McpSettings);

  const load = async (): Promise<McpSettings> => {
    current ??= await readMcpSettings(dataDir);
    return current;
  };

  const stop = async (): Promise<void> => {
    const running = server;
    server = null;
    if (running) await new Promise<void>((resolve) => running.close(() => resolve()));
  };

  const start = async (): Promise<void> => {
    const settings = await load();
    if (server) return;
    if (!(await portFree(settings.port))) {
      settings.port = await freePort();
      await writeMcpSettings(dataDir, settings);
    }
    server = await new Promise<Server>((resolve, reject) => {
      const created = serve({ fetch: app.fetch, port: settings.port, hostname: '127.0.0.1' }, () => resolve(created as Server)) as Server;
      created.once('error', reject);
    });
  };

  const status = async (): Promise<McpStatus> => {
    const settings = await load();
    const url = `http://127.0.0.1:${settings.port}/mcp`;
    const command = `claude mcp add --scope user --transport http ${SERVER_NAME} ${url} --header "Authorization: Bearer ${settings.token}"`;
    return { enabled: settings.enabled, running: server !== null, url: settings.enabled ? url : null, command: settings.enabled ? command : null, error: lastError };
  };

  return {
    status,
    async setEnabled(enabled) {
      const settings = await load();
      settings.enabled = enabled;
      await writeMcpSettings(dataDir, settings);
      lastError = null;
      try {
        if (enabled) await start();
        else await stop();
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
      return status();
    },
    async rotate() {
      const settings = await load();
      settings.token = newToken();
      await writeMcpSettings(dataDir, settings);
      return status();
    },
    async boot() {
      const settings = await load();
      if (!settings.enabled) return;
      await start().catch((error: unknown) => {
        lastError = error instanceof Error ? error.message : String(error);
        console.error('[mcp] could not start', error);
      });
    },
    stop,
  };
}
