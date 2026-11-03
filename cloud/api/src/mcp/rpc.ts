import { Effect } from "effect";

import { requireOrg } from "../http/groups/authorizer.js";
import { callTool, listTools } from "./tools.js";

interface RpcRequest {
  readonly id?: number | string | null;
  readonly method?: string;
  readonly params?: Readonly<Record<string, unknown>>;
}

interface TextContent {
  readonly content: readonly { readonly text: string; readonly type: string }[];
}

interface RpcReply {
  readonly body: unknown;
  readonly status: number;
}

const PROTOCOL_VERSION = "2025-03-26";

const RPC_ERROR_CODE = -32_000;

const HTTP_OK = 200;

const HTTP_BAD_REQUEST = 400;

const HTTP_CONFLICT = 409;

const HTTP_FORBIDDEN = 403;

const HTTP_NOT_FOUND = 404;

const HTTP_UNAUTHORIZED = 401;

const ERROR_STATUS = {
  BadRequest: HTTP_BAD_REQUEST,
  Conflict: HTTP_CONFLICT,
  Forbidden: HTTP_FORBIDDEN,
  NotFound: HTTP_NOT_FOUND,
  Unauthenticated: HTTP_UNAUTHORIZED,
} as const satisfies Readonly<Record<string, number>>;

const toStatus = (tag: string): number =>
  Object.entries(ERROR_STATUS).find(([name]) => name === tag)?.[1] ??
  HTTP_BAD_REQUEST;

const toResult = (id: RpcRequest["id"], result: unknown): RpcReply => ({
  body: { id: id ?? null, jsonrpc: "2.0", result },
  status: HTTP_OK,
});

const toFailure = (
  id: RpcRequest["id"],
  tag: string,
  message: string
): RpcReply => ({
  body: {
    error: { code: RPC_ERROR_CODE, data: { tag }, message },
    id: id ?? null,
    jsonrpc: "2.0",
  },
  status: toStatus(tag),
});

const toText = (value: unknown): TextContent => ({
  content: [{ text: JSON.stringify(value), type: "text" }],
});

const runCall = Effect.fn("McpRpc.call")(function* run(
  orgId: string,
  request: RpcRequest
) {
  yield* requireOrg(orgId);

  const name = String(request.params?.name ?? "");
  const value = yield* callTool(name, request.params?.arguments);

  return toText(value);
});

const runMethod = Effect.fn("McpRpc.method")(function* run(
  orgId: string,
  request: RpcRequest
) {
  yield* requireOrg(orgId);

  if (request.method === "initialize") {
    return {
      capabilities: { tools: {} },
      protocolVersion: PROTOCOL_VERSION,
      serverInfo: { name: "design-studio-cloud", version: "1" },
    };
  }

  if (request.method === "tools/list") {
    return { tools: listTools() };
  }

  if (request.method === "tools/call") {
    return yield* runCall(orgId, request);
  }

  return {};
});

export { runMethod, toFailure, toResult };

export type { RpcReply, RpcRequest, TextContent };
