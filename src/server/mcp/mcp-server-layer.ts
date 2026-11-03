import { timingSafeEqual } from "node:crypto";
import type { Server } from "node:http";
import net from "node:net";

import { serve } from "@hono/node-server";
import { Context, Effect, Layer } from "effect";

const LOOPBACK = "127.0.0.1";

interface McpServerApi {
  readonly close: () => Promise<void>;
  readonly isListening: () => boolean;
  readonly listen: (
    port: number,
    fetch: (request: Request) => Response | Promise<Response>
  ) => Promise<void>;
}

const sameText = (a: string, b: string): boolean => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  return left.length === right.length && timingSafeEqual(left, right);
};

const portFree = (port: number): Promise<boolean> =>
  new Promise((resolve) => {
    const probe = net.createServer();

    probe.unref();
    probe.once("error", () => resolve(false));
    probe.listen({ exclusive: true, host: "127.0.0.1", port }, () =>
      probe.close(() => resolve(true))
    );
  });

const freePort = (): Promise<number> =>
  new Promise((resolve, reject) => {
    const probe = net.createServer();

    probe.unref();
    probe.once("error", reject);
    probe.listen({ host: "127.0.0.1", port: 0 }, () => {
      const address = probe.address();

      probe.close(() =>
        typeof address === "object" && address
          ? resolve(address.port)
          : reject(new Error("no free port"))
      );
    });
  });

const closeServer = (running: Server): Promise<void> =>
  new Promise<void>((resolve) => {
    running.close(() => resolve());
  });

const makeHolder = (): McpServerApi => {
  let server: Server | null = null;

  const close = async (): Promise<void> => {
    const running = server;

    server = null;

    if (running) {
      await closeServer(running);
    }
  };

  const listen: McpServerApi["listen"] = async (port, fetch) => {
    if (server) {
      return;
    }

    const hostname = LOOPBACK;

    server = await new Promise<Server>((resolve, reject) => {
      const created = serve({ fetch, hostname, port }, () =>
        resolve(created as Server)
      ) as Server;

      created.once("error", reject);
    });
  };

  const isListening = (): boolean => server !== null;

  return { close, isListening, listen };
};

class McpServer extends Context.Service<McpServer, McpServerApi>()(
  "design-studio/mcp/McpServer"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.effect(
    McpServer,
    Effect.acquireRelease(
      Effect.sync(() => makeHolder()),
      (holder) => Effect.promise(() => holder.close())
    ).pipe(Effect.map((holder) => McpServer.of(holder)))
  );
}

export { freePort, makeHolder, McpServer, portFree, sameText };

export type { McpServerApi };
