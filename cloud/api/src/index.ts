import { Effect, Layer, ManagedRuntime } from "effect";
import { Hono } from "hono";

import { AuthGateway } from "./auth/gateway.js";
import { AuthRateLimit } from "./auth/rate-limit.js";
import { mountMcp } from "./mcp/mount.js";
import { CloudBindings, configLayer } from "./platform/bindings.js";
import type { AppEnv } from "./platform/bindings.js";
import { CloudSettings } from "./platform/env.js";

const platformLayer = Layer.mergeAll(
  CloudBindings.layer,
  CloudSettings.layer
).pipe(Layer.provide(configLayer));

const appLayer = Layer.mergeAll(AuthGateway.layer, AuthRateLimit.layer).pipe(
  Layer.provideMerge(platformLayer)
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

mountMcp(app);

const worker = { fetch: app.fetch } satisfies ExportedHandler;

export { RateLimiter } from "./platform/rate-limiter.js";

export { worker as default };
