import { randomBytes } from "node:crypto";

import type { McpSetup } from "@design-studio/actions/connection/schema";
import type { McpStatus } from "@design-studio/contracts/export";
import { Effect } from "effect";
import { Hono } from "hono";

import type { ExportDeps } from "../export/source.js";
import type { WireArgs } from "../handlers/_core/run-action.js";
import type { McpListenerRunnerApi } from "../mcp-life/index.js";
import { toMcpEnv } from "../platform/config/index.js";
import { toLegacyPrincipal } from "../store/principal.js";
import type { EditDeps } from "./edit-guards.js";
import { EDIT_NAMES, EDIT_TOOLS } from "./edit-tools.js";
import { createKeyResolver, offlineRefusal } from "./key-auth.js";
import type { Introspect, Resolved } from "./key-auth.js";
import { toLegacyTargetArgs } from "./legacy-target.js";
import { withLegacyCaller } from "./legacy/caller-scope.js";
import type { FolderRootsLookup, LegacyCall } from "./legacy/caller-scope.js";
import { getFreePort, isPortFree, isSameText } from "./port-probe.js";
import { ActionTools } from "./registry.js";
import type { McpCaller } from "./registry.js";
import { argsOf, runActionEdit, runEdit } from "./run-edit.js";
import {
  fromMcpEnv,
  newToken,
  readMcpSettings,
  toMcpSettingsPath,
  toMcpUrl,
  writeMcpSettings,
} from "./settings.js";
import type { McpSettings } from "./settings.js";
import {
  FORBIDDEN_BODY,
  NOT_FOUND_BODY,
  OFFLINE_BODY,
  TOO_LARGE_BODY,
  UNAUTHORIZED_BODY,
} from "./wire-bodies.js";

const PROTOCOLS = ["2025-06-18", "2025-03-26", "2024-11-05"];
const MAX_BODY = 1024 * 1024;
const SERVER_NAME = "design-studio";
const READ_INSTRUCTIONS =
  "Design Studio is a local design tool. These tools read its projects: list_projects (or search_projects with a query) first, then get_tokens, get_design_md, get_frame_html, get_screenshot, list_files and read_file with a projectId. For an attached app, list_routes lists its routes. list_found_apps lists the app folders found in the home folder.";
const READ_ONLY_NOTE =
  " All tools are read-only. The user can turn on Allow edits in Design Studio to add tools that edit the design and the canvas.";
const EDITS_NOTE =
  " Allow edits is on, so the edit tools are on. Each design edit is saved as a version the user can take back with Cmd+Z; prototype link and canvas frame changes are steps of their own and save with the next version. edit_element and batch_edit take variant ('md:', 'hover:', 'md:hover:', 'dark:') to style one breakpoint or state; in an attached app they edit a shared component use (<Button>, <CardTitle>) in the page file where it is used, unless target is 'component'; edit_element and batch_edit text on text from a prop, a literal array, a constant or a messages key changes that literal at its source; get_layers lists the page as a tree of short layer ids (e0k3pz) that every selector or targetSelector input accepts in place of a CSS selector, with file:line:col that targetSource and source accept (file:line works when one tag starts on that line); ids stay the same when studio edits move lines; edit tools return when the file is written and saved, and get_layers waits for the dev server rebuild (pass wait: 'render' to an edit to wait in that call); arrange aligns, distributes or tidies up sibling elements by writing their auto layout (or left/top for absolute children) as one version, and measure gives the distance between two elements; use batch_edit to make several edits one version, and test_design_rules to try the project's design rules. These tools never start, steer or stop the studio agent (Improve with AI on a design system draft runs only from the app), and design edits are refused while a studio run edits that direction. list_breakpoints {frame? | width?, targetSelector? | targetSource?} reads the project breakpoints (Tailwind --breakpoint-* or sm 640, md 768, lg 1024, xl 1280), the active one for a frame width and the values each breakpoint overrides on a layer, and set_breakpoint_style {targetSelector | targetSource, breakpoint: base | md | lg ..., property, value | reset} writes one property at one breakpoint as md:/lg: classes that replace only the same utility at that prefix, or as an @media (min-width) rule in the page stylesheet of an HTML page; one version and one Cmd+Z step. swap_instance changes one component use to another library component (leave out name to list the ones that fit). select_matching {selector, by: component | classes | text-style} returns the layer ids of every element that matches one element, like Select matching in the studio. set_image {selector, path | url, fit, focal, alt} replaces the image of an <img> or a background image, or inserts an <img> into another element; it copies the file into the project assets folder with a content-hashed name (url: https, 10 MB, image types only), and its page input is the page path. draw_vector draws a rectangle, ellipse or pen path as an inline <svg>, boolean_shapes joins two SVG shapes (union, subtract, intersect, exclude) into one <path>, and paint_shape sets the fill, stroke or stroke width of an SVG shape; each is one version. set_layer_state locks, hides or renames a layer (locks live in the studio data folder; hide and rename change the source), list_locked_layers lists locks, and list_page_variations, keep_page_variation and discard_page_variation manage page variations without starting a run. move_element moves one element before or after a sibling (before / after: CSS selector or layer id) or to a left/top point in an absolute parent, as one version, like a drag on the canvas. import_figma_frame {nodesFile, nodeId, targetSelector} turns a Figma nodes JSON frame into flex markup with token colors and kit components as one version; dryRun returns the markup; it never calls Figma. The tool descriptions name the rest: comments, links and flows, frame states, versions and history, design systems, tokens, share links, publications, code and frame output, shipping, app fixes, run context, port plans and component usage.";
