import { randomBytes } from "node:crypto";
import path from "node:path";

import { Effect } from "effect";
import { Hono } from "hono";

import type { McpStatus } from "../../shared/export.js";
import type { ExportDeps } from "../export/source.js";
import type { WireArgs } from "../handlers/_core/run-action.js";
import type { McpListenerRunnerApi } from "../mcp-life/index.js";
import { toTextResource } from "../platform/resources/index.js";
import { toLegacyPrincipal } from "../store/principal.js";
import type { EditDeps } from "./edit-guards.js";
import { EDIT_NAMES, EDIT_TOOLS } from "./edit-tools.js";
import { createKeyResolver, offlineRefusal } from "./key-auth.js";
import type { Introspect, Resolved } from "./key-auth.js";
import { withLegacyCaller } from "./legacy/caller-scope.js";
import type { FolderRootsLookup, LegacyCall } from "./legacy/caller-scope.js";
import { getFreePort, isPortFree, isSameText } from "./port-probe.js";
import { ActionTools } from "./registry.js";
import type { McpCaller } from "./registry.js";
import { argsOf, runEdit } from "./run-edit.js";
import { newToken, readMcpSettings, writeMcpSettings } from "./settings.js";
import type { McpSettings } from "./settings.js";

const MCP_ASSETS_DIR = path.join(import.meta.dirname, "assets");
const PROTOCOLS = ["2025-06-18", "2025-03-26", "2024-11-05"];
const MAX_BODY = 1024 * 1024;
const SERVER_NAME = "design-studio";
const READ_INSTRUCTIONS = toTextResource(
  "mcp/read-instructions.txt",
  path.join(MCP_ASSETS_DIR, "read-instructions.txt")
);
const READ_ONLY_NOTE =
  " All tools are read-only. The user can turn on Allow edits in Design Studio to add tools that edit the design and the canvas.";
const EDITS_NOTE = toTextResource(
  "mcp/edits-note.txt",
  path.join(MCP_ASSETS_DIR, "edits-note.txt")
);
const EDITS_OFF =
  "Allow edits is off in Design Studio, so this tool is not available. The user can turn it on in Export > Connect to Claude Code. Then reconnect the MCP server.";
const DEFAULT_CLIENT = "MCP client";
const MAX_SESSIONS = 200;

