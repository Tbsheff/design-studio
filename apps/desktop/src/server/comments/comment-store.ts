import type { MentionFiles } from "@design-studio/actions/comment/schema";
import { Context, Effect, Layer } from "effect";

import { attemptComments } from "./comment-core.js";
import type { CommentError } from "./comment-core.js";
import type { CommentPage } from "./comment-page.js";
import { listComments, searchMentionFiles } from "./comment-reads.js";
import type { ListRequest, MentionRequest } from "./comment-reads.js";
import { inspectReferenceFrame } from "./reference-compare.js";
import type { ReferenceQuery, ReferenceView } from "./reference-compare.js";

interface CommentStoreApi {
  readonly inspectReference: (
    query: ReferenceQuery
  ) => Effect.Effect<ReferenceView, CommentError>;
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
      inspectReference: Effect.fn("CommentStore.inspectReference")(
        function* run(query: ReferenceQuery) {
          return yield* attemptComments((runtime) =>
            inspectReferenceFrame(runtime.reference, query)
          );
        }
      ),
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
