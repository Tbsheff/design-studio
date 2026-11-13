import { readFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";

import {
  BRIDGE_SCRIPT_PATH,
  projectPreviewHost,
} from "@design-studio/contracts";
import { getRequestListener } from "@hono/node-server";
import { Hono } from "hono";
import type { Context } from "hono";

import type { AppProxy } from "../app/proxy.js";
import { injectForPreview } from "../design-system/html-link.js";
import type { ServerConfig } from "../platform/config/index.js";
import { annotateHtml, COMPLETE_SCRIPT_PATH } from "./annotate.js";
import {
  COMPLETE_POST_PATH,
  COMPLETE_SCRIPT,
  isPreviewOrigin,
  runCompleteForward,
  toProjectIdFromHost,
} from "./complete-script.js";
import { toContentType, toRelativePath, toServedPath } from "./static-files.js";

export type RootKind = "direction" | "snapshot";

interface HtmlServerOptions {
  port: number;
  studio: Pick<ServerConfig, "studioOrigin" | "studioToken">;
  hostname?: string;
  bridgeScript: () => Promise<string>;
  resolveRoot: (
    kind: RootKind,
    projectId: string,
    key: string
  ) => Promise<string | null>;
  appProxy?: AppProxy;
}

export interface HtmlServer {
  close(): Promise<void>;
}

const SAFE_ID = /^[A-Za-z0-9_.-]+$/;

function frameAncestors(studioOrigin: string): string {
  const origins = new Set([
    studioOrigin,
    "http://127.0.0.1:5173",
    "http://localhost:5173",
  ]);

  return `frame-ancestors ${[...origins].join(" ")}`;
}

function hostMatchesProject(
  hostHeader: string | undefined,
  projectId: string,
  port: number
): boolean {
  if (!hostHeader) {
    return false;
  }

  return (
    hostHeader.toLowerCase() === `${projectPreviewHost(projectId)}:${port}`
  );
}

function listenOn(
  app: Hono,
  port: number,
  hostname: string,
  appProxy: AppProxy | undefined
): Promise<http.Server> {
  const honoListener = getRequestListener(app.fetch);

  const appProjectOf = async (
    req: http.IncomingMessage
  ): Promise<string | null> => {
    const projectId = appProxy?.projectOf(req) ?? null;

    if (!projectId || !SAFE_ID.test(projectId)) {
      return null;
    }

    return (await appProxy?.isApp(projectId).catch(() => false))
      ? projectId
      : null;
  };

  return new Promise<http.Server>((resolve, reject) => {
    const instance = http.createServer((req, res) => {
      void appProjectOf(req)
        .then((projectId) => {
          if (projectId && appProxy) {
            return appProxy.handle(req, res, projectId);
          }

          return honoListener(req, res);
        })
        .catch(() => {
          if (!res.headersSent) {
            res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
          }

          res.end("Preview error");
        });
    });

    instance.on(
      "upgrade",
      (req: http.IncomingMessage, socket, head: Buffer) => {
        void appProjectOf(req)
          .then(async (projectId) => {
            if (projectId && appProxy) {
              await appProxy.upgrade(req, socket, head, projectId);
            } else {
              socket.destroy();
            }
          })
          .catch(() => socket.destroy());
      }
    );
    instance.once("error", reject);
    instance.listen(port, hostname, () => resolve(instance));
  });
}

function closeServer(server: http.Server): Promise<void> {
  return new Promise<void>((resolve) => {
    server.closeAllConnections();
    server.close(() => resolve());
  });
}

export async function startHtmlServer(
  options: HtmlServerOptions
): Promise<HtmlServer> {
  const app = new Hono();

  const securityHeaders = {
    "content-security-policy": frameAncestors(options.studio.studioOrigin),
    "cross-origin-resource-policy": "same-origin",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
  };

  app.get(BRIDGE_SCRIPT_PATH, async (c) => {
    const script = await options.bridgeScript();

    return c.body(script, 200, {
      ...securityHeaders,
      "cache-control": "no-store",
      "content-type": "text/javascript; charset=utf-8",
    });
  });

  app.get(COMPLETE_SCRIPT_PATH, (c) =>
    c.body(COMPLETE_SCRIPT, 200, {
      ...securityHeaders,
      "cache-control": "no-store",
      "content-type": "text/javascript; charset=utf-8",
    })
  );

  app.post(COMPLETE_POST_PATH, async (c) => {
    const projectId = toProjectIdFromHost(c.req.header("host") ?? null);

    if (projectId === null) {
      return c.text("Not found", 404, securityHeaders);
    }

    if (
      !isPreviewOrigin(
        c.req.header("origin") ?? null,
        c.req.header("host") ?? null
      )
    ) {
      return c.text("Forbidden", 403, securityHeaders);
    }

    const forwarded = await runCompleteForward(
      options.studio.studioOrigin,
      options.studio.studioToken,
      projectId,
      await c.req.text()
    );

    return c.body(forwarded.body, forwarded.status as 200, {
      ...securityHeaders,
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
    });
  });

  const serveFrom = async (
    c: Context,
    kind: RootKind,
    projectId: string,
    key: string,
    prefix: string
  ) => {
    if (!SAFE_ID.test(projectId) || !SAFE_ID.test(key)) {
      return c.text("Not found", 404, securityHeaders);
    }

    if (!hostMatchesProject(c.req.header("host"), projectId, options.port)) {
      return c.text(
        "This preview origin does not belong to that project",
        403,
        securityHeaders
      );
    }

    const root = await options
      .resolveRoot(kind, projectId, key)
      .catch(() => null);

    if (!root) {
      return c.text("Not found", 404, securityHeaders);
    }

    const relative = toRelativePath(c.req.path.slice(prefix.length));

    if (relative === null) {
      return c.text("Bad path", 400, securityHeaders);
    }

    const resolved = await toServedPath(root, relative || "index.html");

    if (!resolved) {
      return c.text("Not found", 404, securityHeaders);
    }

    const extension = path.extname(resolved.file).toLowerCase();
    const contentType = toContentType(extension) ?? "application/octet-stream";

    const headers = {
      ...securityHeaders,
      "cache-control": "no-store",
      "content-type": contentType,
    };

    if (extension === ".html" || extension === ".htm") {
      const source = await readFile(resolved.file, "utf-8");
      const annotated = annotateHtml(source, resolved.relative);

      return c.body(
        await injectForPreview(root, resolved.relative, annotated),
        200,
        headers
      );
    }

    const bytes = await readFile(resolved.file);

    return c.body(new Uint8Array(bytes), 200, headers);
  };

  app.get("/d/:pid/:did/*", (c) => {
    const pid = c.req.param("pid");
    const did = c.req.param("did");

    return serveFrom(c, "direction", pid, did, `/d/${pid}/${did}`);
  });

  app.get("/s/:pid/:sha/*", (c) => {
    const pid = c.req.param("pid");
    const sha = c.req.param("sha");

    return serveFrom(c, "snapshot", pid, sha, `/s/${pid}/${sha}`);
  });

  app.notFound((c) => c.text("Not found", 404, securityHeaders));
  app.onError((_error, c) => c.text("Preview error", 500, securityHeaders));

  const primary = await listenOn(
    app,
    options.port,
    options.hostname ?? "127.0.0.1",
    options.appProxy
  );

  const port =
    (primary.address() as { port?: number } | null)?.port ?? options.port;

  const loopbackV6 = await listenOn(app, port, "::1", options.appProxy).catch(
    () => null
  );

  const servers = loopbackV6 ? [primary, loopbackV6] : [primary];

  return {
    close: async () => {
      await Promise.all(servers.map(closeServer));
    },
  };
}
