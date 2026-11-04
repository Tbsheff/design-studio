import { STUDIO_TOKEN_HEADER } from "@design-studio/contracts";
import type { Context, Hono, Next } from "hono";

import { APP_STREAM_PATH } from "../../shared/app-stream.js";
import type { AppContext } from "./app-context.js";

const FORBIDDEN_STATUS = 403;

const PROJECT_EVENTS_PATH = /^\/api\/projects\/[^/]+\/events$/u;

const isEventStreamRequest = (method: string, requestPath: string): boolean =>
  method === "GET" &&
  (PROJECT_EVENTS_PATH.test(requestPath) || requestPath === APP_STREAM_PATH);

const isOriginAllowed = (
  allowedOrigins: ReadonlySet<string>,
  origin: string | null
): boolean => origin === null || allowedOrigins.has(origin);

const readToken = (context: Context): string | null => {
  const headerToken = context.req.header(STUDIO_TOKEN_HEADER) ?? null;

  if (headerToken !== null) {
    return headerToken;
  }

  if (!isEventStreamRequest(context.req.method, context.req.path)) {
    return null;
  }

  return context.req.query("token") ?? null;
};

const registerLoopbackGuard = (app: Hono, ctx: AppContext): void => {
  const { allowedOrigins, config } = ctx;

  app.use("/api/*", (context: Context, next: Next) => {
    const origin = context.req.header("origin") ?? null;

    if (!isOriginAllowed(allowedOrigins, origin)) {
      return Promise.resolve(
        context.json({ error: "forbidden" }, FORBIDDEN_STATUS)
      );
    }

    if (readToken(context) !== config.studioToken) {
      return Promise.resolve(
        context.json({ error: "forbidden" }, FORBIDDEN_STATUS)
      );
    }

    return next();
  });
};

export { registerLoopbackGuard };
