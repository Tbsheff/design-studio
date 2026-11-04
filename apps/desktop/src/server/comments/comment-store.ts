import { Context, Effect, Layer } from "effect";

import type { MentionFiles } from "@design-studio/actions/comment/schema";
import { attemptComments } from "./comment-core.js";
import type { CommentError } from "./comment-core.js";
import type { CommentPage } from "./comment-page.js";
import { listComments, searchMentionFiles } from "./comment-reads.js";
import type { ListRequest, MentionRequest } from "./comment-reads.js";

interface CommentStoreApi {
  readonly list: (
    request: ListRequest
  ) => Effect.Effect<CommentPage, CommentError>;
  readonly searchMention: (
    request: MentionRequest
  ) => Effect.Effect<MentionFiles, CommentError>;
}

class CommentStore extends Context.Service<CommentStore, CommentStoreApi>()(
  "design-studio/comments/CommentStore"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    CommentStore,
    CommentStore.of({
      list: Effect.fn("CommentStore.list")(function* run(request: ListRequest) {
        return yield* attemptComments((runtime) =>
          listComments(runtime, request)
        );
      }),
      searchMention: Effect.fn("CommentStore.searchMention")(function* run(
        request: MentionRequest
      ) {
        return yield* attemptComments((runtime) =>
          searchMentionFiles(runtime, request)
        );
      }),
    })
  );
}

export { CommentStore };

export type { CommentStoreApi };

export type { ListRequest, MentionRequest } from "./comment-reads.js";
