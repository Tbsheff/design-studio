import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";

import type { DesignComment } from "@design-studio/contracts";
import {
  SHARE_COMMENT_MAX,
  SHARE_LIVE_VIEWERS_MAX,
  SHARE_NAME_MAX,
} from "@design-studio/contracts/share";
import { getConnInfo } from "@hono/node-server/conninfo";
import { Result, Schema } from "effect";
import { Hono } from "hono";
import type { Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import { streamSSE } from "hono/streaming";

import { toDecoder } from "../platform/decode/index.js";
import type { CommentStore } from "../store/comments.js";
import { FAVICON_PNG_16, FAVICON_PNG_32, FAVICON_SVG } from "./favicon.js";
import type { LiveHub } from "./live.js";
import { frameFile } from "./snapshot.js";
import type { ShareRecord, ShareStore } from "./store.js";
import { goneHtml, viewerHtml } from "./viewer-page.js";

const BODY_MAX = 8 * 1024;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 10;
const LINK_COMMENTS_MAX = 200;
const CURSOR_BODY_MAX = 512;
const JOIN_MAX = 30;
const PING_MS = 15_000;

const CURSOR_KEY = /^[A-Za-z0-9_-]{24}$/u;
const COORD_MAX = 100_000;
const FRAME_MAX = 100;

const toCoordinate = (): Schema.Number =>
  Schema.Number.check(Schema.isBetween({ maximum: COORD_MAX, minimum: 0 }));

const toWholeCoordinate = (): Schema.Int =>
  Schema.Int.check(Schema.isBetween({ maximum: COORD_MAX, minimum: 0 }));

const toFrameNumber = (): Schema.Int =>
  Schema.Int.check(Schema.isBetween({ maximum: FRAME_MAX, minimum: 0 }));

const CursorSchema = Schema.Struct({
  frame: Schema.NullOr(toFrameNumber()),
  key: Schema.String.check(Schema.isPattern(CURSOR_KEY)),
  name: Schema.Trim.check(Schema.isMaxLength(SHARE_NAME_MAX)),
  x: toCoordinate(),
  y: toCoordinate(),
});

const PostSchema = Schema.Struct({
  frame: toFrameNumber(),
  name: Schema.Trim.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(SHARE_NAME_MAX)
  ),
  text: Schema.Trim.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(SHARE_COMMENT_MAX)
  ),
  x: Schema.NullOr(toWholeCoordinate()),
  y: Schema.NullOr(toWholeCoordinate()),
});

const decodeCursor = toDecoder(CursorSchema, "error");
const decodePost = toDecoder(PostSchema, "error");

export interface ViewerAppDeps {
  shares: ShareStore;
  comments: CommentStore;
  hub: LiveHub;
}

const BASE_HEADERS: Record<string, string> = {
  "cache-control": "no-store",
  "cross-origin-opener-policy": "same-origin",
  "cross-origin-resource-policy": "same-origin",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "x-robots-tag": "noindex, nofollow",
};

function csp(nonce: string): string {
  return `default-src 'none'; img-src 'self'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'`;
}

function notFound(c: Context): Response {
  return c.text("This link does not exist, has ended, or was turned off.", 404);
}

async function goneOrNotFound(
  c: Context,
  deps: ViewerAppDeps
): Promise<Response> {
  const ended = await deps.shares.endedByToken(c.req.param("token") ?? "");

  if (!ended) {
    return notFound(c);
  }

  const nonce = randomBytes(16).toString("base64");

  return c.html(goneHtml(ended, nonce), 410, {
    "content-security-policy": `default-src 'none'; style-src 'nonce-${nonce}'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'`,
  });
}

function createLimiter(max = RATE_MAX, now = Date.now) {
  const hits = new Map<string, number[]>();

  return (key: string): boolean => {
    const t = now();

    const recent = (hits.get(key) ?? []).filter(
      (at) => t - at < RATE_WINDOW_MS
    );

    if (recent.length >= max) {
      hits.set(key, recent);

      return false;
    }

    recent.push(t);
    hits.set(key, recent);

    if (hits.size > 5000) {
      hits.delete(hits.keys().next().value as string);
    }

    return true;
  };
}

function remoteOf(c: Context): string {
  try {
    return getConnInfo(c).remote.address ?? "unknown";
  } catch {
    return "unknown";
  }
}

