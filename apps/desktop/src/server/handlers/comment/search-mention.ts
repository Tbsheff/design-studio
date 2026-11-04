import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { searchMentionComment } from "../../../shared/actions/comment/search-mention.js";
import { CommentStore } from "../../comments/index.js";
import type { Handle } from "../_core/handler.js";

type SearchMentionCommentInput = Input<typeof searchMentionComment>;

const handle = Effect.fn("comment.searchMention")(function* run(
  input: SearchMentionCommentInput
) {
  const store = yield* CommentStore;

  return yield* store.searchMention({
    directionId: input.directionId,
    limit: input.limit,
    projectId: input.projectId,
    query: input.query,
  });
}) satisfies Handle<typeof searchMentionComment>;

export { handle };
