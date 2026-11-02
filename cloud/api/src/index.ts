import { Effect, Layer, ManagedRuntime } from "effect";
import { Hono } from "hono";

import { CloudBindings, configLayer } from "./platform/bindings.js";
import type { AppEnv } from "./platform/bindings.js";
import { CloudSettings } from "./platform/env.js";

const platformLayer = Layer.mergeAll(
  CloudBindings.layer,
  CloudSettings.layer
).pipe(Layer.provide(configLayer));

const runtime = ManagedRuntime.make(platformLayer);

const readHealth = Effect.fn("cloud.health")(function* run() {
  const settings = yield* CloudSettings;

  return { authUrl: settings.authUrl, isOk: true };
});

const app = new Hono<{ Bindings: AppEnv }>();

app.get("/health", async (context) => {
  const health = await runtime.runPromise(readHealth());

  return context.json(health);
});

const worker = { fetch: app.fetch } satisfies ExportedHandler;

export { RateLimiter } from "./platform/rate-limiter.js";

export { worker as default };