function sameOrigin(c: Context): boolean {
  const origin = c.req.header("origin");

  if (!origin) {
    return true;
  }

  const host = c.req.header("host");

  return host !== undefined && origin === `http://${host}`;
}

interface ViewerComment {
  n: number;
  author: string;
  text: string;
  frame: number;
  x: number | null;
  y: number | null;
  createdAt: number;
}

function viewerComment(
  record: ShareRecord,
  comment: DesignComment
): ViewerComment {
  const index = record.frames.findIndex(
    (f) =>
      (f.path ?? "") === (comment.frame?.path ?? "") &&
      f.name === comment.frame?.label
  );

  const hint = comment.target.rectHint;
  const pinned = comment.target.selector !== "body" || hint.width > 0;

  return {
    author: comment.author ?? "Viewer",
    createdAt: comment.createdAt,
    frame: Math.max(0, index),
    n: comment.n,
    text: comment.text,
    x: pinned ? Math.round(hint.x) : null,
    y: pinned ? Math.round(hint.y) : null,
  };
}

async function linkComments(
  deps: ViewerAppDeps,
  record: ShareRecord
): Promise<ViewerComment[]> {
  const ids = new Set(record.commentIds);

  const all = await deps.comments
    .list(record.projectId, record.directionId)
    .catch(() => []);

  return all
    .filter((c) => ids.has(c.id) && c.from === "viewer")
    .map((c) => viewerComment(record, c));
}

async function postComment(
  deps: ViewerAppDeps,
  record: ShareRecord,
  input: typeof PostSchema.Type
): Promise<ViewerComment> {
  const frame = record.frames[input.frame] ?? record.frames[0];

  const spot =
    input.x !== null && input.y !== null
      ? { height: 1, width: 1, x: input.x, y: input.y }
      : { height: 0, width: 0, x: 0, y: 0 };

  const comment = await deps.comments.create(
    record.projectId,
    record.directionId,
    {
      author: input.name,
      from: "viewer",
      status: "draft",
      target: {
        rectHint: spot,
        selector: "body",
        tag: "body",
        textSnippet:
          input.x !== null && input.y !== null
            ? `${frame?.name ?? "Frame"} at ${input.x}, ${input.y}`.slice(
                0,
                200
              )
            : "",
      },
      text: input.text,
      ...(frame
        ? { frame: { label: frame.name, path: frame.path ?? "" } }
        : {}),
    }
  );

  await deps.shares.addComment(record.id, comment.id);

  return viewerComment(record, comment);
}

