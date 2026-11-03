import { Context, Effect, Layer } from "effect";

import type { CurrentOrg } from "../current-org.js";
import { TenantDb } from "../db.js";
import { tq } from "../sql.js";

const COMMENT_MAX = 4000;

const NAME_MAX = 100;

interface HeldComment {
  readonly anchor: string | null;
  readonly authorName: string | null;
  readonly body: string;
}

const heldInsert = tq<{
  readonly anchor: string | null;
  readonly authorName: string | null;
  readonly body: string;
  readonly id: string;
  readonly now: number;
  readonly shareId: string;
}>`
  INSERT INTO share_comment (org_id, id, share_id, author_name, anchor, body, is_held, created_at)
  VALUES (:org, :id, :shareId, :authorName, :anchor, :body, 1, :now)
  RETURNING org_id`;

interface ShareRepoApi {
  readonly addHeld: (
    shareId: string,
    comment: HeldComment
  ) => Effect.Effect<string, never, CurrentOrg>;
}

class ShareRepo extends Context.Service<ShareRepo, ShareRepoApi>()(
  "design-studio/tenant/ShareRepo"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.effect(
    ShareRepo,
    Effect.gen(function* make() {
      const db = yield* TenantDb;

      const addHeld = Effect.fn("ShareRepo.addHeld")(function* run(
        shareId: string,
        comment: HeldComment
      ) {
        const id = crypto.randomUUID();
        const now = Date.now();

        yield* db.insert(heldInsert, {
          anchor: comment.anchor,
          authorName: comment.authorName?.slice(0, NAME_MAX) ?? null,
          body: comment.body.slice(0, COMMENT_MAX),
          id,
          now,
          shareId,
        });

        return id;
      });

      return ShareRepo.of({ addHeld });
    })
  );
}

export { ShareRepo };

export type { HeldComment, ShareRepoApi };