interface RpcMessage {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

type RpcReply =
  | { jsonrpc: "2.0"; id: string | number | null; result: unknown }
  | {
      jsonrpc: "2.0";
      id: string | number | null;
      error: { code: number; message: string };
    };

interface Dispatch {
  deps: ExportDeps;
  edits: EditDeps | null;
  folderRoots: FolderRootsLookup | null;
  client: string;
  key: Resolved | null;
  startSession: (client: string) => void;
}

function callerOf(ctx: Dispatch, edits: EditDeps | null): McpCaller {
  return {
    client: ctx.client,
    edits,
    principal: ctx.key?.principal ?? toLegacyPrincipal(),
  };
}

function offlineReply(ctx: Dispatch, name: string): unknown {
  const isRead = ActionTools.isAction(name)
    ? ActionTools.isRead(name)
    : !EDIT_NAMES.has(name);
  const text = offlineRefusal(
    name,
    isRead,
    ctx.key?.offlineSince ?? null,
    Date.now()
  );
  return text === null
    ? null
    : { content: [{ type: "text", text }], isError: true };
}

async function callAny(
  ctx: Dispatch,
  edits: EditDeps | null,
  name: string,
  args: unknown
): Promise<unknown> {
  const offline = offlineReply(ctx, name);
  if (offline !== null) return offline;
  const call: LegacyCall = {
    folderRoots: ctx.folderRoots,
    principal: ctx.key?.principal ?? toLegacyPrincipal(),
  };
  if (ActionTools.isAction(name))
    return withLegacyCaller(call, async () =>
      ActionTools.call(
        ctx.deps,
        name,
        argsOf(args) as WireArgs,
        callerOf(ctx, edits)
      )
    );
  if (!EDIT_NAMES.has(name))
    return {
      content: [{ type: "text", text: `unknown tool ${name}` }],
      isError: true,
    };
  if (!edits)
    return { content: [{ type: "text", text: EDITS_OFF }], isError: true };
  return withLegacyCaller(call, async () =>
    runEdit(edits, name, args, ctx.client)
  );
}

export function clientName(
  params: Record<string, unknown> | undefined
): string {
  const info = argsOf(params?.clientInfo);
  const raw =
    typeof info.title === "string" && info.title.trim()
      ? info.title
      : typeof info.name === "string"
        ? info.name
        : "";
  const clean = raw
    .replaceAll(/[^\p{L}\p{N} ._@()-]/gu, "")
    .replaceAll(/\s+/g, " ")
    .trim()
    .slice(0, 40);
  return clean || DEFAULT_CLIENT;
}

async function dispatch(
  ctx: Dispatch,
  message: RpcMessage
): Promise<RpcReply | null> {
  const { edits } = ctx;
  const id = message.id ?? null;
  const isNotification = message.id === undefined;
  const reply = (result: unknown): RpcReply | null =>
    isNotification ? null : { jsonrpc: "2.0", id, result };
  const fail = (code: number, text: string): RpcReply | null =>
    isNotification
      ? null
      : { jsonrpc: "2.0", id, error: { code, message: text } };
  if (message.jsonrpc !== "2.0" || typeof message.method !== "string")
    return fail(-32_600, "invalid request");
  switch (message.method) {
    case "initialize": {
      const asked =
        typeof message.params?.protocolVersion === "string"
          ? message.params.protocolVersion
          : "";
      ctx.startSession(clientName(message.params));
      return reply({
        protocolVersion: PROTOCOLS.includes(asked) ? asked : PROTOCOLS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: {
          name: SERVER_NAME,
          title: "Design Studio",
          version: "0.1.0",
        },
        instructions: READ_INSTRUCTIONS + (edits ? EDITS_NOTE : READ_ONLY_NOTE),
      });
    }
    case "ping": {
      return reply({});
    }
    case "tools/list": {
      return reply({
        tools: ActionTools.list([], EDIT_TOOLS, edits),
      });
    }
    case "tools/call": {
      const name =
        typeof message.params?.name === "string" ? message.params.name : "";
      if (!EDIT_NAMES.has(name) && !ActionTools.isKnown([], name))
        return fail(-32_602, `unknown tool ${name}`);
      return reply(await callAny(ctx, edits, name, message.params?.arguments));
    }
    default: {
      if (message.method.startsWith("notifications/")) return null;
      return fail(-32_601, `method ${message.method} is not supported`);
    }
  }
}

const readFolderRoots = async (
  edits: EditDeps
): Promise<readonly string[] | null> => {
  try {
    return [await edits.projectsFolder()];
  } catch {
    return null;
  }
};

const toFolderRoots = (edits: EditDeps | null): FolderRootsLookup | null => {
  if (edits === null) {
    return null;
  }

  return () => readFolderRoots(edits);
};

function createMcpApp(
  deps: ExportDeps,
  editDeps: EditDeps | null,
  settings: () => McpSettings,
  introspect: Introspect
): Hono<{ Variables: { key: Resolved | null } }> {
  const app = new Hono<{ Variables: { key: Resolved | null } }>();
  const clients = new Map<string, string>();
  const keys = createKeyResolver(introspect);
  const folderRoots = toFolderRoots(editDeps);
  app.use("*", async (c, next) => {
    const { port, token } = settings();
    const host = c.req.header("host") ?? "";
    if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`)
      return c.json({ error: "forbidden" }, 403);
    if (c.req.header("origin") !== undefined)
      return c.json({ error: "forbidden" }, 403);
    const auth = c.req.header("authorization") ?? "";
    const unauthorized = (): Response =>
      c.json({ error: "unauthorized" }, 401, {
        "www-authenticate": "Bearer",
      });
    if (!auth.startsWith("Bearer ")) return unauthorized();
    const bearer = auth.slice(7);
    if (isSameText(bearer, token)) {
      c.set("key", null);
      return next();
    }
    const resolution = await keys.resolve(bearer);
    if (resolution.kind === "denied") return unauthorized();
    if (resolution.kind === "offline") return c.json({ error: "offline" }, 503);
    c.set("key", resolution.resolved);
    return next();
  });
  app.post("/mcp", async (c) => {
    const length = Number(c.req.header("content-length") ?? "0");
    if (length > MAX_BODY) return c.json({ error: "too large" }, 413);
    const raw = await c.req.text();
    if (raw.length > MAX_BODY) return c.json({ error: "too large" }, 413);
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return c.json(
        {
          jsonrpc: "2.0",
          id: null,
          error: { code: -32_700, message: "parse error" },
        },
        400
      );
    }
    const batch = Array.isArray(parsed);
    const messages = (batch ? parsed : [parsed]) as RpcMessage[];
    let session: string | null = null;
    const key = c.get("key");
    const ctx: Dispatch = {
      deps,
      edits: settings().edits ? editDeps : null,
      folderRoots,
      client:
        key?.client ??
        clients.get(c.req.header("mcp-session-id") ?? "") ??
        DEFAULT_CLIENT,
      key,
      startSession: (named) => {
        const client = key?.client ?? named;
        session = randomBytes(16).toString("hex");
        clients.set(session, client);
        if (clients.size > MAX_SESSIONS)
          clients.delete(clients.keys().next().value as string);
      },
    };
    const replies = (
      await Promise.all(
        messages.map((m) =>
          dispatch(ctx, typeof m === "object" && m !== null ? m : {})
        )
      )
    ).filter((r): r is RpcReply => r !== null);
    const headers: Record<string, string> = session
      ? { "mcp-session-id": session }
      : {};
    if (replies.length === 0) return c.body(null, 202, headers);
    return c.json(batch ? replies : replies[0], 200, headers);
  });
  app.all("/mcp", (c) => c.body(null, 405, { allow: "POST" }));
  app.notFound((c) => c.json({ error: "not found" }, 404));
  return app;
}

export interface McpWiring {
  edits: EditDeps | null;
  introspect: Introspect;
  listener: McpListenerRunnerApi | null;
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

export function createMcpService(
  dataDir: string,
  deps: ExportDeps,
  wiring: McpWiring
): McpService {
  const { edits, introspect, listener } = wiring;
  let current: McpSettings | null = null;
  let lastError: string | null = null;
  const app = createMcpApp(
    deps,
    edits,
    () => current as McpSettings,
    introspect
  );

  const load = async (): Promise<McpSettings> => {
    current ??= await readMcpSettings(dataDir);
    return current;
  };

  const isListening = async (): Promise<boolean> => {
    if (listener === null) return false;
    return Effect.runPromise(listener.isListening());
  };

  const stop = async (): Promise<void> => {
    if (listener !== null) await Effect.runPromise(listener.close());
  };

  const start = async (): Promise<void> => {
    if (listener === null) throw new Error("The MCP listener is not ready.");
    const settings = await load();
    if (await isListening()) return;
    if (!(await isPortFree(settings.port))) {
      settings.port = await getFreePort();
      await writeMcpSettings(dataDir, settings);
    }
    await Effect.runPromise(listener.listen(settings.port, app.fetch));
  };

  const status = async (): Promise<McpStatus> => {
    const settings = await load();
    const url = `http://127.0.0.1:${settings.port}/mcp`;
    const command = `claude mcp add --scope user --transport http ${SERVER_NAME} ${url} --header "Authorization: Bearer ${settings.token}"`;
    return {
      enabled: settings.enabled,
      edits: settings.edits,
      running: await isListening(),
      url: settings.enabled ? url : null,
      command: settings.enabled ? command : null,
      error: lastError,
    };
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
        console.error("[mcp] could not start", error);
      });
    },
    stop,
  };
}
