import type { Server } from "node:http";

import { serve } from "@hono/node-server";
import { Context, Effect, Layer, Ref } from "effect";

import { Unavailable } from "../../shared/actions/_core/errors/unavailable.js";

type McpFetch = (request: Request) => Response | Promise<Response>;

interface McpListenerRunnerApi {
  readonly close: () => Effect.Effect<void>;
  readonly isListening: () => Effect.Effect<boolean>;
  readonly listen: (
    port: number,
    fetch: McpFetch
  ) => Effect.Effect<void, Unavailable>;
}

const LOOPBACK = "127.0.0.1";

const toListenError = (port: number, error: Error): Unavailable =>
  new Unavailable({
    message: `The MCP server could not listen on port ${port}: ${error.message}`,
  });

const startServer = (
  listenPort: number,
  handler: McpFetch
): Effect.Effect<Server, Unavailable> =>
  Effect.callback<Server, Unavailable>((resume) => {
    const options = { fetch: handler, hostname: LOOPBACK, port: listenPort };

    const created = serve(options, () => {
      resume(Effect.succeed(created as Server));
    }) as Server;

    created.once("error", (error) => {
      resume(Effect.fail(toListenError(listenPort, error)));
    });
  });

const stopServer = (running: Server): Effect.Effect<void> =>
  Effect.callback((resume) => {
    running.close(() => {
      resume(Effect.void);
    });
  });

class McpListenerRunner extends Context.Service<
  McpListenerRunner,
  McpListenerRunnerApi
>()("design-studio/mcp-life/McpListenerRunner") {
  declare public readonly access: "write";

  public static readonly layer = Layer.effect(
    McpListenerRunner,
    Effect.gen(function* build() {
      const current = yield* Ref.make<Server | null>(null);

      const close = Effect.fn("McpListenerRunner.close")(function* stop() {
        const running = yield* Ref.getAndSet(current, null);

        if (running !== null) {
          yield* stopServer(running);
        }
      });

      yield* Effect.addFinalizer(() => close());

      return McpListenerRunner.of({
        close,
        isListening: Effect.fn("McpListenerRunner.isListening")(
          function* check() {
            const running = yield* Ref.get(current);

            return running !== null;
          }
        ),
        listen: Effect.fn("McpListenerRunner.listen")(function* start(
          port: number,
          fetch: McpFetch
        ) {
          const running = yield* Ref.get(current);

          if (running !== null) {
            return;
          }

          const created = yield* startServer(port, fetch);

          yield* Ref.set(current, created);
        }),
      });
    })
  );
}

export { McpListenerRunner };

export type { McpFetch, McpListenerRunnerApi };
