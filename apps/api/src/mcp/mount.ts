import { Effect } from "effect";
import type { Layer, ManagedRuntime } from "effect";
import type { Hono } from "hono";

import { withAgent } from "../http/middleware/agent-auth.js";
import type { AppEnv } from "../platform/bindings.js";
import { ACCEPTED, BAD_REQUEST } from "../shared-actions.js";
import type { OK } from "../shared-actions.js";
import type { mcpLayer } from "./layer.js";
import { runMethod, toFailure, toResult } from "./rpc.js";
import type { RpcReply, RpcRequest } from "./rpc.js";

type McpRuntime = ManagedRuntime.ManagedRuntime<
  Layer.Success<typeof mcpLayer>,
  unknown
>;

const readRpc = async (request: Request): Promise<RpcRequest | null> => {
  const text = await request.text();

  try {
    return JSON.parse(text) as RpcRequest;
  } catch {
    return null;
  }
};

const handleRpc = Effect.fn("McpMount.handle")(function* run(
  orgId: string,
  request: Request,
  rpc: RpcRequest
) {
  return yield* runMethod(orgId, rpc).pipe(
    withAgent(request),
    Effect.match({
      onFailure: (error): RpcReply =>
        toFailure(rpc.id, error._tag, error.message),
      onSuccess: (result): RpcReply => toResult(rpc.id, result),
    })
  );
});

const mountMcp = (
  app: Hono<{ Bindings: AppEnv }>,
  runtime: McpRuntime
): void => {
  app.post("/v1/o/:org/mcp", async (context) => {
    const rpc = await readRpc(context.req.raw);

    if (rpc === null) {
      return context.json(
        toFailure(null, "BadRequest", "The body is not JSON.").body,
        BAD_REQUEST
      );
    }

    if (rpc.method?.startsWith("notifications/")) {
      return new Response(null, { status: ACCEPTED });
    }

    const reply = await runtime.runPromise(
      handleRpc(context.req.param("org"), context.req.raw, rpc)
    );

    return context.json(reply.body, reply.status as typeof OK);
  });
};

export { mountMcp };
