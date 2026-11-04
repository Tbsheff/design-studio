import { firstText, parseText, studioJson, timed } from "./call-types.js";
import type {
  Context,
  Fields,
  Json,
  SurfaceResult,
  TextResult,
} from "./call-types.js";

interface McpStatus {
  readonly command: string | null;
  readonly edits: boolean;
  readonly enabled: boolean;
  readonly url: string | null;
}

interface McpTarget {
  readonly token: string;
  readonly url: string;
}

interface McpSession {
  readonly session: string;
  readonly target: McpTarget;
}

interface Prepared {
  readonly restore: Fields;
  readonly status: McpStatus;
}

interface RpcReply {
  readonly error?: { readonly message: string };
  readonly result?: TextResult;
}

const BEARER = /Bearer (?<token>[^"\s]+)/u;

const PROTOCOL = "2025-06-18";

const changesFor = (context: Context, before: McpStatus): Fields => {
  const change: Record<string, Json> = {};

  if (!before.enabled) {
    change.enabled = true;
  }

  if (context.action.access !== "read" && !before.edits) {
    change.edits = true;
  }

  return change;
};

const prepareMcp = async (context: Context): Promise<Prepared> => {
  const before = await studioJson<McpStatus>(context, "/api/mcp", null);
  const change = changesFor(context, before);

  if (Object.keys(change).length === 0) {
    return { restore: {}, status: before };
  }

  const status = await studioJson<McpStatus>(context, "/api/mcp", change);

  const restore = Object.fromEntries(
    Object.keys(change).map((key) => [key, false])
  );

  return { restore, status };
};

const restoreMcp = async (context: Context, restore: Fields): Promise<void> => {
  if (restore.edits === false) {
    await studioJson(context, "/api/mcp", { edits: false });
  }

  if (restore.enabled === false) {
    await studioJson(context, "/api/mcp", { enabled: false });
  }
};

const mcpTarget = (status: McpStatus): McpTarget => {
  const token = BEARER.exec(status.command ?? "")?.groups?.token ?? "";

  if (status.url === null || token === "") {
    throw new Error("the studio MCP server gave no url or token");
  }

  return { token, url: status.url };
};

const postRpc = (
  target: McpTarget,
  session: string,
  message: Fields
): Promise<Response> => {
  const requestHeaders = new Headers({
    accept: "application/json, text/event-stream",
    authorization: `Bearer ${target.token}`,
    "content-type": "application/json",
  });

  if (session !== "") {
    requestHeaders.set("mcp-session-id", session);
  }

  return fetch(target.url, {
    body: JSON.stringify({ jsonrpc: "2.0", ...message }),
    headers: requestHeaders,
    method: "POST",
  });
};

const openSession = async (status: McpStatus): Promise<McpSession> => {
  const target = mcpTarget(status);

  const res = await postRpc(target, "", {
    id: 1,
    method: "initialize",
    params: {
      capabilities: {},
      clientInfo: { name: "call-action", version: "0.1.0" },
      protocolVersion: PROTOCOL,
    },
  });

  const session = res.headers.get("mcp-session-id") ?? "";

  await postRpc(target, session, { method: "notifications/initialized" });

  return { session, target };
};

const runMcpTool = async (
  status: McpStatus,
  name: string,
  input: Fields
): Promise<TextResult> => {
  const { session, target } = await openSession(status);

  const res = await postRpc(target, session, {
    id: 2,
    method: "tools/call",
    params: { arguments: input, name },
  });

  const reply = (await res.json()) as RpcReply;

  if (!reply.result) {
    throw new Error(`MCP tools/call failed: ${reply.error?.message ?? ""}`);
  }

  return reply.result;
};

const callMcp = async (context: Context): Promise<SurfaceResult> => {
  const { name, off } = context.action.mcp;

  if (!name) {
    return { reason: `mcp binding is off (${off})`, surface: "mcp" };
  }

  const { restore, status } = await prepareMcp(context);

  try {
    const timing = await timed(() => runMcpTool(status, name, context.input));

    return {
      isError: timing.value.isError === true,
      ms: timing.ms,
      output: parseText(firstText(timing.value)),
      spawns: null,
      surface: "mcp",
    };
  } finally {
    await restoreMcp(context, restore);
  }
};

export { callMcp };
