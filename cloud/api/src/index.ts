import { Effect, Layer, ManagedRuntime } from "effect";
import { Hono } from "hono";

import { AuthGateway } from "./auth/gateway.js";
import { AuthRateLimit } from "./auth/rate-limit.js";
import { runHourly } from "./cron.js";
import { mountShare } from "./http/share-routes.js";
import { mountViewer } from "./http/viewer-routes.js";
import { mcpLayer } from "./mcp/layer.js";
import { mountMcp } from "./mcp/mount.js";
import { CloudBindings, configLayer } from "./platform/bindings.js";
import type { AppEnv, CloudEnv } from "./platform/bindings.js";
import { CloudSettings } from "./platform/env.js";
import { shareLayer } from "./share/layer.js";
import { viewerLayer } from "./viewer/layer.js";

const platformLayer = Layer.mergeAll(
  CloudBindings.layer,
  CloudSettings.layer
).pipe(Layer.provide(configLayer));

const authLayer = Layer.mergeAll(AuthGateway.layer, AuthRateLimit.layer).pipe(
  Layer.provideMerge(platformLayer)
);

const appLayer = Layer.mergeAll(mcpLayer, viewerLayer, shareLayer).pipe(
  Layer.provideMerge(authLayer)
);

const runtime = ManagedRuntime.make(appLayer);

const readHealth = Effect.fn("cloud.health")(function* run() {
  const settings = yield* CloudSettings;

  return { authUrl: settings.authUrl, isOk: true };
});

const handleAuth = Effect.fn("cloud.auth")(function* run(request: Request) {
  const gateway = yield* AuthGateway;

  return yield* gateway.handle(request);
});

const app = new Hono<{ Bindings: AppEnv }>();

app.get("/health", async (context) => {
  const health = await runtime.runPromise(readHealth());

  return context.json(health);
});

app.on(
  ["GET", "POST"],
  "/api/auth/*",
  async (context) => await runtime.runPromise(handleAuth(context.req.raw))
);

mountMcp(app, runtime);

mountViewer(app, runtime);

mountShare(app, runtime);

const worker = {
  fetch: app.fetch,
  scheduled: (_controller, env, context): void => {
    context.waitUntil(runHourly(env, Date.now()));
  },
} satisfies ExportedHandler<CloudEnv>;

export { RateLimiter } from "./platform/rate-limiter.js";

export { ShareLive } from "./share/share-live.js";

export { UnlockLockout } from "./viewer/unlock-lockout.js";

export { worker as default };
