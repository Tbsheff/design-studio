import { Context, Effect, Layer, Schema } from "effect";

import type { CurrentOrg } from "../tenant/current-org.js";
import { TenantDb } from "../tenant/db.js";
import { tq } from "../tenant/sql.js";

const COMMENT_PAGE_MAX = 100;

const CommentRowSchema = Schema.Struct({
  author_id: Schema.NullOr(Schema.String),
  body: Schema.String,
  created_at: Schema.Number,
  id: Schema.String,
  org_id: Schema.String,
  project_id: Schema.String,
  resolved_at: Schema.NullOr(Schema.Number),
});

type CommentRow = typeof CommentRowSchema.Type;

interface CommentCreate {
  readonly authorId: string;
  readonly body: string;
  readonly projectId: string;
}

const commentPage = tq<{
  readonly after: string;
  readonly limit: number;
  readonly projectId: string;
}>`
  SELECT c.org_id, c.id, c.project_id, c.author_id, c.body, c.resolved_at, c.created_at
  FROM comment c
  WHERE c.org_id = :org AND c.project_id = :projectId AND c.id > :after AND c.deleted_at IS NULL
  ORDER BY c.id
  LIMIT :limit`;

const commentInsert = tq<{
  readonly authorId: string;
  readonly body: string;
  readonly id: string;
  readonly now: number;
  readonly projectId: string;
}>`
  INSERT INTO comment (org_id, id, project_id, author_id, body, created_at, updated_at)
  VALUES (:org, :id, :projectId, :authorId, :body, :now, :now)
  RETURNING org_id`;

interface CommentQueriesApi {
  readonly add: (
    input: CommentCreate
  ) => Effect.Effect<string, never, CurrentOrg>;
  readonly list: (
    projectId: string,
    after: string | null,
    limit: number
  ) => Effect.Effect<readonly CommentRow[], never, CurrentOrg>;
}

class CommentQueries extends Context.Service<
  CommentQueries,
  CommentQueriesApi
>()("design-studio/mcp/CommentQueries") {
  declare public readonly access: "write";

  public static readonly layer = Layer.effect(
    CommentQueries,
    Effect.gen(function* make() {
      const db = yield* TenantDb;

      const add = Effect.fn("CommentQueries.add")(function* run(
        input: CommentCreate
      ) {
        const id = crypto.randomUUID();

        yield* db.insert(commentInsert, { ...input, id, now: Date.now() });

        return id;
      });

      const list = Effect.fn("CommentQueries.list")(function* run(
        projectId: string,
        after: string | null,
        limit: number
      ) {
        const size = Math.min(Math.max(1, limit), COMMENT_PAGE_MAX);

        return yield* db.all(
          commentPage,
          { after: after ?? "", limit: size, projectId },
          CommentRowSchema
        );
      });

      return CommentQueries.of({ add, list });
    })
  );
}

export { CommentQueries };

export type { CommentCreate, CommentQueriesApi, CommentRow };
