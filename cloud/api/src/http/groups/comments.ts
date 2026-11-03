import { Effect, Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup } from "effect/http-api";
import type { HttpApiBuilder } from "effect/http-api";

import { Forbidden } from "../../../../../src/shared/actions/_core/errors/forbidden.js";
import { NotFound } from "../../../../../src/shared/actions/_core/errors/not-found.js";
import type { Permission } from "../../../../../src/shared/actions/_core/permissions.js";
import { ViewerScope } from "../../tenant/viewer-scope.js";
import { requireOrg, requirePerm } from "./authorizer.js";
import { MemberGate, ViewerGate } from "./gates.js";
import {
  insertComment,
  listComments,
  removeComment,
  resolveComment,
} from "./pending.js";
import { NotFoundWire, ROUTE_ERRORS } from "./wire-errors.js";

const COMMENT_NEEDS = {
  create: "comment.write",
  delete: "comment.delete",
  list: "comment.read",
  resolve: "comment.resolve",
  share: "comment.write",
} as const satisfies Record<string, Permission>;

const OrgParams = { orgId: Schema.String };

const ProjectParams = { ...OrgParams, projectId: Schema.String };

const CommentParams = { ...OrgParams, commentId: Schema.String };

const CommentWireSchema = Schema.Struct({
  id: Schema.String,
  isResolved: Schema.Boolean,
  projectId: Schema.String,
  text: Schema.String,
});

const TextPayload = Schema.Struct({ text: Schema.String });

const list = HttpApiEndpoint.get(
  "list",
  "/v1/o/:orgId/projects/:projectId/comments",
  {
    error: ROUTE_ERRORS,
    params: ProjectParams,
    success: Schema.Struct({ items: Schema.Array(CommentWireSchema) }),
  }
);

const create = HttpApiEndpoint.post(
  "create",
  "/v1/o/:orgId/projects/:projectId/comments",
  {
    error: ROUTE_ERRORS,
    params: ProjectParams,
    payload: TextPayload,
    success: CommentWireSchema,
  }
);

const resolve = HttpApiEndpoint.post(
  "resolve",
  "/v1/o/:orgId/comments/:commentId/resolve",
  {
    error: ROUTE_ERRORS,
    params: CommentParams,
    success: CommentWireSchema,
  }
);

const remove = HttpApiEndpoint.delete(
  "delete",
  "/v1/o/:orgId/comments/:commentId",
  {
    error: ROUTE_ERRORS,
    params: CommentParams,
    success: Schema.Struct({ ok: Schema.Boolean }),
  }
);

const share = HttpApiEndpoint.post(
  "share",
  "/v1/o/:orgId/share/:token/comments",
  {
    error: [...ROUTE_ERRORS, NotFoundWire],
    params: { ...OrgParams, token: Schema.String },
    payload: TextPayload,
    success: CommentWireSchema,
  }
).middleware(ViewerGate);

const CommentsGroup = HttpApiGroup.make("comments")
  .add(list, create, resolve, remove)
  .middleware(MemberGate)
  .add(share);

const requireShareScope = Effect.fn("Comments.requireShareScope")(function* run(
  orgId: string
) {
  const scope = yield* ViewerScope;

  if (scope.orgId !== orgId) {
    return yield* new NotFound({ message: "The link does not exist." });
  }

  if (scope.kind !== "share" || !scope.canComment) {
    return yield* new Forbidden({
      message: "The link does not allow comments.",
      perm: COMMENT_NEEDS.share,
    });
  }

  return scope;
});

const commentsHandlers = (
  handlers: HttpApiBuilder.Handlers.FromGroup<typeof CommentsGroup>
) =>
  handlers
    .handle("list", ({ params }) =>
      Effect.gen(function* run() {
        yield* requireOrg(params.orgId);
        yield* requirePerm(COMMENT_NEEDS.list);

        return { items: yield* listComments(params.projectId) };
      })
    )
    .handle("create", ({ params, payload }) =>
      Effect.gen(function* run() {
        yield* requireOrg(params.orgId);
        yield* requirePerm(COMMENT_NEEDS.create);

        return yield* insertComment({
          projectId: params.projectId,
          text: payload.text,
        });
      })
    )
    .handle("resolve", ({ params }) =>
      Effect.gen(function* run() {
        yield* requireOrg(params.orgId);
        yield* requirePerm(COMMENT_NEEDS.resolve);

        return yield* resolveComment(params.commentId);
      })
    )
    .handle("delete", ({ params }) =>
      Effect.gen(function* run() {
        yield* requireOrg(params.orgId);
        yield* requirePerm(COMMENT_NEEDS.delete);
        yield* removeComment(params.commentId);

        return { ok: true };
      })
    )
    .handle("share", ({ params, payload }) =>
      Effect.gen(function* run() {
        const scope = yield* requireShareScope(params.orgId);

        return yield* insertComment({
          projectId: scope.projectId,
          text: payload.text,
        });
      })
    );

export { COMMENT_NEEDS, CommentsGroup, commentsHandlers };
