import type { StudioEvent } from "@design-studio/contracts";
import type { Hono } from "hono";
import { streamSSE } from "hono/streaming";

import type { AppContext } from "./app-context.js";
import { HEARTBEAT_MS } from "./app-request.js";

const toIgnoredFailure = (): null => null;

const registerEventsRoutes = (app: Hono, ctx: AppContext): void => {
  const { bus, projects, streamTracker } = ctx;

  app.get("/api/projects/:pid/events", async (c) => {
    const project = await projects.get(c.req.param("pid"));

    const rawAfter =
      c.req.header("last-event-id") ?? c.req.query("after") ?? "0";

    const after = Number.parseInt(rawAfter, 10);
    const afterSeq = Number.isFinite(after) && after >= 0 ? after : 0;

    return streamSSE(c, async (stream) => {
      streamTracker.opened();
      const pending: StudioEvent[] = [];
      let wake: (() => void) | null = null;
      let closed = false;

      const unsubscribe = bus.subscribe(project.id, (event) => {
        pending.push(event);
        wake?.();
      });

      const heartbeat = setInterval(() => {
        void stream.write(": ping\n\n").catch(toIgnoredFailure);
      }, HEARTBEAT_MS);

      stream.onAbort(() => {
        closed = true;
        wake?.();
      });

      try {
        let lastSent = afterSeq;

        const send = async (event: StudioEvent): Promise<void> => {
          if (event.seq <= lastSent) {
            return;
          }
          lastSent = event.seq;
          await stream.writeSSE({
            data: JSON.stringify(event),
            event: event.type,
            id: String(event.seq),
          });
        };

        for (const event of await bus.since(project.id, afterSeq)) {
          await send(event);
        }
        while (!closed) {
          const batch = pending.splice(0);

          for (const event of batch) {
            await send(event);
          }
          if (pending.length === 0 && !closed) {
            await new Promise<void>((resolve) => {
              wake = resolve;
            });
            wake = null;
          }
        }
      } finally {
        streamTracker.closed();
        clearInterval(heartbeat);
        unsubscribe();
      }
    });
  });
};

export { registerEventsRoutes };
