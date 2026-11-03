import { Effect, Layer, ManagedRuntime } from "effect";
import type { Hono } from "hono";

import { AuthGateway } from "../auth/gateway.js";
import { AuthRateLimit } from "../auth/rate-limit.js";
import { AgentAuth, withAgent } from "../http/middleware/agent-auth.js";
import { MemberDirectory } from "../http/middleware/member-directory.js";
import { CloudBindings, configLayer } from "../platform/bindings.js";
import type { AppEnv } from "../platform/bindings.js";
import { CloudSettings } from "../platform/env.js";
import { TenantDb } from "../tenant/db.js";
import { AgentRequestRepo } from "../tenant/repos/agent-request.js";
import { ProjectsRepo } from "../tenant/repos/projects.js";
import { VersionsRepo } from "../tenant/repos/versions.js";
import { CommentQueries } from "./comment-queries.js";
import { runMethod, toFailure, toResult } from "./rpc.js";
import type { RpcReply, RpcRequest } from "./rpc.js";

const platformLayer = Layer.mergeAll(
  CloudBindings.layer,
  CloudSettings.layer
).pipe(Layer.provide(configLayer));

const authLayer = Layer.mergeAll(AuthGateway.layer, AuthRateLimit.layer).pipe(
  Layer.provideMerge(platformLayer)
);

const reposLayer = Layer.mergeAll(
  ProjectsRepo.layer,
  VersionsRepo.layer,
  AgentRequestRepo.layer,
  CommentQueries.layer
).pipe(Layer.provide(TenantDb.layer));

const mcpLayer = Layer.mergeAll(
  AgentAuth.layer.pipe(Layer.provide(MemberDirectory.layer)),
  reposLayer
).pipe(Layer.provideMerge(authLayer));

const runtime = ManagedRuntime.make(mcpLayer);

const readRpc = async (request: Request): Promise<RpcRequest | null> => {
  const text = await request.text();

  try {
    return JSON.parse(text) as RpcRequest;
  } catch {
    return null;
  }
};

interface RpcFailure {
  readonly _tag?: string;
  readonly message?: string;
}

const HTTP_OK = 200;

const HTTP_ACCEPTED = 202;

const HTTP_BAD_REQUEST = 400;

const handleRpc = Effect.fn("McpMount.handle")(function* run(
  orgId: string,
  request: Request,
  rpc: RpcRequest
) {
  return yield* runMethod(orgId, rpc).pipe(
    withAgent(request),
    Effect.match({
      onFailure: (error: RpcFailure): RpcReply =>
        toFailure(
          rpc.id,
          error._tag ?? "BadRequest",
          error.message ?? "The request failed."
        ),
      onSuccess: (result): RpcReply => toResult(rpc.id, result),
    })
  );
});

const mountMcp = (app: Hono<{ Bindings: AppEnv }>): void => {
  app.post("/v1/o/:org/mcp", async (context) => {
    const rpc = await readRpc(context.req.raw);

    if (rpc === null) {
      return context.json(
        toFailure(null, "BadRequest", "The body is not JSON.").body,
        HTTP_BAD_REQUEST
      );
    }

    if (rpc.method?.startsWith("notifications/")) {
      return new Response(null, { status: HTTP_ACCEPTED });
    }

    const reply = await runtime.runPromise(
      handleRpc(context.req.param("org"), context.req.raw, rpc)
    );

    return context.json(reply.body, reply.status as typeof HTTP_OK);
  });
};

export { mountMcp };