export function createViewerApp(deps: ViewerAppDeps): Hono {
  const app = new Hono();
  const allow = createLimiter();
  const joins = createLimiter(JOIN_MAX);

  app.use("*", async (c, next) => {
    await next();

    for (const [key, value] of Object.entries(BASE_HEADERS)) {
      c.res.headers.set(key, value);
    }

    if (!c.res.headers.has("content-security-policy")) {
      c.res.headers.set(
        "content-security-policy",
        "default-src 'none'; frame-ancestors 'none'"
      );
    }
  });

  const ICON_CACHE = "public, max-age=86400";
  app.get("/favicon.svg", (c) =>
    c.body(FAVICON_SVG, 200, {
      "cache-control": ICON_CACHE,
      "content-type": "image/svg+xml",
    })
  );
  app.get("/favicon-32.png", (c) =>
    c.body(new Uint8Array(FAVICON_PNG_32), 200, {
      "cache-control": ICON_CACHE,
      "content-type": "image/png",
    })
  );
  app.get("/favicon-16.png", (c) =>
    c.body(new Uint8Array(FAVICON_PNG_16), 200, {
      "cache-control": ICON_CACHE,
      "content-type": "image/png",
    })
  );

  app.get("/s/:token", async (c) => {
    const record = await deps.shares.byToken(c.req.param("token"));

    if (!record) {
      return goneOrNotFound(c, deps);
    }

    const nonce = randomBytes(16).toString("base64");

    const html = viewerHtml(
      {
        base: `/s/${c.req.param("token")}`,
        expiresAt: record.expiresAt,
        frames: record.frames,
        live: record.live === true,
        rev: record.rev ?? 0,
        title: record.title,
      },
      nonce
    );

    return c.html(html, 200, { "content-security-policy": csp(nonce) });
  });

  app.get("/s/:token/f/:index", async (c) => {
    const record = await deps.shares.byToken(c.req.param("token"));
    const index = Number(c.req.param("index"));

    if (
      !record ||
      !/^\d{1,3}$/.test(c.req.param("index")) ||
      index >= record.frames.length
    ) {
      return notFound(c);
    }

    const png = await readFile(
      frameFile(deps.shares.framesDir(record.id), index)
    ).catch(() => null);

    if (!png) {
      return notFound(c);
    }

    return c.body(new Uint8Array(png), 200, { "content-type": "image/png" });
  });

  app.get("/s/:token/comments", async (c) => {
    const record = await deps.shares.byToken(c.req.param("token"));

    if (!record) {
      return notFound(c);
    }

    return c.json({ comments: await linkComments(deps, record) });
  });

  app.post(
    "/s/:token/comments",
    bodyLimit({
      maxSize: BODY_MAX,
      onError: (c) => c.json({ error: "The comment is too long." }, 413),
    }),
    async (c) => {
      const record = await deps.shares.byToken(c.req.param("token"));

      if (!record) {
        return notFound(c);
      }

      if (!sameOrigin(c)) {
        return c.json({ error: "Send comments from the shared page." }, 403);
      }

      if (
        !(c.req.header("content-type") ?? "").startsWith("application/json")
      ) {
        return c.json({ error: "Send the comment as JSON." }, 415);
      }

      if (!allow(`${record.id}|${remoteOf(c)}`)) {
        return c.json(
          { error: "Too many comments. Wait one minute, then try again." },
          429
        );
      }

      if (record.commentIds.length >= LINK_COMMENTS_MAX) {
        return c.json(
          { error: "This link has the most comments it can take." },
          429
        );
      }

      const parsed = decodePost(await c.req.json().catch(() => null));

      if (Result.isFailure(parsed)) {
        return c.json({ error: "Type your name and a comment." }, 400);
      }

      return c.json(
        { comment: await postComment(deps, record, parsed.success) },
        201
      );
    }
  );

  app.get("/s/:token/live", async (c) => {
    const record = await deps.shares.byToken(c.req.param("token"));

    if (!record?.live) {
      return notFound(c);
    }

    if (!joins(`${record.id}|${remoteOf(c)}`)) {
      return c.text("Too many connections. Wait one minute.", 429);
    }

    if (deps.hub.count(record.id) >= SHARE_LIVE_VIEWERS_MAX) {
      return c.text("This link has the most viewers it can take.", 429);
    }

    return streamSSE(c, async (stream) => {
      let done = (): void => undefined;
      const ended = new Promise<void>((resolve) => (done = resolve));
      let last: Promise<void> = Promise.resolve();

      const send = (event: string, data: unknown): void => {
        last = stream
          .writeSSE({ data: JSON.stringify(data), event })
          .catch(() => done());
      };

      const seat = deps.hub.join(record, send, () => {
        done();

        return last;
      });

      if (!seat) {
        return;
      }

      stream.onAbort(() => done());
      await stream.writeSSE({ data: "", retry: 1000 }).catch(() => done());
      send("hello", {
        key: seat.key,
        rev: record.rev ?? 0,
        studio: record.studioCursor === true,
      });
      const ping = setInterval(() => send("ping", {}), PING_MS);

      try {
        await ended;
      } finally {
        clearInterval(ping);
        deps.hub.leave(record.id, seat.key);
      }
    });
  });

  app.post(
    "/s/:token/cursor",
    bodyLimit({ maxSize: CURSOR_BODY_MAX, onError: (c) => c.body(null, 413) }),
    async (c) => {
      const record = await deps.shares.byToken(c.req.param("token"));

      if (!record?.live) {
        return notFound(c);
      }

      if (
        !sameOrigin(c) ||
        !(c.req.header("content-type") ?? "").startsWith("application/json")
      ) {
        return c.body(null, 403);
      }

      const parsed = decodeCursor(await c.req.json().catch(() => null));

      if (Result.isFailure(parsed)) {
        return c.body(null, 400);
      }

      const result = deps.hub.cursor(record.id, {
        ...parsed.success,
        name: parsed.success.name.replaceAll(/[\p{Cc}]+/gu, "") || "Viewer",
      });

      return c.body(null, result === "gone" ? 410 : 204);
    }
  );

  app.all("*", notFound);
  app.onError((_error, c) => c.text("Something went wrong.", 500));

  return app;
}
