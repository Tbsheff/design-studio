import type { Context, Hono } from "hono";
import { streamSSE } from "hono/streaming";

import type { ExportDeps } from "../export/source.js";
import { toSharePort } from "../platform/config/index.js";
import { assertSafeId } from "../platform/errors/index.js";
import { createShareListener, type ShareListener } from "../share/listener.js";
import { createLiveRefresher, type LiveHub } from "../share/live.js";
import { bindShareRuntime, toShareCore } from "../share/share-core.js";
import { isLive, type ShareStore } from "../share/store.js";
import { createViewerApp } from "../share/viewer-app.js";
import type { CommentStore } from "../store/comments.js";

export interface ShareRouteDeps extends ExportDeps {
  dataDir: string;
  studioPort: number;
  comments: CommentStore;
  readBody: (c: Context) => Promise<Record<string, unknown>>;
}

const PRESENCE_PING_MS = 15_000;

export function registerShareRoutes(
  app: Hono,
  deps: ShareRouteDeps
): ShareListener {
  const { files: store, hub } = toShareCore(deps.dataDir);
  const listener = createShareListener(
    createViewerApp({ shares: store, comments: deps.comments, hub }),
    store,
    toSharePort(deps.studioPort)
  );
  const refresher = createLiveRefresher(
    deps,
    store,
    hub,
    () => void listener.sync().catch(() => undefined)
  );
  bindShareRuntime(deps.dataDir, { deps, refresher, server: listener });
  void listener
    .sync()
    .catch((error: unknown) =>
      console.error("[share] listener start failed", error)
    );
  refresher.kick();
  registerPresenceRoute(app, deps, store, hub);

  return listener;
}

function registerPresenceRoute(
  app: Hono,
  deps: ShareRouteDeps,
  store: ShareStore,
  hub: LiveHub
): void {
  app.get("/api/projects/:pid/share-presence", async (c) => {
    const project = await deps.projects.get(
      assertSafeId(c.req.param("pid"), "projectId")
    );
    const now = Date.now();
    const live = (await store.list(project.id)).some(
      (r) => r.live === true && isLive(r, now)
    );
    return streamSSE(c, async (stream) => {
      if (!live) {
        await stream.writeSSE({ data: JSON.stringify({ type: "idle" }) });
        return;
      }
      let done = (): void => undefined;
      const ended = new Promise<void>((resolve) => (done = resolve));
      stream.onAbort(() => done());
      const off = hub.subscribeStudio(
        project.id,
        (event) =>
          void stream
            .writeSSE({ data: JSON.stringify(event) })
            .catch(() => done())
      );
      const ping = setInterval(
        () =>
          void stream
            .writeSSE({ event: "ping", data: "{}" })
            .catch(() => done()),
        PRESENCE_PING_MS
      );
      try {
        await ended;
      } finally {
        clearInterval(ping);
        off();
      }
    });
  });
}
