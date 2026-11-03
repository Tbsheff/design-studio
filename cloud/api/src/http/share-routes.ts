import { Effect, Option, Schema } from "effect";
import type { Layer, ManagedRuntime } from "effect";
import type { Hono } from "hono";

import type { AppEnv } from "../platform/bindings.js";
import { addComment } from "../share/add-comment.js";
import type { CommentInput } from "../share/add-comment.js";
import type { shareLayer } from "../share/layer.js";
import { getShareLive } from "../share/live-client.js";
import { readShare } from "../share/read-share.js";
import { GONE, NOT_FOUND, OK } from "../shared-actions.js";
import { ViewerScope } from "../tenant/viewer-scope.js";
import type { viewerLayer } from "../viewer/layer.js";
import { withShare } from "./middleware/viewer.js";

type ShareRuntime = ManagedRuntime.ManagedRuntime<
  Layer.Success<typeof shareLayer> | Layer.Success<typeof viewerLayer>,
  unknown
>;

type ShareApp = Hono<{ Bindings: AppEnv }>;

const CREATED = 201;

const INACTIVE = "This share link is not active.";

const BAD_BODY = 400;

const toText = (text: string, status: number): Response =>
  new Response(text, { headers: { "cache-control": "no-store" }, status });

const toJsonInit = (status: number): ResponseInit => ({
  headers: { "cache-control": "no-store" },
  status,
});

const toScopeKey = Effect.fn("Share.scopeKey")(function* run() {
  const scope = yield* ViewerScope;

  if (scope.kind !== "share") {
    return null;
  }

  return { orgId: scope.orgId, shareId: scope.shareId };
});

const CommentPayloadSchema = Schema.Struct({
  anchor: Schema.optional(Schema.NullOr(Schema.String)),
  authorName: Schema.optional(Schema.NullOr(Schema.String)),
  body: Schema.String.check(Schema.isMinLength(1)),
});

const readCommentInput = Effect.fn("Share.readComment")(function* run(
  request: Request
) {
  const payload = yield* Effect.option(
    Effect.tryPromise(async () => await request.json())
  );

  if (Option.isNone(payload)) {
    return Option.none<CommentInput>();
  }

  return yield* Schema.decodeUnknownEffect(CommentPayloadSchema)(
    payload.value
  ).pipe(
    Effect.map((found) =>
      Option.some<CommentInput>({
        anchor: found.anchor ?? null,
        authorName: found.authorName ?? null,
        body: found.body,
      })
    ),
    Effect.orElseSucceed(() => Option.none<CommentInput>())
  );
});

const mountShare = (app: ShareApp, runtime: ShareRuntime): void => {
  app.get("/s/:token", async (context) => {
    const token = context.req.param("token");

    return await runtime.runPromise(
      readShare().pipe(
        withShare(token),
        Effect.map((share) => Response.json(share, toJsonInit(OK))),
        Effect.catchTag("Gone", () => Effect.succeed(toText(INACTIVE, GONE))),
        Effect.catchTag("NotFound", () =>
          Effect.succeed(toText("Not found.", NOT_FOUND))
        )
      )
    );
  });

  app.get("/s/:token/live", async (context) => {
    const token = context.req.param("token");

    const key = await runtime.runPromise(
      toScopeKey().pipe(
        withShare(token),
        Effect.map((found) => found),
        Effect.catchTag("Gone", () => Effect.succeed(null)),
        Effect.catchTag("NotFound", () => Effect.succeed(null))
      )
    );

    if (key === null) {
      return toText(INACTIVE, GONE);
    }

    return await getShareLive(key.orgId, key.shareId).fetch(context.req.raw);
  });

  app.post("/s/:token/comments", async (context) => {
    const token = context.req.param("token");
    const parsed = await runtime.runPromise(readCommentInput(context.req.raw));

    if (Option.isNone(parsed)) {
      return toText("The comment is not valid.", BAD_BODY);
    }

    return await runtime.runPromise(
      addComment(parsed.value).pipe(
        withShare(token),
        Effect.map((saved) => Response.json(saved, toJsonInit(CREATED))),
        Effect.catchTag("Gone", () => Effect.succeed(toText(INACTIVE, GONE))),
        Effect.catchTag("NotFound", () =>
          Effect.succeed(toText("Not found.", NOT_FOUND))
        )
      )
    );
  });
};

export { mountShare };
