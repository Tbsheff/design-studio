import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { Server } from 'node:http';
import net from 'node:net';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import type { McpStatus } from '../../shared/export.js';
import type { ExportDeps } from '../export/source.js';
import { callTool, ToolError, TOOLS } from './tools.js';
import { callEditTool, EDIT_NAMES, EDIT_TOOLS } from './edit-tools.js';
import type { EditDeps } from './edit-deps.js';
import { newToken, readMcpSettings, writeMcpSettings, type McpSettings } from './settings.js';

const PROTOCOLS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const MAX_BODY = 1024 * 1024;
const SERVER_NAME = 'design-studio';
const READ_INSTRUCTIONS = 'Design Studio is a local design tool. These tools read its projects: list_projects first, then get_tokens, get_design_md, get_frame_html, get_screenshot, list_files and read_file with a projectId.';
const READ_ONLY_NOTE = ' All tools are read-only. The user can turn on Allow edits in Design Studio to add tools that edit the design and the canvas.';
const EDITS_NOTE = " Allow edits is on: canvas_list, canvas_place, canvas_point, add_frame, remove_frame, write_file, edit_element, batch_edit, undo, redo, edit_history, add_comment, reply_comment, resolve_comment, create_project, open_folder, restore_version, apply_design_system, set_token, create_design_system, design_system_status, save_design_system, list_design_systems and export. Each design edit is saved as a version the user can undo; use batch_edit to make several edits one version, and undo or redo to step the same edit history as the studio's Cmd+Z. These tools never start, steer or stop the studio agent (Improve with AI on a design system draft runs only from the app), and design edits are refused while a studio run edits that direction.";
const EDITS_OFF = 'Allow edits is off in Design Studio, so this tool is not available. The user can turn it on in Export > Connect to Claude Code. Then reconnect the MCP server.';
const DEFAULT_CLIENT = 'MCP client';
const MAX_SESSIONS = 200;

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

interface Dispatch {
  deps: ExportDeps;
  edits: EditDeps | null;
  client: string;
  startSession: (client: string) => void;
}

function argsOf(raw: unknown): Record<string, unknown> {
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
}

async function runEdit(edits: EditDeps, name: string, raw: unknown, client: string): Promise<unknown> {
  try {
    return await callEditTool(edits, name, argsOf(raw), client);
  } catch (error) {
    const known = error instanceof Error && 'status' in error;
    if (!known) console.error('[mcp] edit tool failed', name, error);
    return { content: [{ type: 'text', text: known ? (error as Error).message : 'The tool failed. See the Design Studio log.' }], isError: true };
  }
}

async function callAny(ctx: Dispatch, edits: EditDeps | null, name: string, args: unknown): Promise<unknown> {
  if (!EDIT_NAMES.has(name)) return runTool(ctx.deps, name, args);
  if (!edits) return { content: [{ type: 'text', text: EDITS_OFF }], isError: true };
  return runEdit(edits, name, args, ctx.client);
}

export function clientName(params: Record<string, unknown> | undefined): string {
  const info = argsOf(params?.clientInfo);
  const raw = typeof info.title === 'string' && info.title.trim() ? info.title : typeof info.name === 'string' ? info.name : '';
  const clean = raw.replace(/[^\p{L}\p{N} ._@()-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 40);
  return clean || DEFAULT_CLIENT;
}

async function dispatch(ctx: Dispatch, message: RpcMessage): Promise<RpcReply | null> {
  const { edits } = ctx;
  const id = message.id ?? null;
  const isNotification = message.id === undefined;
  const reply = (result: unknown): RpcReply | null => (isNotification ? null : { jsonrpc: '2.0', id, result });
  const fail = (code: number, text: string): RpcReply | null => (isNotification ? null : { jsonrpc: '2.0', id, error: { code, message: text } });
  if (message.jsonrpc !== '2.0' || typeof message.method !== 'string') return fail(-32600, 'invalid request');
  switch (message.method) {
    case 'initialize': {
      const asked = typeof message.params?.protocolVersion === 'string' ? message.params.protocolVersion : '';
      ctx.startSession(clientName(message.params));
      return reply({ protocolVersion: PROTOCOLS.includes(asked) ? asked : PROTOCOLS[0], capabilities: { tools: { listChanged: false } }, serverInfo: { name: SERVER_NAME, title: 'Design Studio', version: '0.1.0' }, instructions: READ_INSTRUCTIONS + (edits ? EDITS_NOTE : READ_ONLY_NOTE) });
    }
    case 'ping':
      return reply({});
    case 'tools/list':
      return reply({ tools: edits ? [...TOOLS, ...EDIT_TOOLS] : TOOLS });
    case 'tools/call': {
      const name = typeof message.params?.name === 'string' ? message.params.name : '';
      if (!EDIT_NAMES.has(name) && !TOOLS.some((tool) => tool.name === name)) return fail(-32602, `unknown tool ${name}`);
      return reply(await callAny(ctx, edits, name, message.params?.arguments));
    }
    default:
      if (message.method.startsWith('notifications/')) return null;
      return fail(-32601, `method ${message.method} is not supported`);
  }
}

function createMcpApp(deps: ExportDeps, editDeps: EditDeps | null, settings: () => McpSettings): Hono {
  const app = new Hono();
  const clients = new Map<string, string>();
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
    let session: string | null = null;
    const ctx: Dispatch = {
      deps,
      edits: settings().edits ? editDeps : null,
      client: clients.get(c.req.header('mcp-session-id') ?? '') ?? DEFAULT_CLIENT,
      startSession: (client) => {
        session = randomBytes(16).toString('hex');
        clients.set(session, client);
        if (clients.size > MAX_SESSIONS) clients.delete(clients.keys().next().value as string);
      },
    };
    const replies = (await Promise.all(messages.map((m) => dispatch(ctx, typeof m === 'object' && m !== null ? m : {})))).filter((r): r is RpcReply => r !== null);
    const headers: Record<string, string> = session ? { 'mcp-session-id': session } : {};
    if (replies.length === 0) return c.body(null, 202, headers);
    return c.json(batch ? replies : replies[0], 200, headers);
  });
  app.all('/mcp', (c) => c.body(null, 405, { allow: 'POST' }));
  app.notFound((c) => c.json({ error: 'not found' }, 404));
  return app;
}

export interface McpService {
  status(): Promise<McpStatus>;
  setEnabled(enabled: boolean): Promise<McpStatus>;
  setEdits(edits: boolean): Promise<McpStatus>;
  editsOn(): Promise<boolean>;
  rotate(): Promise<McpStatus>;
  boot(): Promise<void>;
  stop(): Promise<void>;
}

export function createMcpService(dataDir: string, deps: ExportDeps, edits: EditDeps | null = null): McpService {
  let current: McpSettings | null = null;
  let server: Server | null = null;
  let lastError: string | null = null;
  const app = createMcpApp(deps, edits, () => current as McpSettings);

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
    return { enabled: settings.enabled, edits: settings.edits, running: server !== null, url: settings.enabled ? url : null, command: settings.enabled ? command : null, error: lastError };
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
    async setEdits(on) {
      const settings = await load();
      settings.edits = on;
      await writeMcpSettings(dataDir, settings);
      return status();
    },
    async editsOn() {
      const settings = await load();
      return settings.enabled && settings.edits;
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
