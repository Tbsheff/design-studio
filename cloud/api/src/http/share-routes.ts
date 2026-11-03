import { Effect, Option, Schema } from "effect";
import type { Layer, ManagedRuntime } from "effect";
import type { Hono } from "hono";

import type { AppEnv } from "../platform/bindings.js";
import { ShareLiveClient } from "../platform/share-live-client.js";
import { addComment } from "../share/add-comment.js";
import type { CommentInput } from "../share/add-comment.js";
import type { shareLayer } from "../share/layer.js";
import { readShare } from "../share/read-share.js";
import {
  BAD_REQUEST,
  CREATED,
  GONE,
  NOT_FOUND,
  OK,
} from "../shared-actions.js";
import { ViewerScope } from "../tenant/viewer-scope.js";
import type { viewerLayer } from "../viewer/layer.js";
import { withShare } from "./middleware/viewer.js";

type ShareRuntime = ManagedRuntime.ManagedRuntime<
  Layer.Success<typeof shareLayer> | Layer.Success<typeof viewerLayer>,
  unknown
>;

type ShareApp = Hono<{ Bindings: AppEnv }>;

const INACTIVE = "This share link is not active.";

const toText = (text: string, status: number): Response =>
  new Response(text, { headers: { "cache-control": "no-store" }, status });

const toJsonInit = (status: number): ResponseInit => ({
  headers: { "cache-control": "no-store" },
  status,
});

const toGone = (): Effect.Effect<Response> =>
  Effect.succeed(toText(INACTIVE, GONE));

const toMissing = (): Effect.Effect<Response> =>
  Effect.succeed(toText("Not found.", NOT_FOUND));

const CommentPayloadSchema = Schema.Struct({
  anchor: Schema.optional(Schema.NullOr(Schema.String)),
  authorName: Schema.optional(Schema.NullOr(Schema.String)),
  body: Schema.String.check(Schema.isMinLength(1)),
});

const decodeComment = Schema.decodeUnknownEffect(CommentPayloadSchema);

const openLive = Effect.fn("Share.openLive")(function* run(request: Request) {
  const scope = yield* ViewerScope;

  if (scope.kind !== "share") {
    return toText(INACTIVE, GONE);
  }

  const live = yield* ShareLiveClient;

  return yield* live.open(scope.orgId, scope.shareId, request);
});

const readCommentInput = Effect.fn("Share.readComment")(function* run(
  request: Request
) {
  const payload = yield* Effect.option(Effect.tryPromise(() => request.json()));

  if (Option.isNone(payload)) {
    return Option.none<CommentInput>();
  }

  return yield* decodeComment(payload.value).pipe(
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

const postComment = Effect.fn("Share.postComment")(function* run(
  token: string,
  request: Request
) {
  const parsed = yield* readCommentInput(request);

  if (Option.isNone(parsed)) {
    return toText("The comment is not valid.", BAD_REQUEST);
  }

  return yield* addComment(parsed.value).pipe(
    withShare(token),
    Effect.map((saved) => Response.json(saved, toJsonInit(CREATED))),
    Effect.catchTag("Gone", toGone),
    Effect.catchTag("NotFound", toMissing)
  );
});

const getShareRoute = Effect.fn("Share.getRoute")(function* run(token: string) {
  return yield* readShare().pipe(
    withShare(token),
    Effect.map((share) => Response.json(share, toJsonInit(OK))),
    Effect.catchTag("Gone", toGone),
    Effect.catchTag("NotFound", toMissing)
  );
});

const getLiveRoute = Effect.fn("Share.getLiveRoute")(function* run(
  token: string,
  request: Request
) {
  return yield* openLive(request).pipe(
    withShare(token),
    Effect.catchTag("Gone", toGone),
    Effect.catchTag("NotFound", toGone)
  );
});

const mountShare = (app: ShareApp, runtime: ShareRuntime): void => {
  app.get("/s/:token", (context) =>
    runtime.runPromise(getShareRoute(context.req.param("token")))
  );

  app.get("/s/:token/live", (context) =>
    runtime.runPromise(
      getLiveRoute(context.req.param("token"), context.req.raw)
    )
  );

  app.post("/s/:token/comments", (context) =>
    runtime.runPromise(postComment(context.req.param("token"), context.req.raw))
  );
};

export { mountShare };