const EDITS_OFF =
  "Allow edits is off in Design Studio, so this tool is not available. The user can turn it on in Connect AI. Then reconnect the MCP server.";
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
    return withLegacyCaller(call, async () => {
      const run = async (next: Record<string, unknown>): Promise<unknown> => {
        const legacy = await toLegacyTargetArgs(
          ctx.deps,
          name,
          next as WireArgs
        );

        if (!legacy.isOk) {
          return {
            content: [{ text: legacy.message, type: "text" }],
            isError: true,
          };
        }

        return ActionTools.call(
          ctx.deps,
          name,
          legacy.args,
          callerOf(ctx, edits)
        );
      };
      if (edits !== null && !ActionTools.isRead(name))
        return runActionEdit({
          call: run,
          client: ctx.client,
          edits,
          name,
          raw: args,
        });
      return run(argsOf(args));
    });
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
      return c.json(FORBIDDEN_BODY, 403);
    if (c.req.header("origin") !== undefined)
      return c.json(FORBIDDEN_BODY, 403);
    const auth = c.req.header("authorization") ?? "";
    const unauthorized = (): Response =>
      c.json(UNAUTHORIZED_BODY, 401, {
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
    if (resolution.kind === "offline") return c.json(OFFLINE_BODY, 503);
    c.set("key", resolution.resolved);
    return next();
  });
  app.post("/mcp", async (c) => {
    const length = Number(c.req.header("content-length") ?? "0");
    if (length > MAX_BODY) return c.json(TOO_LARGE_BODY, 413);
    const raw = await c.req.text();
    if (raw.length > MAX_BODY) return c.json(TOO_LARGE_BODY, 413);
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
  app.notFound((c) => c.json(NOT_FOUND_BODY, 404));
  return app;
}

export interface TrustedFolders {
  list(): Promise<readonly string[]>;
  set(raw: readonly string[]): Promise<readonly string[]>;
}

export interface McpWiring {
  edits: EditDeps | null;
  introspect: Introspect;
  listener: McpListenerRunnerApi | null;
  trusted: TrustedFolders;
}

export interface McpService {
  status(): Promise<McpStatus>;
  setup(): Promise<McpSetup>;
  setEnabled(enabled: boolean): Promise<McpStatus>;
  setEdits(edits: boolean): Promise<McpStatus>;
  editsOn(): Promise<boolean>;
  rotate(): Promise<McpStatus>;
  setTrustedFolders(raw: readonly string[]): Promise<void>;
  boot(): Promise<void>;
  stop(): Promise<void>;
}

export function createMcpService(
  dataDir: string,
  deps: ExportDeps,
  wiring: McpWiring
): McpService {
  const { edits, introspect, listener, trusted } = wiring;
  let current: McpSettings | null = null;
  let lastError: string | null = null;
  const app = createMcpApp(
    deps,
    edits,
    () => current as McpSettings,
    introspect
  );

  const load = async (): Promise<McpSettings> => {
    current ??= fromMcpEnv(await readMcpSettings(dataDir), toMcpEnv());
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
    if (!(await isListening())) {
      if (!(await isPortFree(settings.port)))
        settings.port = await getFreePort();
      await Effect.runPromise(listener.listen(settings.port, app.fetch));
      console.info(
        `[mcp] listening on ${toMcpUrl(settings.port)}; url and token in ${toMcpSettingsPath(dataDir)}`
      );
    }
    await writeMcpSettings(dataDir, settings);
  };

  const status = async (): Promise<McpStatus> => {
    const settings = await load();
    const url = toMcpUrl(settings.port);
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

  const setup = async (): Promise<McpSetup> => {
    const settings = await load();
    return {
      canEdit: settings.edits,
      isEnabled: settings.enabled,
      isRunning: await isListening(),
      name: SERVER_NAME,
      token: settings.token,
      trustedFolders: [...(await trusted.list())],
      url: toMcpUrl(settings.port),
    };
  };

  return {
    status,
    setup,
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
    async setTrustedFolders(raw) {
      await trusted.set(raw);
    },
    async boot() {
      const settings = await load();
      const env = toMcpEnv();
      if (env.isEnabled !== null || env.canEdit !== null)
        await writeMcpSettings(dataDir, settings);
      if (!settings.enabled) return;
      await start().catch((error: unknown) => {
        lastError = error instanceof Error ? error.message : String(error);
        console.error("[mcp] could not start", error);
      });
    },
    stop,
  };
}
